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
    Rapid live scraping engine. Sweeps live fixtures, updates their scores,
    finalizes individual prediction points rows, and flushes the display cache
    for both the scored_week and the overall season stats.
    """
    db = SessionLocal()
    try:
        live_matches = db.query(models.Match).filter(models.Match.is_live == True).all()
        if not live_matches:
            return # Sleep if no matches are active
            
        leagues_to_update = {match.league_id for match in live_matches}
        
        for league_id in leagues_to_update:
            league_live_matches = [m for m in live_matches if m.league_id == league_id]
            
            weeks_to_rebuild = set()
            any_league_goals = False
            
            for match in league_live_matches:
                # 1. Fetch live score data using the original calendar week
                updated_count, is_still_live = scraping.save_results_for_week(match.fixture_week, league_id, db)
                
                if updated_count > 0:
                    any_league_goals = True
                    if match.scored_week is not None:
                        weeks_to_rebuild.add(match.scored_week)
                        
                    # 🚨 2. FINALIZATION STEP: Force update the prediction points rows for this match right now!
                    match_predictions = db.query(models.Prediction).filter(models.Prediction.match_id == match.id).all()
                    for pred in match_predictions:
                        # Call your project's native scoring matrix evaluator
                        pred.points = scoring.evaluate_score(
                            match.home_score,
                            match.away_score,
                            pred.home_pred,
                            pred.away_pred
                        )* match.multiplier
                    db.commit() # Flush the finalized points directly to the production table
            
            # 3. Rebuild cache layers securely using the freshly saved prediction points rows
            if any_league_goals:
                for week_num in weeks_to_rebuild:
                    print(f"[STRIKER] Rebuilding display cache for League {league_id}, Week {week_num}...")
                    leaderboard_services.rebuild_leaderboard_cache_wrapper(league_id=league_id, week=week_num)
                
                # Rebuild the master season cache (Week 0) knowing the prediction table has real data
                print(f"[STRIKER] Rebuilding overarching Season Leaderboard (Week 0) for League {league_id}...")
                leaderboard_services.rebuild_leaderboard_cache_wrapper(league_id=league_id, week=0)

    except Exception as e:
        print(f"[ERROR] Striker rapid task cache sync hurdle: {e}")
        db.rollback()
    finally:
        db.close()

# ==========================================
# 3. THE AUDITOR (Runs every 60 mins)
# ==========================================
def auditor_task():
    """
    Hourly synchronization agent. Refreshes historic sheets using display weeks
    and fully regenerates the cache tree to keep season aggregations clean and accurate.
    """
    print("[INFO] Auditor task running: Verifying retrospective score matrices...")
    db = SessionLocal()
    try:
        active_leagues = db.query(models.League).filter(models.League.is_active_for_scraping == True).all()
        
        for league in active_leagues:
            print(f"[AUDITOR] Running full historical sheets sweep for league {league.id}...")
            
            # Sync history
            scraping.refresh_all_weeks(league.id, db)
            
            # 🚨 FIX: Extract distinct weeks from SCORED_WEEK to identify which charts actually need cache rebuilds
            completed_weeks = db.query(models.Match.scored_week).filter(
                models.Match.league_id == league.id,
                models.Match.home_score.isnot(None),
                models.Match.away_score.isnot(None),
                models.Match.scored_week.isnot(None)
            ).distinct().all()
            
            week_numbers = [row[0] for row in completed_weeks]
            print(f"[AUDITOR] Regenerating cache entries for scored weeks: {week_numbers}")
            
            # Completely rebuild every active scored week block to flush out any discrepancies
            for week_num in week_numbers:
                leaderboard_services.rebuild_leaderboard_cache_wrapper(league_id=league.id, week=week_num)
            
            # Finalize by updating the overarching Season Leaderboard (Week 0)
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
    scheduler.add_job(scout_task, 'interval', minutes=15, id=SCOUT_JOB_ID)
    scheduler.add_job(striker_task, 'interval', seconds=30, id=STRIKER_JOB_ID)
    scheduler.add_job(auditor_task, 'interval', minutes=60, id=AUDITOR_JOB_ID)
    
    scheduler.start()
    print("[INFO] All background cron engine gears are actively engaged.")

def force_wake_up(job_id: str):
    job = scheduler.get_job(job_id)
    if job:
        print(f"Forcing scheduler job '{job_id}' to run immediately...")
        job.modify(next_run_time=datetime.datetime.now())