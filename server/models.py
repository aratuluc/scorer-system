from typing import List
from typing import Optional
from sqlalchemy import ForeignKey, String
from .database import Base
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship
import enum
from sqlalchemy import Enum

class Status(enum.Enum):
    LIVE="live"
    NS="not started"
    FT="full time"

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

    players: Mapped[List["Player"]] = relationship("Player", back_populates="league")

class LeagueLink(Base):
    __tablename__ = "league_link"
    id: Mapped[int] = mapped_column(primary_key=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("league.id"))
    link: Mapped[str]
    alias: Mapped[str]
    
    league: Mapped["League"] = relationship(back_populates="links")

    # Correctly tracking competition-scoped timelines
    weeks: Mapped[List["Week"]] = relationship(
        back_populates="league_link", cascade="all, delete-orphan"
    )

class Match(Base):
    __tablename__ = "match"
    id: Mapped[int] = mapped_column(primary_key=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("league.id"))
    status: Mapped[Status] = mapped_column(default=Status.NS)
    fixture_week: Mapped[int]
    scored_week: Mapped[Optional[int]]
    home_team: Mapped[str]
    away_team: Mapped[str]
    home_score: Mapped[Optional[int]]
    away_score: Mapped[Optional[int]]
    
    league: Mapped["League"] = relationship(back_populates="matches")

    # Correctly linked to the competition week
    week_id: Mapped[Optional[int]] = mapped_column(ForeignKey("week.id"))
    week: Mapped[Optional["Week"]] = relationship(back_populates="matches")
    
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
    league = relationship("League", back_populates="players")
    league_id: Mapped[int] = mapped_column(ForeignKey("league.id"))

class Prediction(Base):
    __tablename__= "prediction"
    id: Mapped[int] = mapped_column(primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("player.id"))
    match_id: Mapped[int] = mapped_column(ForeignKey("match.id"))
    
    player: Mapped["Player"] = relationship(back_populates="predictions")
    match: Mapped["Match"] = relationship(back_populates="predictions")
    
    home_pred: Mapped[Optional[int]]
    away_pred: Mapped[Optional[int]]
    points: Mapped[Optional[int]]

class Week(Base):
    __tablename__ = "week"
    id: Mapped[int] = mapped_column(primary_key=True)
    week_num: Mapped[int] 
    date: Mapped[str]   
    
    league_link_id: Mapped[int] = mapped_column(ForeignKey("league_link.id"))
    league_link: Mapped["LeagueLink"] = relationship(back_populates="weeks")
    
    matches: Mapped[List["Match"]] = relationship(
        back_populates="week", cascade="all, delete-orphan"
    )