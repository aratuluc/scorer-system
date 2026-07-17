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
    if week in [0, -1, -2]: 
        print(f"Trying to get overall board type: {week}")
        return get_overall_season_leaderboard(league_id, db, w=week)
    else:
        leaderboard = db.query(Leaderboard).filter(models.Leaderboard.league_id == league_id, models.Leaderboard.week_num == week).first()
        if not leaderboard:
            print("Leaderboard not found for league: " + str(league_id))
            return [] # Return an empty array cleanly if no cache exists yet!
        print("Leaderboard found for league: " + str(league_id))
        return leaderboard.rows
    

from collections import defaultdict
from sqlalchemy.orm import Session
# Assuming models are imported, e.g., import models 
# and Player, Match, Prediction, Leaderboard are accessible

from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
from services.scoring import evaluate_score

def rebuild_leaderboard_cache(db: Session, league_id: int, week: int):
    # Clear existing cache for this specific week/overall entry
    db.query(models.Leaderboard).filter(
        models.Leaderboard.league_id == league_id, 
        models.Leaderboard.week_num == week
    ).delete()
    db.flush()
    
    players = db.query(models.Player).filter(models.Player.league_id == league_id).all()

    # =========================================================
    # WEEK 0: THE OVERALL AGGREGATOR (Compiles 0, -1, and -2)
    # =========================================================
    if week == 0:
        print(f"Compiling Master Season Leaderboard Caches (0, -1, -2) for league {league_id}")
        
        # Clear existing caches
        db.query(models.Leaderboard).filter(
            models.Leaderboard.league_id == league_id, 
            models.Leaderboard.week_num.in_([0, -1, -2])
        ).delete()
        db.flush()
        
        # Subquery to select only the latest leaderboard ID for each week (prevents double-counting duplicate entries)
        latest_leaderboard_subquery = (
            db.query(func.max(models.Leaderboard.id))
            .filter(
                models.Leaderboard.league_id == league_id,
                models.Leaderboard.week_num > 0
            )
            .group_by(models.Leaderboard.week_num)
        )

        # Pull weekly matches points sums from only the latest leaderboard versions
        weekly_sums = (
            db.query(
                models.LeaderboardRow.player_id,
                func.sum(models.LeaderboardRow.points).label("total_points")
            )
            .join(models.Leaderboard, models.LeaderboardRow.leaderboard_id == models.Leaderboard.id)
            .filter(
                models.Leaderboard.id.in_(latest_leaderboard_subquery)
            )
            .group_by(models.LeaderboardRow.player_id)
            .all()
        )
        weekly_map = {row.player_id: row.total_points for row in weekly_sums}
        
        # Pull custom predictions (season bets) points sums
        custom_sums = (
            db.query(
                models.CustomPrediction.player_id,
                func.sum(models.CustomPrediction.points).label("total_points")
            )
            .join(models.CustomBet, models.CustomPrediction.custom_bet_id == models.CustomBet.id)
            .filter(models.CustomBet.league_id == league_id)
            .group_by(models.CustomPrediction.player_id)
            .all()
        )
        custom_map = {row.player_id: row.total_points for row in custom_sums}
        
        # Generate the three standings lists
        for w in [0, -1, -2]:
            score_map = {}
            for p in players:
                w_pts = weekly_map.get(p.id, 0) or 0
                c_pts = custom_map.get(p.id, 0) or 0
                
                if w == 0:
                    score_map[p.id] = w_pts + c_pts
                elif w == -1:
                    score_map[p.id] = w_pts
                elif w == -2:
                    score_map[p.id] = c_pts
                    
            raw_scores = [
                {"player_id": p.id, "player_name": p.name, "points": score_map.get(p.id, 0)}
                for p in players
            ]
            
            raw_scores.sort(key=lambda x: x["points"], reverse=True)
            
            leaderboard = models.Leaderboard(league_id=league_id, week_num=w)
            db.add(leaderboard)
            db.flush()
            
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
        print(f"Successfully rebuilt all overall leaderboards (0, -1, -2) for league {league_id}.")
        return

    # =========================================================
    # WEEK > 0: THE DYNAMIC CALCULATOR
    # =========================================================
    else:
        print(f"Rebuilding league {league_id}, week {week}")
        matches = db.query(models.Match).filter(
            models.Match.league_id == league_id,
            models.Match.scored_week == week,
            models.Match.home_score.isnot(None),
            models.Match.away_score.isnot(None)
        ).all()
        
        match_ids = {match.id for match in matches}
        
        if not match_ids:
            print(f"No scored matches found for week {week}. Building 0-point cache for all players.")
            leaderboard = models.Leaderboard(league_id=league_id, week_num=week)
            db.add(leaderboard)
            for player in players:
                leaderboard.rows.append(models.LeaderboardRow(
                    player_id=player.id, player_name=player.name, points=0, rank=1
                ))
            db.commit() 
            return

        match_map = {match.id: match for match in matches}
        raw_scores = []
        all_predictions = db.query(models.Prediction).filter(models.Prediction.match_id.in_(match_ids)).all()
        
        pred_map = defaultdict(list)
        for p in all_predictions:
            pred_map[p.player_id].append(p)
        
        for player in players:
            player_predictions = pred_map[player.id]
            player_total = 0
            for prediction in player_predictions:
                current_match = match_map.get(prediction.match_id)
                # Calculate dynamically on the fly
                player_total += evaluate_score(
                    current_match.home_score, current_match.away_score, 
                    prediction.home_pred, prediction.away_pred
                ) * current_match.multiplier
            
            raw_scores.append({
                "player_id": player.id, "player_name": player.name, "points": player_total
            })

    # =========================================================
    # UNIFIED RANKING GENERATOR (Saves to DB)
    # =========================================================
    raw_scores.sort(key=lambda x: x["points"], reverse=True)
    
    leaderboard = models.Leaderboard(league_id=league_id, week_num=week)
    db.add(leaderboard)

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
    print(f"Successfully rebuilt leaderboard cache for week {week}.")


def get_overall_season_leaderboard(league_id: int, db: Session, w: int = 0):
    # Pull the structured cache entry cleanly
    leaderboard = db.query(Leaderboard).filter(
        models.Leaderboard.league_id == league_id, 
        models.Leaderboard.week_num == w
    ).first()
    
    if not leaderboard:
        print(f"Overall cache data matrix w={w} not generated yet for league {league_id}")
        return []
        
    # Standardize output serialization format to map your frontend parameters smoothly
    return [
        {
            "rank": row.rank,
            "player_name": row.player_name,
            "player_id": row.player_id,
            "league_id": league_id,
            "points": row.points
        }
        for row in leaderboard.rows
    ]

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
        
        # 1. Build all the individual weeks first
        for week_num in week_numbers:
            if week_num > 0: # Sanity check to avoid double-processing week 0
                rebuild_leaderboard_cache(db, league_id, week_num)
            
        # 2. Build the master overall season cache LAST
        print(f"Compiling final Week 0 master season totals for league {league_id}...")
        rebuild_leaderboard_cache(db, league_id, 0)
            
        print("Master rebuild completed successfully!")
    except Exception as e:
        print(f"Master rebuild failed: {e}")
    finally:
        db.close()     
        
    
    
        


    



    



        
