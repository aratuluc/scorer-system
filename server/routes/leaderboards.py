from sqlalchemy import func
from services import lb_handler
from database import engine, get_db
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, responses
from sqlalchemy.orm import Session, joinedload
import pandas as pd
import io
import models, schemas, database

router = APIRouter()

@router.get("/{league_id}")
def get_leaderboard(league_id:int, week:int|None = None, db:Session = Depends(get_db)):
    return lb_handler.get_leaderboard(league_id, db, week=week)

@router.get("/{league_id}/weeks", response_model=list[schemas.WeekScored])
def get_weeks(league_id:int, type:str, db:Session = Depends(get_db)):

    if type == "scored":
        query = db.query(models.Week).join(models.LeagueLink).options(joinedload(models.Week.matches)).filter(models.LeagueLink.league_id == league_id)
        return query.all()
    else:
        query = db.query(models.Week).join(models.LeagueLink).options(joinedload(models.Week.matches)).filter(models.LeagueLink.league_id == league_id)
        return query.all()

