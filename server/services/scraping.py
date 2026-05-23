import requests
import json
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload
import re
from .. import models, schemas

ENDPOINT = "https://arsiv.mackolik.com/AjaxHandlers/FixtureHandler.aspx"

def calculate_current_week(db: Session, link_id:int):
    max_week = db.query(func.max(models.Week.week_num))\
    .filter(models.Week.league_link_id == link_id)\
    .scalar()

    if max_week is None:
        max_week = 0
    return max_week

def get_all_fixture_week_map(endpoint: models.LeagueLink):
    matches = []
    i = 1
    print(f"Starting the initialization process for {endpoint.alias or endpoint.link}")
    while True:
        response = requests.get(ENDPOINT, {"command":"getMatches", "id":endpoint.link, "week":i})

        if(response.status_code != 200):
            raise Exception(f"Failed to retrieve data for week {i}")
        
        # Fixed the signature mismatch here
        games = parse_matches_for_week(response.text, i)

        if not games:
            print(f"Stopped at week {i-1}")
            break

        # Tag every game with its source link ID before adding to the pile
        for game in games:
            game["league_link_id"] = endpoint.id

        matches += games
        i+=1
    return matches

def parse_matches_for_week(text:str, weeknum:int) -> list[dict]:
    text = re.sub(r",{2,}", ",", text)
    text = text.replace(",,", ",")
    text = text.replace("'", '"')
    week = []
    lst = json.loads(text)
    for mac in lst:
        week.append({
            "fixture_week": weeknum, 
            "home_team": normalize_team_name(mac[4]), 
            "away_team": normalize_team_name(mac[6])
        })
    return week
        
def normalize_team_name(raw_name):
    return raw_name

def extract_all_matches(endpoints:list[str]):
    matches = []
    for endpoint in endpoints:
        matches += get_all_fixture_week_map(endpoint)
    return matches

def initialize_matches(db: Session, league: models.League):
    league.matches.clear()
    db.flush() 

    db_weeks = db.query(models.Week).join(models.LeagueLink).filter(models.LeagueLink.league_id == league.id).all()
    
    week_map = {(w.league_link_id, w.week_num): w.id for w in db_weeks}

    raw_matches = extract_all_matches(league.links)
    
    model_matches = []
    for match_dict in raw_matches:
        link_id = match_dict.pop("league_link_id")
        week_num = match_dict["fixture_week"]
        
        match_dict["week_id"] = week_map.get((link_id, week_num))
        match_dict["league_id"] = league.id
        
        model_matches.append(models.Match(**match_dict))
        
    db.add_all(model_matches)
    db.commit()
    
    return len(model_matches)

def initialize_weeks(db:Session, league:models.League):


    links = league.links
    for link in links:
        link.weeks.clear()
        db.flush() 
        response = requests.get(ENDPOINT, {"command":"getWeeks", "id":link.link})
        if(response.status_code != 200):
            raise Exception(f"Failed while trying to initialize weeks for league {link.link}")
        weeks = parse_week_text(response.text)
        model_weeks = [models.Week(**week, league_link_id=link.id) for week in weeks]
        db.add_all(model_weeks)
        db.commit()
    return len(model_weeks)

def refresh_all_weeks(league_id:int, db:Session):
    count = 0
    is_live = False

    league_db = (db.query(models.League)
                    .options(joinedload(models.League.matches), joinedload(models.League.links))
                    .filter(models.League.id == league_id).first())

    match_map = {(a.home_team, a.away_team, a.week.week_num):a for a in league_db.matches}

    for endpoint in league_db.links:
        for week_num in range(calculate_current_week(db, endpoint.id)+1):

            response = requests.get(ENDPOINT, {"command":"getMatches", "id":endpoint.link, "week":week_num})
            lst = clean_response(response.text)
            for mac in lst:

                status = get_match_status(mac[2])
                if status == models.Status.LIVE:
                    is_live = True

                if status == models.Status.NS:
                    continue

                key = (mac[4].strip(), mac[6].strip(), week_num)

                match = match_map.get(key)

                if not match:
                    print(f"No match found for {key}")
                    continue

                match.home_score = mac[8]
                match.away_score = mac[9]
                match.status = status
                count += 1
            
    db.commit()
    return count, is_live
        

    
    
def save_results_for_week(week_num, league_id, db:Session):
    count = 0
    is_live = False

    league_db = (db.query(models.League)
                    .options(joinedload(models.League.matches), joinedload(models.League.links))
                    .filter(models.League.id == league_id).first())

    match_map = {(a.home_team, a.away_team, a.fixture_week):a for a in league_db.matches}
    

    for endpoint in league_db.links:

        response = requests.get(f"{endpoint.link}&week={week_num}")
        lst = clean_response(response.text)

        for mac in lst:

            status = get_match_status(mac[2])
            if status == models.Status.LIVE:
                is_live = True

            if status == models.Status.NS:
                continue

            key = (mac[4].strip(), mac[6].strip(), week_num)

            match = match_map.get(key)

            if not match:
                print(f"No match found for {key}")
                continue

            match.home_score = mac[8]
            match.away_score = mac[9]
            match.status = status
            count += 1
            
    db.commit()
    return count, is_live

def get_match_status(value):
    try:
        int(value) 
        return models.Status.LIVE
    except ValueError:
        pass
    
    value = str(value).upper()

    if value == "MS":
        return models.Status.FT
    elif value == "IY":
        return models.Status.LIVE
    elif "+" in value:
        return models.Status.LIVE
        
    return models.Status.NS

def update_match_from_scrape(db:Session, week_num:int, league_id:int, match_data:dict):
        match = (
            db.query(models.Match)
            .filter(
                models.Match.league_id == league_id,
                models.Match.fixture_week == match_data["fixture_week"],
                models.Match.home_team == match_data["home_team"],
                models.Match.away_team == match_data["away_team"]
                )
            .first()
        )

        if match:
            match.home_score = match_data["home_score"]
            match.away_score = match_data["away_score"]
            match.status = match_data["status"]
            
            db.commit()
            return match
        else:
            print(f"Warning: Match not found for {match_data['home_team']} vs {match_data['away_team']}")
            return None
        
def clean_response(response_text:str)->list:
    response_text = re.sub(r",{2,}", ",", response_text)
    response_text = response_text.replace(",,", ",")
    response_text = response_text.replace("'", '"')
    return json.loads(response_text)

def parse_week_text(text: str) -> list:
    text = text.replace("'", '"');
    week_list = json.loads(text)
    return [{"week_num": week[0], "date":f"{week[1]}-{week[2]}", "hasPassed": week[3] == 1} for week in week_list]

def get_incomplete_weeks(db: Session):
    results = (
        db.query(models.Match.fixture_week)
        .distinct()
        .filter(

            models.Match.status.in_([models.Status.NS, models.Status.LIVE]),
            
            or_(
                models.Match.home_score.is_(None), 
                models.Match.away_score.is_(None)
            ),
            models.Match.scored_week.isnot(None)
        )
        .all()
    )
    
    return [r[0] for r in results]
    

if __name__ == "__main__":
    matches, is_live = save_results_for_week(20, "https://arsiv.mackolik.com/AjaxHandlers/FixtureHandler.aspx?command=getMatches&id=70381")
    print(matches)