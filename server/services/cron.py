import os
import requests
import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

import models
from database import SessionLocal
from services import scraping, scoring
from dotenv import load_dotenv


load_dotenv()
notif_url = os.getenv("NOTIFICATION_URL")

scheduler = BackgroundScheduler()
JOB_ID = "smart_scraper"  

def scheduled_scraper_task():
    print("[INFO] Scheduler has started")
    db = SessionLocal()
    print("love for uou")
    
    league_list = db.query(models.League).filter(models.League.is_active_for_scraping == True).all()
    print(league_list)

    new_interval = 15 
    mode_message = "Standard Patrol"

    try:
        weeks = scraping.get_incomplete_weeks(db)
        
        if not weeks:
            new_interval = 360 # 6 hours
            mode_message = "Hibernation (No active games)"
            print("   -> No incomplete weeks found.")
        
        else:
            any_match_live = False
            
            for week in weeks:

                count, is_live = scraping.save_results_for_week(week, 1, db) 
                
                if is_live:
                    any_match_live = True
                
                print(f"   -> Week {week}: Updated {count} matches. Live? {is_live}")

            ct = scoring.finalize(1, db)


            # SCENARIO 2: HIGH ALERT
            if any_match_live:
                new_interval = 2 
                mode_message = "There is a Live Match"
            
            # SCENARIO 3: STANDARD PATROL (Default)
            else:
                new_interval = 5
                mode_message = "Waiting for a match to start"

    except Exception as e:
        requests.put(notif_url, "The cron job has failed!")
        print(f"Error: {e}")
        new_interval = 60
        
    finally:
        db.close()
        
        try:
            scheduler.reschedule_job(
                JOB_ID, 
                trigger='interval', 
                minutes=new_interval
            )
            print(f"🔄 Schedule Updated: {mode_message}. Next run in {new_interval} mins.")
        except Exception as e:
            print(f"⚠️ Could not reschedule: {e}")

def start_scheduler():
    scheduler.add_job(
        scheduled_scraper_task, 
        'interval', 
        minutes=1, 
        id=JOB_ID
    )
    scheduler.start()

def force_wake_up():
    job = scheduler.get_job(JOB_ID)
    if job:
        print("Forcing the scheduler to run..")
        job.modify(next_run_time=datetime.datetime.now())