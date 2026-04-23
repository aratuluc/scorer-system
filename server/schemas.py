from typing import Optional
from pydantic import BaseModel, PositiveInt, Field, HttpUrl, computed_field
from enum import Enum

from .services import scoring

from .models import Status 

#=== LEAGUE ===

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
    matches: list["Match"]
    players: list["Player"]
    links: list["LinkResponse"]

    @computed_field
    def team_map(self) -> list[str]:
        teams = set()

        for m in self.matches:
            teams.add(m.home_team)
            teams.add(m.away_team)
            
        return sorted(list(teams))
    
#=== MATCH ===

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
    scored_week: Optional[int] = None
    status: Status
    model_config = {"from_attributes": True}

#=== PLAYER ===

class PlayerBase(BaseModel): 
    name: str
class PlayerCreate(PlayerBase): ...

class Player(PlayerBase):
    id: int
    league_id: int
    model_config = {"from_attributes": True}

class PlayerLeaderboard(Player):
    predictions: list["Prediction"] = Field(exclude=True)
    @computed_field
    def points(self) -> int:
        return sum(p.display_points for p in self.predictions)

#=== PREDICTION ===

class PredictionBase(BaseModel): 
    home_pred:int
    away_pred:int

class PredictionCreate(PredictionBase): ...

class Prediction(PredictionBase): 
    match_id: int
    player_id: int
    points: int|None
    id: int
 
    match: "Match" = Field(exclude=True)
    model_config = {"from_attributes": True}
    @computed_field
    def display_points(self) -> int:
        if self.points is not None:
            return self.points
        
        if self.match.home_score is None or self.match.away_score is None:
            return 0
        
        return scoring.evaluate_score(self.match.home_score, self.match.away_score, self.home_pred, self.away_pred)

#=== LINK ===

class LinkBase(BaseModel):
    link: HttpUrl
class LinkCreate(LinkBase):
    pass
class LinkResponse(LinkBase):
    id: int
    league_id: int
    model_config = {"from_attributes": True}


#=== ETC === 
class UnknownFix(BaseModel):
    name: str
    data: dict
    textValue: str
    choiceValue: str
    week_num:int

    model_config = {"from_attributes": True}

League.model_rebuild()
Match.model_rebuild()
PlayerLeaderboard.model_rebuild()
Prediction.model_rebuild()