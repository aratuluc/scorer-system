from fastapi import Depends
import pandas as pd
import numpy as np
import io
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, contains_eager
from database import get_db
import models, schemas

def get_current_week(league_id:int, db: Session):
    max_week = db.query(func.max(models.Match.scored_week))\
    .filter(models.Match.league_id == league_id)\
    .scalar()

    if max_week is None:
        max_week = 0
    return max_week

from sqlalchemy.orm import contains_eager

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
        print("here 2")
        
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
    print(last)
    
    for player in leaderboard:
        if player.points < last:
            index += 1
            last = player.points # Remember to update 'last' so rank 3, 4, 5 work!
            
        ranked_leaderboard.append({"rank": index, **player.model_dump()})

    return ranked_leaderboard



        
