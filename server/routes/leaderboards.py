from sqlalchemy import func
from services import leaderboard_services
from database import engine, get_db
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, responses, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
import pandas as pd
import io
import models, schemas, database

router = APIRouter()

@router.get("/{league_id}", response_model=list[schemas.LeaderboardRow])
def get_leaderboard(league_id:int, week:int|None = None, db:Session = Depends(get_db)):
    return leaderboard_services.get_leaderboard_v2(league_id, db, week=week)

@router.get("/{league_id}/weeks", response_model=list[schemas.WeekScored])
def get_weeks(league_id:int, type:str, db:Session = Depends(get_db)):

    if type == "scored":
        query = db.query(models.Week).join(models.LeagueLink).options(joinedload(models.Week.matches)).filter(models.LeagueLink.league_id == league_id).order_by(models.Week.week_num.asc())
        return query.all()
    else:
        query = db.query(models.Week).join(models.LeagueLink).options(joinedload(models.Week.matches)).filter(models.LeagueLink.league_id == league_id)
        return query.all()
    
@router.get("/{league_id}/max-week")
def get_max_scored_week(league_id: int, db: Session = Depends(get_db)):
    max_week = (
        db.query(func.max(models.Match.scored_week))
        .filter(
            models.Match.league_id == league_id,
        )
        .scalar()
    )
    return {"max_week": max_week or 0}
    
@router.get("/{league_id}/title")
def get_league_title(league_id:int, db:Session = Depends(get_db)):
    name, year = db.query(models.League.name, models.League.start_year).filter(models.League.id == league_id).first()
    return {"title":f"{name.strip()} {year}"}


