from sqlalchemy import func
from services import lb_handler, prediction_services
from database import engine, get_db
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, responses
from sqlalchemy.orm import Session, joinedload
import pandas as pd
import io
import models, schemas, database

router = APIRouter()

@router.get("/{league_id}", response_model=list[schemas.DisplayPrediction])
def get_player_predictions(league_id: int, week_num: int|None, player_id: int, db: Session = Depends(get_db)):
    return prediction_services.get_player_predictions(league_id, week_num, player_id, db)