from datetime import datetime
from zoneinfo import ZoneInfo

import requests
import json
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload
import re
import models, schemas

ENDPOINT = "https://arsiv.mackolik.com/AjaxHandlers/FixtureHandler.aspx"

def get_current_week(db: Session, link_id: int):
    link = db.query(models.LeagueLink).filter(models.LeagueLink.id == link_id).first()

    response = requests.get(ENDPOINT, {"command": "getWeeks", "id": link.link})

    if response.status_code != 200:
        raise Exception(f"Failed while trying to initialize weeks for league {link.link}")
    
    weeks = parse_week_data(response.text)

    current_active_week = float('inf')

    for week in weeks:
        if week["hasPassed"]:
            continue
        if week["week_num"] < current_active_week:
            current_active_week = week["week_num"]

    return current_active_week if current_active_week != float('inf') else 0

def get_all_matches(endpoint: models.LeagueLink):
    matches = []
    i = 1
    print(f"Starting the initialization process for {endpoint.alias or endpoint.link}")
    while True:
        response = requests.get(ENDPOINT, {"command": "getMatches", "id": endpoint.link, "week": i})

        if response.status_code != 200:
            raise Exception(f"Failed to retrieve data for week {i}")
        
        games = parse_matches_for_week(response.text, i)

        if not games:
            print(f"Stopped at week {i-1}")
            break

        for game in games:
            game["league_link_id"] = endpoint.id

        matches += games
        i += 1
    return matches

def parse_matches_for_week(text: str, weeknum: int) -> list[dict]:
    # Use clean_response to safely inject nulls and maintain index positions
    lst = clean_response(text)
    week = []
    for mac in lst:
        week.append({
            "fixture_week": weeknum, 
            "home_team": normalize_team_name(mac[4]), 
            "away_team": normalize_team_name(mac[6]),
            "kickoff_time": parse_kickoff_time(mac[1], mac[2])
        })
    return week

def parse_kickoff_time(day_month: str, hour: str) -> datetime:
    """
    Parses 'DD/MM' and 'HH:MM' into a UTC datetime object.
    Defensively handles instances where 'hour' is overwritten by match statuses
    like 'MS', 'IY', or live match minutes (e.g., '72').
    """
    utc_plus_3 = ZoneInfo("Europe/Istanbul")
    current_year = datetime.now().year 
    
    # Clean up the hour string
    hour_clean = str(hour).strip().upper()
    
    # Regex check: Does it look like standard 'HH:MM' format?
    if not re.match(r"^\d{2}:\d{2}$", hour_clean):
        # The game has already started or finished, obscuring the original time.
        # Fallback to midnight on that match day so the date remains accurate.
        hour_clean = "00:00"
    
    # Combine into our explicit parsing layout
    raw_time = f"{current_year} {day_month} {hour_clean}" 
    
    try:
        naive_dt = datetime.strptime(raw_time, "%Y %d/%m %H:%M") 
        match_time_local = naive_dt.replace(tzinfo=utc_plus_3)
        return match_time_local.astimezone(ZoneInfo("UTC"))
    except ValueError as e:
        print(f"[WARNING] Failed parsing date fragment '{raw_time}': {e}")
        # Secondary fallback to absolute safe minimum if the date string itself is corrupt
        return datetime.now(ZoneInfo("UTC"))
        
def normalize_team_name(raw_name):
    return raw_name.strip() if raw_name else raw_name

def extract_all_matches(endpoints: list[str]):
    matches = []
    for endpoint in endpoints:
        matches += get_all_matches(endpoint)
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

def initialize_weeks(db: Session, league: models.League):
    links = league.links
    for link in links:
        link.weeks.clear()
        db.flush() 
        response = requests.get(ENDPOINT, {"command": "getWeeks", "id": link.link})
        if response.status_code != 200:
            raise Exception(f"Failed while trying to initialize weeks for league {link.link}")
        weeks = parse_week_data(response.text)
        model_weeks = [models.Week(**week, league_link_id=link.id) for week in weeks]
        db.add_all(model_weeks)
        db.commit()
    return len(model_weeks)

def refresh_all_weeks(league_id: int, db: Session):
    count = 0
    is_live = False

    league_db = (db.query(models.League)
                    .options(joinedload(models.League.matches), joinedload(models.League.links))
                    .filter(models.League.id == league_id).first())

    # Explicitly track historical records using the hidden developer variable (fixture_week)
    match_map = {(a.home_team, a.away_team, a.fixture_week): a for a in league_db.matches}

    for endpoint in league_db.links:
        # Loop through using the external endpoint's calendar sequence index
        for week_num in range(get_current_week(db, endpoint.id) + 1):

            response = requests.get(ENDPOINT, {"command": "getMatches", "id": endpoint.link, "week": week_num})
            lst = clean_response(response.text)
            for mac in lst:

                status = get_match_status(mac[2])
                if status == models.Status.LIVE:
                    is_live = True

                if status == models.Status.NS:
                    continue

                # Match network data directly against your internal tracking identifier (fixture_week)
                key = (mac[4].strip(), mac[6].strip(), week_num)
                match = match_map.get(key)

                if not match:
                    continue

                match.home_score = mac[9]
                match.away_score = mac[10]
                match.status = status
                count += 1
            
    db.commit()
    return count, is_live
        
def save_results_for_week(fixture_week_num, league_id, db: Session):
    """
    Accepts the target scraping week index (fixture_week) to fetch data from 
    external APIs, while leaving the display week (scored_week) untouched.
    """
    count = 0
    is_live = False

    league_db = (db.query(models.League)
                    .options(joinedload(models.League.matches), joinedload(models.League.links))
                    .filter(models.League.id == league_id).first())

    # Map records cleanly using the hidden scraping variable (fixture_week)
    match_map = {(a.home_team, a.away_team, a.fixture_week): a for a in league_db.matches}
    
    for endpoint in league_db.links:
        response = requests.get(ENDPOINT, {"command": "getMatches", "id": endpoint.link, "week": fixture_week_num})
        lst = clean_response(response.text)

        for mac in lst:
            status = get_match_status(mac[2])
            if status == models.Status.LIVE:
                is_live = True

            if status == models.Status.NS:
                continue

            key = (mac[4].strip(), mac[6].strip(), fixture_week_num)
            match = match_map.get(key)

            if not match:
                continue

            match.home_score = mac[9]
            match.away_score = mac[10]
            match.status = status
            count += 1
            
    db.commit()
    return count, is_live


def get_match_status(value):
    try:
        # Any minute integer means it's running live on the pitch
        int(value) 
        return models.Status.LIVE
    except ValueError:
        pass
    
    value = str(value).upper().strip()

    # Regular full time or penalty shootouts checkout cleanly
    if value in ["MS", "PEN"]:
        return models.Status.FT
        
    # Treat ALL extra-time indicators, half-time, and added time as live states
    elif value in ["IY", "UZ", "UZT"] or "+" in value:
        return models.Status.LIVE
        
    return models.Status.NS

def update_match_from_scrape(db: Session, week_num: int, league_id: int, match_data: dict):
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
        
def clean_response(response_text: str) -> list:
    if not response_text or response_text.strip() == "":
        return []
        
    processed = re.sub(r'\s*', '', response_text)
    processed = processed.replace(',,', ',null,')
    processed = processed.replace(',,', ',null,')
    processed = processed.replace("'", '"')
    
    return json.loads(processed)

def parse_week_data(text: str) -> list:
    text = text.replace("'", '"')
    week_list = json.loads(text)
    return [{"week_num": week[0], "date": f"{week[1]}-{week[2]}", "hasPassed": week[3] == 1} for week in week_list]

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

        