from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, computed_field
from enum import Enum
from pydantic import BaseModel, model_validator
from typing import Optional

from services import scoring
from models import Status 

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
    matches: List["Match"]
    players: List["Player"]
    links: List["LinkResponse"]
    is_active_for_scraping: bool
    # Removed direct weeks relationship from here

    @computed_field
    def team_map(self) -> List[str]:
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
    kickoff_time: datetime
    is_live: bool
    # Nested competition week tracking details
    week_id: Optional[int] = None

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
    predictions: List["Prediction"] = Field(exclude=True)
    
    @computed_field
    def points(self) -> int:
        return sum(p.display_points for p in self.predictions)

#=== PREDICTION ===

class PredictionBase(BaseModel): 
    home_pred: Optional[int]
    away_pred: Optional[int]

class PredictionCreate(PredictionBase): ...

class Prediction(PredictionBase): 
    match_id: int
    player_id: int
    points: Optional[int]
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
    
class DisplayPrediction(PredictionBase):
    id: int
    home_team: str
    away_team: str
    home_score: Optional[int]
    away_score: Optional[int]
    points: int 
    scored_week: int

    @model_validator(mode='before')
    @classmethod
    def flatten_prediction(cls, data):
        
        extracted_home_team = data.match.home_team
        extracted_away_team = data.match.away_team
        extracted_home_score = data.match.home_score
        extracted_away_score = data.match.away_score

        if extracted_home_score is None or extracted_away_score is None:
            calculated_points = 0
        else:
            calculated_points = scoring.evaluate_score(extracted_home_score, extracted_away_score, data.home_pred, data.away_pred)

        return {
            "id": data.id,
            "home_pred": data.home_pred,
            "away_pred": data.away_pred,
            "home_team": extracted_home_team,
            "away_team": extracted_away_team,
            "home_score": extracted_home_score,
            "away_score": extracted_away_score,
            "points": calculated_points,
            "scored_week": data.match.scored_week
        }

#=== LINK ===

class LinkBase(BaseModel):
    link: str
    alias: str

class LinkCreate(LinkBase):
    pass

class LinkResponse(LinkBase):
    id: int
    league_id: int
    
    weeks: List["Week"] = []
    
    model_config = {"from_attributes": True}

#=== WEEK === 

class WeekBase(BaseModel):
    week_num: int
    date: str
    league_link_id: int

class WeekCreate(WeekBase): ...

class Week(WeekBase):
    id: int
    matches: List["Match"] = []
    hasPassed: bool
    model_config = {"from_attributes": True}

class WeekScored(WeekBase):
    id: int

#=== ETC === 
class UnknownFix(BaseModel):
    name: str
    data: dict
    textValue: str
    choiceValue: str
    week_num: int
    model_config = {"from_attributes": True}

class LeaderboardRow(BaseModel):
    player_id: int
    player_name: str
    points: int
    rank: int

    model_config = {"from_attributes": True}



League.model_rebuild()
Match.model_rebuild()
PlayerLeaderboard.model_rebuild()
Prediction.model_rebuild()
LinkResponse.model_rebuild()
Week.model_rebuild()