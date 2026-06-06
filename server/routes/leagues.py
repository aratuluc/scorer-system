from shlex import join
from turtle import mode
from typing import List

from sqlalchemy import null


from services import scraping, csv_handler, scoring, security, league_services
from database import engine, get_db
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, responses
from sqlalchemy.orm import Session, joinedload
import pandas as pd
import io
import models, schemas, database

router = APIRouter(dependencies=[Depends(security.verify_admin)])
#router = APIRouter()

@router.post("/", response_model=schemas.League)
def create_league(league: schemas.LeagueCreate, db: Session = Depends(get_db)):
    db_league = models.League(**league.model_dump())
    
    db.add(db_league)
    db.commit()
    db.refresh(db_league)
    return db_league

@router.get("/", response_model=list[schemas.League])
def get_leagues(db: Session = Depends(get_db)):
    return db.query(models.League).all()

@router.get("/{league_id}", response_model=schemas.League)
def get_leagues(league_id: int, db: Session = Depends(get_db)):
    league =  db.query(models.League).filter_by(id=league_id).first()
    if not league:
        raise HTTPException(404, "No league found!")
    return league

@router.patch("/{league_id}", response_model=schemas.League)
def update_league(league_id: int, league: schemas.LeagueUpdate, db: Session = Depends(get_db)):
    db_league= db.query(models.League).filter_by(id=league_id).first()
    update_data = league.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_league, key, value)

    db.commit()
    return db_league

@router.get("/{league_id}/links", response_model=list[schemas.LinkResponse])
def get_links_for_league(league_id:int, db: Session = Depends(get_db)):
    return db.query(models.LeagueLink).filter_by(league_id=league_id).all()

@router.post("/{league_id}/links", response_model=schemas.LinkResponse)
def add_link_to_league(league_id: int, link: schemas.LinkCreate, db: Session = Depends(get_db)):
    db_league= db.query(models.League).filter_by(id=league_id).first()
    if not db_league:
        raise HTTPException(status_code=404, detail="League not found")
    
    link_data = link.model_dump()
    link_data['link'] = str(link_data['link'])
    
    db_link = models.LeagueLink(**link_data, league_id=league_id)
    db.add(db_link)
    db.commit()
    db.refresh(db_link)

    return db_link
    
@router.delete("/{league_id}/links/{link_id}")
def delete_link(link_id: int, db:Session = Depends(get_db)):
    link_to_delete = db.query(models.LeagueLink).filter_by(id=link_id).first()
    if not link_to_delete:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(link_to_delete)
    db.commit()
    return {"ok": True}

@router.post("/{league_id}/upload/{week_num}")
async def upload_weekly_csv(
    league_id: int, 
    week_num: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    contents = await file.read()
    
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {str(e)}")
    
    result = csv_handler.process_weekly_csv(db, league_id, df, week_num)
    
    return {
        "filename": file.filename,
        "rows": len(df),
        "columns": len(df.columns),
        **result
    }

@router.get("/{league_id}/players", response_model=list[schemas.Player])
def get_players_for_league(league_id:int, db: Session = Depends(get_db)):
    lg = db.get(models.League, league_id)
    if not lg:
        raise HTTPException(404, "League not found!")
    return lg.players

@router.post("/{league_id}/players", response_model=schemas.Player)
def add_player_to_league(league_id:int, player:schemas.PlayerCreate, db: Session = Depends(get_db)):
    lg = db.get(models.League, league_id)
    if not lg:
        raise HTTPException(404, "League not found!")
    plr = models.Player(**player.model_dump(), league_id=league_id)
    db.add(plr)
    db.commit()
    db.refresh(plr)
    return plr

@router.patch("/{league_id}/players/{player_id}", response_model=schemas.Player)
def update_player(league_id:int, player_id:int, player:schemas.Player ,db: Session = Depends(get_db)):
    plr= db.query(models.Player).filter_by(league_id=league_id, id = player_id).first()
    update_data = player.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(plr, key, value)

    db.commit()
    return plr

@router.delete("/{league_id}/players/{player_id}")
def delete_player(league_id:int, player_id:int,db: Session = Depends(get_db)):
    player_to_delete = db.query(models.Player).filter(models.Player.id==player_id, models.Player.league_id==league_id).one()
    if not player_to_delete:
        raise HTTPException(404, "Player not found!")
    db.delete(player_to_delete)
    db.commit()
    return {"ok":True}

@router.get("/{league_id}/matches", response_model=list[schemas.Match])
def get_matches_for_league(league_id:int, week: int | None = None, unset: bool = None ,db:Session = Depends(get_db)):

    query = db.query(models.Match).filter(models.Match.league_id == league_id)

    if unset == True:
        query = query.filter(models.Match.scored_week == None)
    
    if week:
        query = query.filter(models.Match.fixture_week == week)
    elif week == 0:
        return query.all()
    else:
        current_week = scraping.calculate_current_week(db, league_id)
        query = query.filter(models.Match.fixture_week == current_week)
        pass 

    return query.all()

@router.get("/{league_id}/predictions", response_model=list[schemas.Prediction])
def get_predictions(league_id:int, week: int | None = None, player: str | None = None, db:Session = Depends(get_db)):

    query = db.query(models.Prediction).join(models.Match).join(models.Player).filter(models.Match.league_id == league_id)
    
    if week:
        query = query.filter(models.Match.fixture_week == week)

    if player:
        query = query.filter(models.Player.name == player)

    return query.all()

@router.put("/{league_id}/predictions")
def add_unknown_fix(league_id: int, fix_data:list[schemas.UnknownFix], db:Session = Depends(get_db)):
    result = csv_handler.handle_fix(fix_data, league_id, db)
    return {"text": f"Successfully created {result["new"]}, updated {result["update"]}"}

@router.put("/{league_id}/weeks/{week_num}/matches")
def fetch_scores_for_week(league_id:int, week_num: int, db:Session = Depends(get_db)):
    count, is_live = scraping.save_results_for_week(week_num, league_id, db)
    return {"count": count, "is_live": is_live}

@router.put("/{league_id}/matches/")
def fetch_scores(league_id:int, db:Session = Depends(get_db)):
    count, is_live = scraping.refresh_all_weeks(league_id, db)
    return {"count": count, "is_live": is_live}

@router.post("/{league_id}/predictions")
def finalize_predictions(league_id:int, db:Session = Depends(get_db)):
    count = scoring.finalize(league_id, db)
    return count

@router.put("/{league_id}/weeks", status_code=200)
def initialize_weeks_for_league(league_id:int, db:Session = Depends(get_db)):
    league_db = db.query(models.League).options(joinedload(models.League.matches)).filter_by(id=league_id).first()
    if not league_db.links:
        raise HTTPException(412, "This league has no links set-up!")
    count = scraping.initialize_weeks(db, league_db)
    return {"initialized":count}

@router.get("/{league_id}/weeks", response_model=list[schemas.Week])
def get_weeks(league_id:int, type:str, db:Session = Depends(get_db)):

    if type == "scored":
        query = db.query(models.Week).join(models.LeagueLink).options(joinedload(models.Week.matches)).filter(models.LeagueLink.league_id == league_id)
        return query.all()
    else:
        return {"status":400}

@router.put("/{league_id}/matches", status_code=200)
def initialize_matches_for_league(league_id:int, db:Session = Depends(get_db)):
    league_db = db.query(models.League).options(joinedload(models.League.matches)).filter_by(id=league_id).first()
    if not league_db.links:
        raise HTTPException(412, "This league has no links set-up!")
    count = scraping.initialize_matches(db, league_db)
    return {"initialized":count}

@router.post("/{league_id}/predictions:autofill", status_code=200)
def autofill_predictions(league_id:int, db:Session = Depends(get_db)):
    i = 0

    league_db = db.query(models.League)\
    .options(joinedload(models.League.players))\
    .filter(models.League.id == league_id).first()

    matches = db.query(models.Match).options(joinedload(models.Match.predictions))\
        .filter(models.Match.league_id == league_id, models.Match.scored_week != None)
    
    all_player_ids = {player.id for player in league_db.players}

    for match in matches:
        predicted_player_ids = {pred.player_id for pred in match.predictions}
        
        for p_id in all_player_ids:
            if p_id not in predicted_player_ids:
                new_pred = models.Prediction(
                    player_id=p_id, 
                    match_id=match.id, 
                    home_pred=None, 
                    away_pred=None 
                )
                db.add(new_pred)
                i += 1
    db.commit()
    return {"filled": i}

@router.patch("/{league_id}/fix")
def apply_league_fixes(
    league_id: int,
    payload: dict, 
    type: str,                      
    db: Session = Depends(get_db)
):
    if type == "unsetMatches":
        
        return league_services.handle_unset_fix(league_id, db, payload)
    
    return {"message": "Invalid fix type"}

@router.put("/{league_id}/scraping")
def enable_scraping_for_league(league_id: int, status: bool, db: Session = Depends(get_db)):
    league = db.get(models.League, league_id)
    league.is_active_for_scraping = status
    db.commit()
    return {"message": "Successfully updated the scraping status."}

@router.get("/{league_id}/staging-matches")
def get_staging_matches(league_id:int, db:Session = Depends(get_db)):
    return db.query(models.StagingMatch).filter(models.StagingMatch.league_id == league_id).all()