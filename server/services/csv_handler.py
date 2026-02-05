import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from ..models import Match, Prediction, League
from rapidfuzz import process, fuzz

def normalize_to_ascii(text):
    """
    Strips Turkish chars to ASCII (gökhan -> gokhan).
    """
    text = text.replace("İ", "i").replace("I", "ı").lower() # Lowercase first
    replacements = {
        "ö": "o", "ü": "u", "ş": "s", "ç": "c", "ğ": "g", "ı": "i"
    }
    for turk, eng in replacements.items():
        text = text.replace(turk, eng)
    return text.strip()


TEAM_MAP = [
  "Alanya",
  "Antalya",
  "Başakşehir",
  "Beşiktaş",
  "Eyüp",
  "Fenerbahçe",
  "Galatasaray",
  "Gaziantep",
  "Gençlerbirliği",
  "Göztepe",
  "Karagümrük",
  "Kasımpaşa",
  "Kayseri",
  "Kocaeli",
  "Konya",
  "Rize",
  "Samsun",
  "Trabzon"
]
team_list = {normalize_to_ascii(a):a for a in TEAM_MAP}
NAME_MAP = [
  "Deran",
  "Tuna",
  "Emir",
  "Ahmet",
  "Erkan",
  "Yılmaz",
  "Ant",
  "Ömer",
  "Arat",
  "Özgür",
  "Atakan",
  "Necati",
  "Burak",
  "Tan",
  "Berke",
  "Sami",
  "Mesut",
  "Erhan",
  "Ulas",
  "Okando",
  "Orkun",
  "Emre",
  "Tolga",
  "Alper Ç",
  "Arda",
  "Gökhan",
  "Tunç",
  "İhsan",
  "Batu",
  "Okan E",
  "Tüf",
  "Alper G",
  "Kaya",
  "Uranüs"
]
name_list = {normalize_to_ascii(a):a for a in NAME_MAP}

def process_weekly_csv(db: Session, league_id: int, file_contents: bytes, week_num: int): pass

def normalize_match_name(name:str)->tuple[str,str]:
    parts = [normalize_to_ascii(a.strip()) for a in name.split("-")]
    parts = [run_rapidfzf(team_list, a) for a in parts]
    return (parts[0], parts[1])

def run_rapidfzf(map: dict, string: str) -> str|None:
    result = process.extractOne(string, map.keys(), scorer=fuzz.partial_ratio, score_cutoff=85)
    return team_list.get(result[0])

def main():
    df = pd.read_csv("server/services/file.csv")
    match_list = {match_name:normalize_match_name(match_name) for match_name in df.columns[2:]}
    for index, row in df.iterrows():
        name = row[df.columns[1]]
        for match_name, match_tuple in match_list.items():
            print(f"{name} predicted {row[match_name]} for {match_tuple}")


if __name__ == "__main__":
    main()