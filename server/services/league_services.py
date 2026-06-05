from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload
import re
from .. import models, schemas

def handle_unset_fix(league_id: int, db: Session, payload: dict):
    new_real_predictions = []
    for staging_id, unset_id in payload.items():
        staging_match = db.query(models.StagingMatch).filter(models.StagingMatch.id == staging_id).first()
        unset_match = db.query(models.Match).filter(models.Match.id == unset_id).first()


        if not staging_match or not unset_match:
            continue
            
        if staging_match.league_id != league_id:
            continue

        unset_match.scored_week = staging_match.scored_week

        for staging_pred in staging_match.staging_predictions:
            new_pred = models.Prediction(
                    player_id=staging_pred.player_id,
                    match_id=unset_match.id,
                    home_pred=staging_pred.home_pred,
                    away_pred=staging_pred.away_pred,
                )
            new_real_predictions.append(new_pred)
        db.delete(staging_match)
    db.add_all(new_real_predictions)
    db.commit()
    return {"fixed": len(new_real_predictions)}

        