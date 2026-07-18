from services import leaderboard_services, scraping, csv_handler, scoring, security, league_services
from database import engine, get_db
from fastapi import APIRouter, BackgroundTasks, UploadFile, File, HTTPException, Depends, responses
from sqlalchemy.orm import Session, joinedload
import pandas as pd
import io
import models, schemas, database, requests

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
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
):

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    contents = await file.read()
    
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {str(e)}")
    
    result = csv_handler.process_weekly_csv(db, league_id, df, week_num)

    background_tasks.add_task(leaderboard_services.rebuild_leaderboard_cache_wrapper, league_id, week_num)
    
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
        current_week = scraping.get_current_week(db, league_id)
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
    return {"text": f"Successfully created {result['new']}, updated {result['update']}"}

@router.put("/{league_id}/weeks/{week_num}/matches")
def fetch_scores_for_week(
    league_id: int, 
    week_num: int, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    # 1. Scrape the new scores[cite: 2]
    count, is_live = scraping.save_results_for_week(week_num, league_id, db)
    
    # 2. Automatically calculate prediction points and save them to the DB[cite: 2]
    scoring.finalize(league_id, db)
    
    # 3. Automatically rebuild this specific week's leaderboard in the background[cite: 2]
    background_tasks.add_task(leaderboard_services.rebuild_leaderboard_cache_wrapper, league_id, week_num)
    
    return {"count": count, "is_live": is_live, "message": "Scores fetched, finalized, and cache is rebuilding."}

@router.put("/{league_id}/matches/")
def fetch_scores(
    league_id: int, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    # 1. Scrape all active matches across the entire league[cite: 2]
    count, is_live = scraping.refresh_all_weeks(league_id, db)
    
    # 2. Automatically finalize any newly finished matches[cite: 2]
    scoring.finalize(league_id, db)
    
    # 3. Automatically trigger a master season rebuild[cite: 2]
    background_tasks.add_task(leaderboard_services.rebuild_entire_season_cache_wrapper, league_id)
    
    return {"count": count, "is_live": is_live, "message": "Global scores fetched, finalized, and master cache is rebuilding."}

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

@router.post("/{league_id}/recalculate-all")
async def recalculate_entire_season(league_id: int, background_tasks: BackgroundTasks):
    # Offload the entire seasonal loop safely to the background worker pool
    background_tasks.add_task(leaderboard_services.rebuild_entire_season_cache_wrapper, league_id)
    
    return {
        "status": "processing",
        "message": "Global season recalculation initiated. This will update all historical week snapshots."
    }

@router.put("/{league_id}/rebuild")
async def rebuild_leaderboard(league_id: int, week:int ,background_tasks: BackgroundTasks):

    background_tasks.add_task(leaderboard_services.rebuild_leaderboard_cache_wrapper, league_id, week)
    
    return {
        "status": "success",
        "message": f"Rebuilding leaderboard for league_id: {league_id} week: {week}"
    }

@router.put("/{league_id}/weeks-delta", status_code=200)
def delta_initialize_weeks_for_league(league_id: int, db: Session = Depends(get_db)):
    """
    Safely fetches and initializes missing week blocks for newly added links
    without dropping historical weeks or breaking constraint keys.
    """
    league_db = db.query(models.League).options(joinedload(models.League.links)).filter_by(id=league_id).first()
    if not league_db or not league_db.links:
        raise HTTPException(412, "This league has no links set up!")

    new_weeks_added = 0
    
    for link in league_db.links:
        # 1. Fetch the existing week numbers we already know about for this link
        existing_week_nums = {w.week_num for w in link.weeks}
        
        # 2. Grab the live week payload from the source endpoint
        response = requests.get(scraping.ENDPOINT, {"command": "getWeeks", "id": link.link})
        if response.status_code != 200:
            raise HTTPException(500, f"Failed while trying to fetch weeks for link {link.link}")
            
        parsed_weeks = scraping.parse_week_data(response.text)
        
        # 3. Delta guard: Only append weeks that do not exist yet
        for week_dict in parsed_weeks:
            if week_dict["week_num"] in existing_week_nums:
                continue
                
            db_week = models.Week(**week_dict, league_link_id=link.id)
            db.add(db_week)
            new_weeks_added += 1
            
    db.commit()
    return {"status": "success", "new_weeks_initialized": new_weeks_added}

@router.put("/{league_id}/matches-delta", status_code=200)
def delta_initialize_matches_for_league(league_id: int, db: Session = Depends(get_db)):
    """
    Synchronizes newly added tournament fixtures into the database 
    without clearing out historical results or destroying user predictions.
    """
    league_db = db.query(models.League).options(
        joinedload(models.League.matches), 
        joinedload(models.League.links)
    ).filter_by(id=league_id).first()
    
    if not league_db or not league_db.links:
        raise HTTPException(412, "This league has no links set up!")
        
    # Map out what we already have in the database to prevent duplicate keys
    existing_fixtures = {
        (m.home_team, m.away_team, m.fixture_week) for m in league_db.matches
    }
    
    # Hydrate the full week map including the newly generated delta weeks
    db_weeks = db.query(models.Week).join(models.LeagueLink).filter(
        models.LeagueLink.league_id == league_id
    ).all()
    week_map = {(w.league_link_id, w.week_num): w.id for w in db_weeks}
    
    raw_matches = scraping.extract_all_matches(league_db.links)
    
    new_matches_added = 0
    for match_dict in raw_matches:
        # Safely extract the link origin tracking ID
        link_id = match_dict.pop("league_link_id", None)
        week_num = match_dict["fixture_week"]
        key = (match_dict["home_team"].strip(), match_dict["away_team"].strip(), week_num)
        
        # Skip if already tracked
        if key in existing_fixtures:
            continue
            
        match_dict["week_id"] = week_map.get((link_id, week_num))
        match_dict["league_id"] = league_id
        
        # Set your new tournament multiplier property default during generation!
        match_dict["multiplier"] = 1 
        
        db.add(models.Match(**match_dict))
        new_matches_added += 1
        
    db.commit()
    return {"status": "success", "new_matches_initialized": new_matches_added}


@router.post("/{league_id}/custom-bets", response_model=schemas.CustomBet)
def create_custom_bet(league_id: int, bet: schemas.CustomBetCreate, db: Session = Depends(get_db)):
    db_league = db.get(models.League, league_id)
    if not db_league:
        raise HTTPException(404, "League not found")
    
    db_bet = models.CustomBet(
        league_id=league_id,
        title=bet.title,
        result=bet.result
    )
    db.add(db_bet)
    db.flush()
    
    # Pre-populate blank predictions for all players in this league
    for player in db_league.players:
        db_pred = models.CustomPrediction(
            custom_bet_id=db_bet.id,
            player_id=player.id,
            prediction=None,
            points=0
        )
        db.add(db_pred)
    
    db.commit()
    db.refresh(db_bet)
    return db_bet

@router.put("/{league_id}/custom-bets/{bet_id}", response_model=schemas.CustomBet)
def update_custom_bet(
    league_id: int,
    bet_id: int,
    payload: schemas.CustomBetUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    db_bet = db.query(models.CustomBet).filter_by(league_id=league_id, id=bet_id).first()
    if not db_bet:
        raise HTTPException(404, "Custom bet not found")
        
    db_bet.title = payload.title
    db_bet.result = payload.result
    
    # Update predictions for players
    pred_map = {p.player_id: p for p in db_bet.predictions}
    for item in payload.predictions:
        if item.player_id in pred_map:
            db_pred = pred_map[item.player_id]
            db_pred.prediction = item.prediction
            db_pred.points = item.points
        else:
            db_pred = models.CustomPrediction(
                custom_bet_id=bet_id,
                player_id=item.player_id,
                prediction=item.prediction,
                points=item.points
            )
            db.add(db_pred)
            
    db.commit()
    db.refresh(db_bet)
    
    # Rebuild leaderboard cache
    background_tasks.add_task(leaderboard_services.rebuild_entire_season_cache_wrapper, league_id)
    
    return db_bet

@router.delete("/{league_id}/custom-bets/{bet_id}")
def delete_custom_bet(league_id: int, bet_id: int, db: Session = Depends(get_db)):
    db_bet = db.query(models.CustomBet).filter_by(league_id=league_id, id=bet_id).first()
    if not db_bet:
        raise HTTPException(404, "Custom bet not found")
    db.delete(db_bet)
    db.commit()
    return {"ok": True}

@router.post("/{league_id}/custom-bets/upload-csv")
async def upload_custom_bets_csv(
    league_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    contents = await file.read()
    try:
        # Load CSV using pandas supporting UTF-8-SIG to parse BOM
        df = pd.read_csv(io.BytesIO(contents), encoding="utf-8-sig")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {str(e)}")

    print(f"[DEBUG CSV IMPORT] Read CSV Columns: {list(df.columns)}")

    name_col = None
    for col in df.columns:
        col_str = str(col).strip().lower()
        if "isim" in col_str or "name" in col_str or "username" in col_str or "player" in col_str:
            name_col = col
            break

    if not name_col:
        for col in df.columns:
            col_str = str(col).strip().lower()
            if "sim" in col_str or "nam" in col_str:
                name_col = col
                break

    if not name_col and len(df.columns) > 1:
        name_col = df.columns[1]
        print(f"[DEBUG CSV IMPORT] Name column keyword search failed. Defaulting to 2nd column: '{name_col}'")

    if not name_col:
        raise HTTPException(
            status_code=400, 
            detail=f"Could not find player name column. Columns found: {list(df.columns)}"
        )

    db_league = db.get(models.League, league_id)
    if not db_league:
        raise HTTPException(404, "League not found")

    players_map = {p.name.strip().lower(): p.id for p in db_league.players}

    bet_cols = []
    for idx, col in enumerate(df.columns):
        col_lower = str(col).lower()
        if col == name_col:
            continue
        if idx == 0 and ("zaman" in col_lower or "time" in col_lower or "tarih" in col_lower or "date" in col_lower):
            continue
        bet_cols.append(col)

    # Create/fetch custom bets
    bets_map = {}
    for col in bet_cols:
        title = col.strip()
        db_bet = db.query(models.CustomBet).filter_by(league_id=league_id, title=title).first()
        if not db_bet:
            db_bet = models.CustomBet(league_id=league_id, title=title, result=None)
            db.add(db_bet)
            db.flush()
        bets_map[title] = db_bet

    matched_players_count = 0
    unmatched_names = []
    predictions_created_count = 0
    predictions_updated_count = 0

    for _, row in df.iterrows():
        raw_name = str(row[name_col]).strip()
        name_key = raw_name.lower()

        player_id = players_map.get(name_key)
        if not player_id:
            unmatched_names.append(raw_name)
            continue

        matched_players_count += 1

        for col in bet_cols:
            title = col.strip()
            db_bet = bets_map[title]
            pred_value = str(row[col]).strip() if pd.notna(row[col]) else None

            db_pred = db.query(models.CustomPrediction).filter_by(
                custom_bet_id=db_bet.id,
                player_id=player_id
            ).first()

            if db_pred:
                db_pred.prediction = pred_value
                predictions_updated_count += 1
            else:
                db_pred = models.CustomPrediction(
                    custom_bet_id=db_bet.id,
                    player_id=player_id,
                    prediction=pred_value,
                    points=0
                )
                db.add(db_pred)
                predictions_created_count += 1

    db.commit()

    # Rebuild overall leaderboard cache
    background_tasks.add_task(leaderboard_services.rebuild_entire_season_cache_wrapper, league_id)

    return {
        "status": "success",
        "bets_count": len(bet_cols),
        "matched_players": matched_players_count,
        "unmatched_players": unmatched_names,
        "predictions_created": predictions_created_count,
        "predictions_updated": predictions_updated_count
    }