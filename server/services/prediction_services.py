from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload
import re
from .. import models, schemas

from sqlalchemy.orm import joinedload, contains_eager

def get_player_predictions(league_id: int, week_num: int | None, player_id: int, db: Session):
    
    query = (
        db.query(models.Prediction)
        .join(models.Match)
        .options(contains_eager(models.Prediction.match)) 
        .filter(
            models.Match.league_id == league_id, 
            models.Prediction.player_id == player_id
        )
    )

    if not week_num:
        return query.all()
    else:
        return query.filter(models.Match.fixture_week == week_num).all()