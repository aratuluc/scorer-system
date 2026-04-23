from sqlalchemy import func
from ..services import lb_handler
from ..database import engine, get_db
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, responses
from sqlalchemy.orm import Session, joinedload
import pandas as pd
import io
from .. import models, schemas, database

router = APIRouter()

@router.get("/{league_id}")
def get_leaderboard(league_id:int, week:int|None = None, db:Session = Depends(get_db)):
    return lb_handler.get_leaderboard(league_id, db, week=week)