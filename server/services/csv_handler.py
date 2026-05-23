import pandas as pd
import numpy as np
import io
from sqlalchemy.orm import Session, joinedload
from .. import models, schemas
from . import cron
from rapidfuzz import process, fuzz
from typing import Callable, Optional



def normalize_to_ascii(text):
    """
    Strips Turkish chars to ASCII (gökhan -> gokhan).
    """
    text = text.replace("İ", "i").replace("I", "ı").lower() # Lowercase first
    replacements = {
        "ö": "o", "ü": "u", "ş": "s", "ç": "c", "ğ": "g", "ı": "i"
    }
    for turk, eng in replacements.items():
        text = text.replace(turk, eng)
    return text.strip()


def process_weekly_csv(db: Session, league_id: int, df: pd.DataFrame, week_num: int):
    league_db = (db.query(models.League)
                    .options(joinedload(models.League.matches), joinedload(models.League.players))
                    .filter(models.League.id == league_id).first())
    league_data = schemas.League.model_validate(league_db)

    player_map = {normalize_to_ascii(a.name):a.name for a in league_data.players}
    team_map = {normalize_to_ascii(a):a for a in league_data.team_map}
    pid_map = {a.name:a.id for a in league_data.players}
    mid_map = {(a.home_team, a.away_team, a.fixture_week):a.id for a in league_data.matches}
    match_map = {a.id:a for a in league_db.matches}

    week_match_ids = [m.id for m in league_data.matches]

    existing_preds_db = (
        db.query(models.Prediction)
        .filter(models.Prediction.match_id.in_(week_match_ids))
        .all()
    )

    pred_lookup = {
        (p.player_id, p.match_id): p 
        for p in existing_preds_db
    }

    unassigned_names=[]
    count = 0

    match_list = {match_name:normalize_match_name(match_name, team_map) for match_name in df.columns[2:]}
    for index, row in df.iterrows():
        name = run_rapidfzf(normalize_to_ascii(row[df.columns[1]]), player_map, fuzz.token_set_ratio)
        if not name:
            unassigned_names.append({"name":row[df.columns[1]].strip(),"preds":{**row[2:]}, "week":week_num})
            continue

        player_id = pid_map.get(name)
        
        for match_name, match_tuple in match_list.items():
            lookup_key = (match_tuple[0], match_tuple[1], week_num)
            match_id = mid_map.get(lookup_key)
                        
            if not match_id: continue

            try:
                home, away = map(int, row[match_name].split("-"))
            except (ValueError, AttributeError):
                continue

            match = match_map.get(match_id)
            match.scored_week = week_num
            print(f"Set {match.home_team}'s match for week {week_num}")
            print(f"Set {match.scored_week}")

            key = (player_id, match_id)

            if key in pred_lookup:
                existing_pred = pred_lookup[key]
                existing_pred.home_pred = home
                existing_pred.away_pred = away
            else:
                new_pred = models.Prediction(
                    player_id=player_id,
                    match_id=match_id,
                    home_pred=home,
                    away_pred=away,
                    scored_week=week_num
                )
                db.add(new_pred)
                count += 1
                pred_lookup[key] = new_pred 

    db.commit()

    cron.force_wake_up()

    return {
        "total_processed": count,
        "unknown_players": unassigned_names
    }


    

def normalize_match_name(name:str, map:dict)->tuple[str,str]:
    parts = [normalize_to_ascii(a.strip()) for a in name.split("-")]
    parts = [run_rapidfzf(a, map, fuzz.partial_ratio) for a in parts]
    return (parts[0], parts[1])

def run_rapidfzf(
    string: str, 
    mapping: dict, 
    scorer: Callable = fuzz.token_set_ratio, 
    cutoff: int = 80
) -> str | None:
    
    result = process.extractOne(
        string, 
        mapping.keys(), 
        scorer=scorer, 
        score_cutoff=cutoff
    )
    print(result)
    return mapping.get(result[0]) if result else None

def handle_fix(fix_data:list[dict], league_id:int, db:Session):
    week_num = fix_data[0].week_num
    league_db = (db.query(models.League)
                    .options(joinedload(models.League.matches), joinedload(models.League.players))
                    .filter(models.League.id == league_id).first())
    league_data = schemas.League.model_validate(league_db)

    team_map = {normalize_to_ascii(a):a for a in league_data.team_map}
    mid_map = {(a.home_team, a.away_team, a.fixture_week):a.id for a in league_data.matches}
    pid_map = {a.name:a.id for a in league_data.players}

    week_match_ids = [m.id for m in league_data.matches if m.fixture_week == week_num]

    existing_preds_db = (
        db.query(models.Prediction)
        .filter(models.Prediction.match_id.in_(week_match_ids))
        .all()
    )

    pred_lookup = {
        (p.player_id, p.match_id): p 
        for p in existing_preds_db
    }

    new_count = 0
    update_count = 0

    for fix in fix_data:
        text = fix.textValue
        choice = fix.choiceValue
        data = fix.data
        

        name = choice if choice != "init" else text

        print("*"*20)
        print("name", name)

        pid = pid_map.get(name)

        if not pid:
            player = models.Player(name=name, league_id=league_id)
            db.add(player)
            db.commit()
            db.refresh(player)
            pid = player.id
            pid_map[name] = pid
            new_count += 1
        else:
            update_count += 1

        for key, value in data.items():
            match_tuple = tuple(map(lambda a: run_rapidfzf(normalize_to_ascii(a), team_map, fuzz.partial_ratio), key.split("-")))
            
            if not match_tuple[0] or not match_tuple[1]:
                print(f"Warning: Could not parse teams from '{key}'")
                continue

            home_team, away_team = match_tuple
            home_pred, away_pred = map(int, value.split("-"))

            mid = mid_map.get((home_team, away_team, week_num))
            if not mid:
                continue

            keyt = (pid, mid)

            if keyt in pred_lookup:
                existing_pred = pred_lookup[keyt]
                existing_pred.home_pred = home_pred
                existing_pred.away_pred = away_pred
            else:
                new_pred = models.Prediction(
                    player_id=pid,
                    match_id=mid,
                    home_pred=home_pred,
                    away_pred=away_pred
                )
                db.add(new_pred)
                pred_lookup[keyt] = new_pred 
    db.commit()
    return {"new": new_count, "update": update_count}





def main():
    ...


if __name__ == "__main__":
    main()