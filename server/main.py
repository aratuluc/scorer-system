
from .database import engine
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from . import models, schemas, database
from dotenv import load_dotenv
import os
import requests
from .services import cron, security
from .routes import leagues, leaderboards, auth, predictions

load_dotenv()
origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
notif_url = os.getenv("NOTIFICATION_URL")

models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        print("System Starting")
        cron.start_scheduler()
        yield
    except Exception as e:
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
app.include_router(auth.auth_router)
app.include_router(predictions.router, prefix="/predictions", tags=["Predictions"])



