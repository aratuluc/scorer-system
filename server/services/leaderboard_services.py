from collections import defaultdict

from fastapi import Depends
import pandas as pd
import numpy as np
import io
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, contains_eager
from database import SessionLocal, get_db
import models, schemas
from models import *
from sqlalchemy.orm import contains_eager

from services.scoring import evaluate_score

def get_current_week(league_id:int, db: Session):
    max_week = db.query(func.max(models.Match.scored_week))\
    .filter(models.Match.league_id == league_id)\
    .scalar()

    if max_week is None:
        max_week = 0
    return max_week

def get_leaderboard(league_id: int, db: Session, week: int | None = None):
    # 1. THE FIX: Lock the query down to this specific league immediately!
    query = (
        db.query(models.Player)
        .join(models.Player.predictions)
        .join(models.Prediction.match)
        .filter(models.Player.league_id == league_id) 
    )
    
    print(week)
        
    if week == 0:
        pass
    elif not week:
        current = get_current_week(league_id, db)
        query = query.filter(models.Match.scored_week == current)
    elif week != 0:
        print(f"Fetching week {week}")
        query = query.filter(models.Match.scored_week == week)
        
    query = query.options(contains_eager(models.Player.predictions))

    leaderboard = [
        schemas.PlayerLeaderboard.model_validate(p) 
        for p in query.all()
    ]

    # 2. SAFETY CHECK: Prevent an IndexError if the league has no players yet
    if not leaderboard:
        return []

    leaderboard.sort(key=lambda x: x.points, reverse=True)
    
    ranked_leaderboard = []
    index = 1
    last = leaderboard[0].points
    
    for player in leaderboard:
        if player.points < last:
            index += 1
            last = player.points # Remember to update 'last' so rank 3, 4, 5 work!
            
        ranked_leaderboard.append({"rank": index, **player.model_dump()})

    return ranked_leaderboard

def get_leaderboard_v2(league_id: int, db: Session, week: int | None = None):
    if(week == 0): 
        return get_overall_season_leaderboard(league_id, db)
    else:
        leaderboard = db.query(Leaderboard).filter(models.Leaderboard.league_id == league_id, models.Leaderboard.week_num == week).first()
        if not leaderboard:
            return [] # Return an empty array cleanly if no cache exists yet!
        return leaderboard.rows
    

from collections import defaultdict
from sqlalchemy.orm import Session
# Assuming models are imported, e.g., import models 
# and Player, Match, Prediction, Leaderboard are accessible

def rebuild_leaderboard_cache(db: Session, league_id: int, week: int):
    # Clear existing cache for this week
    db.query(models.Leaderboard).filter(
        models.Leaderboard.league_id == league_id, 
        models.Leaderboard.week_num == week
    ).delete()
    db.flush()
    print(f"Rebuilding league {league_id}, week {week}")

    # Query all active players in the league
    players = db.query(models.Player).filter(models.Player.league_id == league_id).all()
    
    # Query matches that have scores
    matches = db.query(models.Match).filter(
        models.Match.league_id == league_id,
        models.Match.scored_week == week,
        models.Match.home_score.isnot(None),
        models.Match.away_score.isnot(None)
    ).all()
    
    match_ids = {match.id for match in matches}
    
    # --- MODIFIED BLOCK ---
    if not match_ids:
        print(f"No scored matches found for week {week}. Building 0-point cache for all players.")
        leaderboard = models.Leaderboard(league_id=league_id, week_num=week)
        db.add(leaderboard)
        
        # Populate the board with all players tied at 0 points, Rank 1
        for player in players:
            leaderboard.rows.append(models.LeaderboardRow(
                player_id=player.id,
                player_name=player.name, # Or player.player_name depending on your model
                points=0,
                rank=1
            ))
            
        db.commit() 
        return
    # ----------------------
    
    match_map = {match.id: match for match in matches}
    raw_scores = []

    # Get predictions only for the valid matches
    all_predictions = db.query(models.Prediction).filter(models.Prediction.match_id.in_(match_ids)).all()
    pred_map = defaultdict(list)
    print("Starting the point calculation...")
    for p in all_predictions:
        pred_map[p.player_id].append(p)
    
    # Calculate scores per player
    for player in players:
        player_id = player.id
        player_name = player.name

        player_predictions = pred_map[player.id]

        player_total = 0
        for prediction in player_predictions:
            current_match = match_map.get(prediction.match_id)
            player_total += evaluate_score(
                current_match.home_score, 
                current_match.away_score, 
                prediction.home_pred, 
                prediction.away_pred
            )
        
        raw_scores.append({
            "player_id": player_id,
            "player_name": player_name,
            "points": player_total
        })

    # Sort descending by points
    raw_scores.sort(key=lambda x: x["points"], reverse=True)

    leaderboard = models.Leaderboard(league_id=league_id, week_num=week)
    db.add(leaderboard)

    # Apply rankings, accounting for ties
    current_rank = 1
    for index, score_data in enumerate(raw_scores):
        if index > 0 and score_data["points"] < raw_scores[index - 1]["points"]:
            current_rank = index + 1
        
        leaderboard.rows.append(models.LeaderboardRow(
            player_id=score_data["player_id"],
            player_name=score_data["player_name"],
            points=score_data["points"],
            rank=current_rank
        ))

    db.commit()
    print("Successfully rebuilt the leaderboard.")

def get_overall_season_leaderboard(league_id: int, db: Session):
    results = (
        db.query(
            models.LeaderboardRow.player_id,
            models.LeaderboardRow.player_name,
            func.sum(models.LeaderboardRow.points).label("season_points")
        )
        .join(models.Leaderboard)
        .filter(models.Leaderboard.league_id == league_id)
        .group_by(models.LeaderboardRow.player_id, models.LeaderboardRow.player_name)
        .order_by(func.sum(models.LeaderboardRow.points).desc())
        .all()
    )

    ranked = []
    current_rank = 1
    
    for index, row in enumerate(results):
        if index > 0 and row.season_points < results[index - 1].season_points:
            current_rank = index + 1
            
        ranked.append({
            "rank": current_rank,
            "player_name": row.player_name,
            "player_id": row.player_id,
            "league_id": league_id,
            "points": row.season_points or 0
        })
        
    return ranked

def rebuild_leaderboard_cache_wrapper(league_id: int, week: int):
    db = SessionLocal() 
    try:
        print(f"Background task started for league {league_id}, week {week}")
        
        rebuild_leaderboard_cache(db, league_id, week)
        
        print("Background task finished successfully!")
    except Exception as e:
        print(f"Background task failed with error: {e}")
    finally:
        db.close()

def rebuild_entire_season_cache_wrapper(league_id: int):
    db = SessionLocal()
    try:
        completed_weeks = db.query(models.Match.scored_week)\
            .filter(models.Match.league_id == league_id, models.Match.scored_week.isnot(None))\
            .distinct()\
            .order_by(models.Match.scored_week.asc())\
            .all()
        
        week_numbers = [row[0] for row in completed_weeks]
        
        print(f"Master rebuild started for league {league_id}. Weeks to process: {week_numbers}")
        
        for week_num in week_numbers:
            rebuild_leaderboard_cache(db, league_id, week_num)
            
        print("Master rebuild completed successfully!")
    except Exception as e:
        print(f"Master rebuild failed: {e}")
    finally:
        db.close()
        
        
    
    
        


    



    



        
