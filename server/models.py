from typing import List
from typing import Optional
from sqlalchemy import ForeignKey
from sqlalchemy import String
from .database import Base
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

class League(Base):
    __tablename__ = "league"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(30))
    start_year: Mapped[int]
    
    links: Mapped[List["LeagueLink"]] = relationship(
        back_populates="league", cascade="all, delete-orphan"
    )
    
    matches: Mapped[List["Match"]] = relationship(
        back_populates="league", cascade="all, delete-orphan"
    )

class LeagueLink(Base):
    __tablename__ = "league_link"
    id: Mapped[int] = mapped_column(primary_key=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("league.id"))
    link: Mapped[str]
    
    league: Mapped["League"] = relationship(back_populates="links")

class Match(Base):
    __tablename__ = "match"
    id: Mapped[int] = mapped_column(primary_key=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("league.id"))
    fixture_week: Mapped[int]
    scored_week: Mapped[Optional[int]]
    home_team: Mapped[str]
    away_team: Mapped[str]
    home_score: Mapped[Optional[int]]
    away_score: Mapped[Optional[int]]
    
    league: Mapped["League"] = relationship(back_populates="matches")
    
    predictions: Mapped[List["Prediction"]] = relationship(
        back_populates="match", cascade="all, delete-orphan"
    )


class Player(Base):
    __tablename__ = "player"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(30))
    score: Mapped[int] = 0 
    
    predictions: Mapped[List["Prediction"]] = relationship(
        back_populates="player", cascade="all, delete-orphan"
    )

class Prediction(Base):
    __tablename__= "prediction"
    id: Mapped[int] = mapped_column(primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("player.id"))
    match_id: Mapped[int] = mapped_column(ForeignKey("match.id"))
    
    player: Mapped["Player"] = relationship(back_populates="predictions")
    
    match: Mapped["Match"] = relationship(back_populates="predictions")
    
    home_pred: Mapped[Optional[int]]
    away_pred: Mapped[Optional[int]]