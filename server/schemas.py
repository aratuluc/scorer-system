from typing import Optional
from pydantic import BaseModel, PositiveInt, Field, HttpUrl


class LeagueBase(BaseModel): 
    name: str = Field(..., min_length=3, max_length=50, description="Name must be 3-50 chars")
    start_year: int

class LeagueCreate(LeagueBase): ...

class LeagueUpdate(BaseModel):
    name: Optional[str] = None
    start_year: Optional[int] = None

class League(LeagueBase): 
    id: int
    model_config = {"from_attributes": True}

class MatchBase(BaseModel): 
    home_team: str
    away_team: str
    fixture_week: int
    league_id: int

class MatchCreate(MatchBase): ...

class Match(MatchBase): 
    id: int
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    model_config = {"from_attributes": True}

class PlayerBase(BaseModel): 
    name: str
class PlayerCreate(PlayerBase): ...

class Player(PlayerBase):
    id: int
    score: int
    model_config = {"from_attributes": True}

class PredictionBase(BaseModel): 
    home_pred:int
    away_pred:int

class PredictionCreate(PredictionBase): ...

class Prediction(PredictionBase): 
    match_id: int
    player_id: int
    id: int
    model_config = {"from_attributes": True}

class LinkBase(BaseModel):
    link: HttpUrl
class LinkCreate(LinkBase):
    pass
class LinkResponse(LinkBase):
    id: int
    league_id: int
    model_config = {"from_attributes": True}

