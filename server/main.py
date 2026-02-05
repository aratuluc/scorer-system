from .database import engine, get_db
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, database
from dotenv import load_dotenv
import os
from .routes import leagues

load_dotenv()
origins = os.getenv("ALLOWED_ORIGINS", "").split(",")


models.Base.metadata.create_all(bind=engine)
app = FastAPI()

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



