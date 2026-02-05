from functools import lru_cache


def main():
    pass

@lru_cache(maxsize=None)
def evaluate_score(true_home:int, true_away:int, prediction_home:int, prediction_away:int):
  if true_home>true_away:
     result = "home"
  elif true_away>true_home:
     result = "away"
  else:
     result = "draw"

  if prediction_home>prediction_away:
     prediction_result = "home"
  elif prediction_away>prediction_home:
     prediction_result = "away"
  else:
     prediction_result = "draw"


  total = 0
  if true_home==prediction_home and true_away==prediction_away:
    if true_home+true_away >= 5:
          total += 5
    match abs(true_home-true_away):
      case 0:
        total += 7
      case 1:
          total += 5
      case _ if abs(true_home-true_away) >= 2:
          total += 7
    return total
  elif result == prediction_result:
    total += 2
    if abs(true_home-true_away) == abs(prediction_home-prediction_away):
      total += 1
  if true_home == prediction_home:
    total += 1
  if true_away == prediction_away:
    total += 1
  return total

if __name__ == "__main__":
    main()