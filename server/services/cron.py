import os
import datetime
from zoneinfo import ZoneInfo
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

import models
from database import SessionLocal
from services import scraping, scoring

load_dotenv()
notif_url = os.getenv("NOTIFICATION_URL")

scheduler = BackgroundScheduler()

# Unique IDs to manage jobs independently
SCOUT_JOB_ID = "league_scout"
STRIKER_JOB_ID = "live_striker"
AUDITOR_JOB_ID = "historical_auditor"


# ==========================================
# 1. THE SCOUT (Runs every 15 mins)
# ==========================================
def scout_task():
    """
    Scouts upcoming fixtures. If a match is within 15 minutes of kickoff,
    it flips the `is_live` flag to True so the Striker can pick it up.
    Also acts as a safety valve to flip old live games to False.
    """
    print("[INFO] Scout task running: Syncing live status flags...")
    db = SessionLocal()
    try:
        now_utc = datetime.datetime.now(ZoneInfo("UTC"))
        kickoff_window = now_utc + datetime.timedelta(minutes=15)
        
        # Look for matches about to start that aren't marked live yet
        upcoming_matches = db.query(models.Match).filter(
            models.Match.kickoff_time >= now_utc,
            models.Match.kickoff_time <= kickoff_window,
            models.Match.is_live == False
        ).all()
        
        for match in upcoming_matches:
            print(f"[SCOUT] Activating live tracking for: {match.home_team} vs {match.away_team}")
            match.is_live = True
            
        # Safety check: Force-turn off games that have been marked live for over 3 hours
        stale_threshold = now_utc - datetime.timedelta(hours=3)
        stale_matches = db.query(models.Match).filter(
            models.Match.kickoff_time < stale_threshold,
            models.Match.is_live == True
        ).all()
        
        for match in stale_matches:
            print(f"[SCOUT] Deactivating stale live match: {match.home_team} vs {match.away_team}")
            match.is_live = False
            
        db.commit()
    except Exception as e:
        print(f"[ERROR] Scout task failed: {e}")
        db.rollback()
    finally:
        db.close()


# ==========================================
# 2. THE STRIKER (Runs every 30 seconds)
# ==========================================
def striker_task():
    """
    The rapid-fire live data tracker. Queries the database for matches 
    flagged as live, scrapes their updates, and saves goals immediately.
    """
    db = SessionLocal()
    try:
        # Check our database context first before hitting external networks
        live_matches = db.query(models.Match).filter(models.Match.is_live == True).all()
        
        if not live_matches:
            # If nothing is live, exit instantly. Costs zero overhead.
            return
            
        print(f"[STRIKER] Tracking {len(live_matches)} active live matches...")
        
        # Group live matches by their league so you don't call the endpoint multiple times
        leagues_to_update = {match.league_id for match in live_matches}
        
        for league_id in leagues_to_update:
            # Call your scraping file's target week updater
            # For live games, we can parse the specific current week frame
            current_week = scraping.get_current_week(db, league_id)
            count, is_still_live = scraping.save_results_for_week(current_week, league_id, db)
            
            # If the scraper reports that no games are live on the external site, 
            # we can let the scout turn off the flags on the next patrol.
    except Exception as e:
        print(f"[ERROR] Striker rapid task encountered a hurdle: {e}")
    finally:
        db.close()


# ==========================================
# 3. THE AUDITOR (Runs every 60 mins)
# ==========================================
def auditor_task():
    """
    The retrospective safety net. Looks back at matches from the last 24 hours 
    to verify final scores are locked in and scoreboards match reality.
    """
    print("[INFO] Auditor task running: Verifying retrospective score matrices...")
    db = SessionLocal()
    try:
        # Look up active leagues that opt-in for validation sweeps
        active_leagues = db.query(models.League).filter(models.League.is_active_for_scraping == True).all()
        
        for league in active_leagues:
            # Run a full retrospective refresh over the active week frame
            scraping.refresh_all_weeks(league.id, db)
            
            # Trigger your leaderboard calculation engine here once scores are confirmed!
            scoring.recalculate_leaderboard_for_league(league.id, db)
            print(f"[AUDITOR] Completed sync and scoring recalculation for league context: {league.id}")
    except Exception as e:
        print(f"[ERROR] Auditor validation task failed: {e}")
    finally:
        db.close()


# ==========================================
# Scheduler Control Interface
# ==========================================
def start_scheduler():
    # 1. Scout checks upcoming timeline states every 15 minutes
    scheduler.add_job(scout_task, 'interval', minutes=15, id=SCOUT_JOB_ID)
    
    # 2. Striker sweeps active game URLs every 30 seconds
    scheduler.add_job(striker_task, 'interval', seconds=30, id=STRIKER_JOB_ID)
    
    # 3. Auditor ensures historical scores match perfectly every hour
    scheduler.add_job(auditor_task, 'interval', minutes=60, id=AUDITOR_JOB_ID)
    
    scheduler.start()
    print("[INFO] All background cron engine gears are actively engaged.")

def force_wake_up(job_id: str):
    job = scheduler.get_job(job_id)
    if job:
        print(f"Forcing scheduler job '{job_id}' to run immediately...")
        job.modify(next_run_time=datetime.datetime.now())