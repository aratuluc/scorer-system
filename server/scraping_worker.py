from .services.cron import force_wake_up, start_scheduler
import time

start_scheduler()
force_wake_up()


while True:
    time.sleep(1) # Lets the CPU breathe for 1 second before looping