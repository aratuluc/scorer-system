from fastapi import Depends
import pandas as pd
import numpy as np
import io
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from .. import models, schemas

def get_current_week(league_id:int, db: Session):
    max_week = db.query(func.max(models.Match.scored_week))\
    .filter(models.Match.league_id == league_id)\
    .scalar()

    if max_week is None:
        max_week = 0
    return max_week

def get_leaderboard(league_id:int, db:Session, week:int|None = None):
    query = (db.query(models.Player)
        .options(
            joinedload(models.Player.predictions)
            .joinedload(models.Prediction.match)
        ))
        
    if not week:
        current = get_current_week(league_id, db)
        query.filter(models.Match.scored_week == current)
    elif week != 0:
        query.filter(models.Match.scored_week == week)
        

    leaderboard = [
    schemas.PlayerLeaderboard.model_validate(p) 
    for p in query.all()
    ]

    leaderboard.sort(key=lambda x: x.points, reverse=True)
    ranked_leaderboard = []
    index = 1
    last = leaderboard[0].points
    print(last)
    for player in leaderboard:
        if player.points < last:
            index += 1
        ranked_leaderboard.append({"rank": index, **player.model_dump()})


    return ranked_leaderboard

        
