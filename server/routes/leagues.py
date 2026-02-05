from ..database import engine, get_db
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
import pandas as pd
import io
from .. import models, schemas, database

# This is just like const router = express.Router();
router = APIRouter()

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
        raise HTTPException(400, "No league found!")
    return league

@router.put("/{league_id}", response_model=schemas.League)
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
    
@router.delete("/links/{link_id}")
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
    # 1. Validation
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    contents = await file.read()
    
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {str(e)}")
    
    
    
    return {
        "filename": file.filename,
        "rows": len(df),
        "columns": len(df.columns),
        "matches_processed": 0 #TODO
    }