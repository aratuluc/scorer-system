from functools import lru_cache
from operator import and_
from shlex import join
import requests
import json
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload
import re
import models, schemas


def main():
    pass

@lru_cache(maxsize=None)
def evaluate_score(true_home: int, true_away: int, prediction_home: int, prediction_away: int):
    # Fallback missing predictions to a baseline default of 3-3
    if prediction_home is None: 
        prediction_home = 3
    if prediction_away is None: 
        prediction_away = 3
      
    # Determine actual match outcome
    if true_home > true_away:
        result = "home"
    elif true_away > true_home:
        result = "away"
    else:
        result = "draw"

    # Determine predicted match outcome
    if prediction_home > prediction_away:
        prediction_result = "home"
    elif prediction_away > prediction_home:
        prediction_result = "away"
    else:
        prediction_result = "draw"

    # =================================================================
    # SCENARIO 1: PERFECT MATCH (EXACT SCORELINE CAPTURED)
    # =================================================================
    if true_home == prediction_home and true_away == prediction_away:
        # High-scoring bonanza rule (Over 4.5 total goals) -> Return 12 points instantly
        if true_home + true_away >= 5:
            return 12
        
        # Standard perfect prediction -> Return 7 points instantly
        return 7
    
    # =================================================================
    # SCENARIO 2: PARTIAL MATCH (SCORE WRONG, BUT OUTCOME TRACED)
    # =================================================================
    total = 0
    
    # Correctly guessed the match result (1, X, 2) -> Add 2 points
    if result == prediction_result:
        total += 2
        # Correctly guessed the exact goal discrepancy (e.g., predicted 2-0, ended 3-1) -> Add 1 point
        if abs(true_home - true_away) == abs(prediction_home - prediction_away):
            total += 1
        
    # Individual team goal counter checks
    if true_home == prediction_home:
        total += 1
    if true_away == prediction_away:
        total += 1
      
    return total

def finalize(league_id: int, db: Session):
    unfinalized_predictions = (
        db.query(models.Prediction)
        .join(models.Match) 
        .options(joinedload(models.Prediction.match))
        .filter(
            models.Match.league_id == league_id,
            models.Match.status == models.Status.FT,
            models.Prediction.points.is_(None)
        )
        .all()
    )
    
    for prediction in unfinalized_predictions:
        prediction.points = evaluate_score(
            prediction.match.home_score,
            prediction.match.away_score,
            prediction.home_pred,
            prediction.away_pred,
        )
    
    db.commit()
    return len(unfinalized_predictions)

if __name__ == "__main__":
    main()