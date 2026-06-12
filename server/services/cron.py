import os
import datetime
from zoneinfo import ZoneInfo
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

import models
from database import SessionLocal
from services import leaderboard_services, scraping, scoring

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
    Rapid live scraping engine. Auto-detects target weeks directly from
    currently active matches to safely sidestep global week calculation errors.
    """
    db = SessionLocal()
    try:
        live_matches = db.query(models.Match).filter(models.Match.is_live == True).all()
        if not live_matches:
            return # Sleep if no matches are active
            
        # Group active processing sequences by their unique league context
        leagues_to_update = {match.league_id for match in live_matches}
        
        for league_id in leagues_to_update:
            # Filter matches belonging to this specific iteration
            league_live_matches = [m for m in live_matches if m.league_id == league_id]
            
            # Map out every unique week block actively running right now
            active_weeks_in_play = {m.fixture_week for m in league_live_matches}
            
            for week_num in active_weeks_in_play:
                # Target the scraping function explicitly at the active week
                updated_count, is_still_live = scraping.save_results_for_week(week_num, league_id, db)
                
                # Rebuild target cache segments when a score matrix modification occurs
                if updated_count > 0:
                    print(f"[STRIKER] Goal detected in league {league_id}, Week {week_num}! Rebuilding caches...")
                    
                    # Fire the standalone background wrappers to safeguard transaction isolation
                    leaderboard_services.rebuild_leaderboard_cache_wrapper(league_id=league_id, week=week_num)
                    leaderboard_services.rebuild_leaderboard_cache_wrapper(league_id=league_id, week=0) # Update overall season stats
                
    except Exception as e:
        print(f"[ERROR] Striker rapid task cache sync hurdle: {e}")
    finally:
        db.close()


# ==========================================
# 3. THE AUDITOR (Runs every 60 mins)
# ==========================================
def auditor_task():
    """
    Hourly synchronization agent. Refreshes all historic sheets and fully regenerates
    the cache tree to keep season aggregations clean and accurate.
    """
    print("[INFO] Auditor task running: Verifying retrospective score matrices...")
    db = SessionLocal()
    try:
        active_leagues = db.query(models.League).filter(models.League.is_active_for_scraping == True).all()
        
        for league in active_leagues:
            print(f"[AUDITOR] Running full historical sheets sweep for league {league.id}...")
            
            # 1. Sync the entire score history with the source sheets
            scraping.refresh_all_weeks(league.id, db)
            
            # 2. Extract every distinct week that has completed or scored matches
            completed_weeks = db.query(models.Match.fixture_week).filter(
                models.Match.league_id == league.id,
                models.Match.home_score.isnot(None),
                models.Match.away_score.isnot(None)
            ).distinct().all()
            
            week_numbers = [row[0] for row in completed_weeks]
            print(f"[AUDITOR] Regenerating cache entries for weeks: {week_numbers}")
            
            # 3. Completely rebuild every scored week block to flush out any anomalies
            for week_num in week_numbers:
                leaderboard_services.rebuild_leaderboard_cache_wrapper(league_id=league.id, week=week_num)
            
            # 4. Finalize by updating the overarching Season Leaderboard (Week 0)
            leaderboard_services.rebuild_leaderboard_cache_wrapper(league_id=league.id, week=0)
            
            print(f"[AUDITOR] Leaderboard cache matrices successfully refreshed for league {league.id}")
            
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