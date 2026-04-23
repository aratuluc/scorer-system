from .database import engine
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from . import models, schemas, database
from dotenv import load_dotenv
import os
import requests
from .services import cron
from .routes import leagues, leaderboards

load_dotenv()
origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
notif_url = os.getenv("NOTIFICATION_URL")

models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        print("System Starting")
        cron.start_scheduler()
        #requests.put(notif_url, "Server is Online and Ready.")
        yield
    except Exception as e:
        #requests.put(notif_url, f"BOOT FAILURE: {e}")
        raise e
    finally:
        print("System Shutting Down")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return "Hello World!"

app.include_router(leagues.router, prefix="/leagues", tags=["Leagues"])
app.include_router(leaderboards.router, prefix="/leaderboards", tags=["Leaderboards"])



