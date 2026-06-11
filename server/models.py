from typing import List
from typing import Optional
from sqlalchemy import Boolean, ForeignKey, String, true, Index, text
from database import Base
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.orm import relationship
import enum
from sqlalchemy import Enum, DateTime
from datetime import datetime

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
    is_active_for_scraping: Mapped[bool] = False

class LeagueLink(Base):
    __tablename__ = "league_link"
    id: Mapped[int] = mapped_column(primary_key=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("league.id"))
    link: Mapped[str]
    alias: Mapped[str]

    is_live: Mapped[bool] = mapped_column(default=False, server_default=text("false"))
    
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

    is_live: Mapped[bool] = mapped_column(default=False, server_default=text("false"))

    kickoff_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    
    league: Mapped["League"] = relationship(back_populates="matches")

    # Correctly linked to the competition week
    week_id: Mapped[Optional[int]] = mapped_column(ForeignKey("week.id"))
    week: Mapped[Optional["Week"]] = relationship(back_populates="matches")
    
    predictions: Mapped[List["Prediction"]] = relationship(
        back_populates="match", cascade="all, delete-orphan"
    )

class StagingMatch(Base): 
    __tablename__ = "staging_match"
    id: Mapped[int] = mapped_column(primary_key=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("league.id"))

    scored_week: Mapped[Optional[int]]
    home_team: Mapped[str]
    away_team: Mapped[str]
    
    staging_predictions: Mapped[List["StagingPredictions"]] = relationship(
        back_populates="staging_match", cascade="all, delete-orphan"
    )

class StagingPredictions(Base):
    __tablename__= "staging_predictions"
    id: Mapped[int] = mapped_column(primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("player.id"))
    staging_match_id: Mapped[int] = mapped_column(ForeignKey("staging_match.id"))
    
    # One-way relationship: StagingPrediction can easily access the Player's name, 
    player: Mapped["Player"] = relationship() 
    
    staging_match: Mapped["StagingMatch"] = relationship(back_populates="staging_predictions")
    
    home_pred: Mapped[Optional[int]]
    away_pred: Mapped[Optional[int]]



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
    __table_args__ = (
    Index('idx_player_match_points', 'player_id', 'match_id', 'points'),
)
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
    hasPassed: Mapped[bool]
    
    league_link_id: Mapped[int] = mapped_column(ForeignKey("league_link.id"))
    league_link: Mapped["LeagueLink"] = relationship(back_populates="weeks")
    
    matches: Mapped[List["Match"]] = relationship(
        back_populates="week", cascade="all, delete-orphan"
    )

class Leaderboard(Base):
    __tablename__ = "leaderboards"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    league_id: Mapped[int] = mapped_column(index=True)
    week_num: Mapped[int] = mapped_column(index=True)
    rows: Mapped[list["LeaderboardRow"]] = relationship(cascade="all, delete-orphan", back_populates="leaderboard")

class LeaderboardRow(Base):
    __tablename__ = "leaderboard_rows"
    id: Mapped[int] = mapped_column(primary_key = True)
    leaderboard_id: Mapped[int] = mapped_column(ForeignKey("leaderboards.id", ondelete="CASCADE"))
    
    leaderboard: Mapped["Leaderboard"] = relationship(back_populates="rows")

    player_id: Mapped[int] = mapped_column(ForeignKey("player.id"))
    player_name: Mapped[str]
    points: Mapped[int]
    rank: Mapped[int]