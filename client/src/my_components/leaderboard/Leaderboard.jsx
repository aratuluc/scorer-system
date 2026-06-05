import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom"; // Added useSearchParams
import {
  getLeaderboard,
  getPlayerPredictions,
  getScoredWeeks,
} from "../../services/api";
import Header from "../common/Header";
import Card from "../common/Card";
import LeaderboardPlayer from "./LeaderboardPlayer";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "react-i18next";

function Leaderboard() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [players, setPlayers] = useState([]);
  const [currentPlayerID, setCurrentPlayerID] = useState(null);

  // Get the selected week from the URL query params, default to 0 (Overall)
  const currentWeek = parseInt(searchParams.get("week") || "0", 10);

  // 1. Fix: Re-run leaderboard fetch whenever the URL parameter week changes
  useEffect(() => {
    getLeaderboard(id, currentWeek).then(setPlayers);
  }, [id, currentWeek]);

  // 2. Fix: Wrapped in an arrow function so it runs on-demand
  const { data: scoredWeeks = [] } = useQuery({
    queryKey: ["scoredWeeks", id],
    queryFn: () => getScoredWeeks(id),
  });

  // Safe extraction checks for podium
  const first = players[0];
  const second = players[1];
  const third = players[2];
  const remainingPlayers = players.slice(3);

  // Handle dropdown changes by putting the value in the URL route path
  const handleWeekChange = (value) => {
    setSearchParams({ week: value });
  };

  const selectedPlayer = players.find(
    (player) => player.id === currentPlayerID,
  );

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <Header title={`League ${id}`} />
      <div>
        {/* 2. A temporary ugly button just to test the toggle */}
        <button onClick={() => i18n.changeLanguage("es")}>
          Switch to Spanish
        </button>
        <button onClick={() => i18n.changeLanguage("en")}>
          Switch to English
        </button>

        {/* 3. Swap out your hardcoded text! */}
        <span className="text-sm font-medium text-gray-500">
          {t("leaderboard.filter_by")}
        </span>
      </div>

      <div className="mb-6 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500">Filter by:</span>

        {/* 3. Fix: Pass the plain array and hook up the value change listener */}
        <Combobox
          items={scoredWeeks}
          value={currentWeek.toString()}
          onValueChange={handleWeekChange}
        >
          <ComboboxInput placeholder="Select Week..." />
          <ComboboxContent>
            <ComboboxEmpty>No weeks scored yet.</ComboboxEmpty>
            <ComboboxList className={"overflow-auto max-h-64"}>
              {/* Render an 'Overall' option manually first */}
              <ComboboxItem value="0">Overall Standings</ComboboxItem>

              {/* Map out the array of objects coming from your backend api */}
              {scoredWeeks.map((weekObj) => (
                <ComboboxItem
                  key={weekObj.id} // Use the unique database ID for React's key
                  value={weekObj.week_num.toString()} // Combobox values MUST be strings
                >
                  Week {weekObj.week_num}
                </ComboboxItem>
              ))}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      {players.length >= 3 && (
        <div className="flex justify-center items-end h-64 gap-2 mb-10 mt-12 px-4">
          {/* 2nd Place */}
          <button
            onClick={() => setCurrentPlayerID(second.id)}
            className="w-1/3 bg-gray-200 h-40 rounded-t-lg flex flex-col items-center justify-start pt-6 shadow-sm relative transition-transform hover:-translate-y-1"
          >
            <div className="absolute -top-8 text-4xl">🥈</div>
            <span className="font-bold text-gray-700 truncate w-full text-center px-2">
              {second?.name}
            </span>
            <span className="text-sm font-semibold text-gray-500">
              {second?.points} pts
            </span>
          </button>

          {/* 1st Place */}
          <button
            onClick={() => setCurrentPlayerID(first.id)}
            className="w-1/3 bg-yellow-400 h-56 rounded-t-lg flex flex-col items-center justify-start pt-8 shadow-xl z-10 relative transition-transform hover:-translate-y-1"
          >
            <div className="absolute -top-10 text-5xl">🥇</div>
            <span className="font-extrabold text-xl text-yellow-900 truncate w-full text-center px-2">
              {first?.name}
            </span>
            <span className="font-bold text-yellow-800">
              {first?.points} pts
            </span>
          </button>

          {/* 3rd Place */}
          <button
            onClick={() => setCurrentPlayerID(third.id)}
            className="w-1/3 bg-orange-200 h-32 rounded-t-lg flex flex-col items-center justify-start pt-4 shadow-sm relative transition-transform hover:-translate-y-1"
          >
            <div className="absolute -top-8 text-3xl">🥉</div>
            <span className="font-bold text-orange-900 truncate w-full text-center px-2">
              {third?.name}
            </span>
            <span className="text-sm font-semibold text-orange-800">
              {third?.points} pts
            </span>
          </button>
        </div>
      )}

      {/* The Remaining List */}
      <Card>
        <div className="flex flex-col gap-2 p-2">
          {remainingPlayers.map((player, index) => (
            <LeaderboardPlayer
              key={player.name}
              playerData={player}
              rank={index + 4}
              onClick={setCurrentPlayerID}
            />
          ))}
          {remainingPlayers.length === 0 && players.length < 3 && (
            <div className="text-center text-gray-500 py-4">
              Not enough players for a full standings calculation yet!
            </div>
          )}
        </div>
      </Card>
      <PredictionsModal
        currentPlayerID={currentPlayerID}
        setCurrentPlayerID={setCurrentPlayerID}
        playerName={selectedPlayer?.name}
        currentWeek={currentWeek}
        leagueID={id}
      ></PredictionsModal>
    </div>
  );
}

function PredictionsModal({
  currentPlayerID,
  setCurrentPlayerID,
  playerName,
  currentWeek,
  leagueID,
}) {
  const result = useQuery({
    queryKey: ["predictions", currentPlayerID, currentWeek],
    queryFn: () => getPlayerPredictions(leagueID, currentPlayerID, currentWeek),
    enabled: currentPlayerID !== null,
  });
  const predictions = result.data || [];

  // 2. Group the predictions into a dictionary
  const groupedPredictions = predictions.reduce((acc, prediction) => {
    // If the match doesn't have a scored_week yet, put it in an "Unscored" pool
    const weekLabel = prediction.scored_week
      ? `Week ${prediction.scored_week}`
      : "Unscored";

    if (!acc[weekLabel]) {
      acc[weekLabel] = [];
    }
    acc[weekLabel].push(prediction);

    return acc;
  }, {});
  return (
    <div>
      <Dialog
        open={currentPlayerID !== null}
        onOpenChange={() => setCurrentPlayerID(null)}
      >
        <DialogContent className={"bg-gray-100 sm:max-w-2xl"}>
          <DialogHeader>
            <DialogTitle>{`Viewing predictions for ${playerName}`}</DialogTitle>
            <DialogDescription>
              {result.isLoading && <Spinner />}
              {
                <div className="flex flex-col gap-3 mt-4 overflow-y-auto max-h-[60vh] p-1">
                  {result.data?.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      No predictions found for this week.
                    </div>
                  )}

                  {/* We use Object.entries to turn our dictionary into a loopable array */}
                  {Object.entries(groupedPredictions).map(
                    ([weekLabel, weekMatches]) => (
                      <div key={weekLabel} className="mb-6 last:mb-0">
                        {/* The Section Header */}
                        <h3 className="font-bold text-lg text-gray-700 mb-3 border-b pb-1 sticky top-0 bg-gray-100 z-10">
                          {weekLabel}
                        </h3>

                        {/* The Matches for this specific week */}
                        <div className="flex flex-col gap-3">
                          {weekMatches.map((prediction) => {
                            const actualScore =
                              prediction.home_score !== null &&
                              prediction.away_score !== null
                                ? `${prediction.home_score} - ${prediction.away_score}`
                                : "TBD";

                            const predScore =
                              prediction.home_pred !== null &&
                              prediction.away_pred !== null
                                ? `${prediction.home_pred} - ${prediction.away_pred}`
                                : "N/A";

                            const badgeColor =
                              prediction.points > 0
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500";

                            return (
                              <div
                                key={prediction.id}
                                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
                              >
                                {/* Left: Teams */}
                                <div className="flex-[2] font-semibold text-gray-800 text-left truncate pr-2">
                                  {prediction.home_team}
                                  <span className="text-gray-400 font-normal text-xs mx-2">
                                    vs
                                  </span>
                                  {prediction.away_team}
                                </div>

                                {/* Center: Scores */}
                                <div className="flex flex-[2] justify-center gap-6 text-sm">
                                  <div className="flex flex-col items-center">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                                      Actual
                                    </span>
                                    <span className="font-bold text-gray-700">
                                      {actualScore}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                                      Predicted
                                    </span>
                                    <span className="font-semibold text-blue-600">
                                      {predScore}
                                    </span>
                                  </div>
                                </div>

                                {/* Right: Points */}
                                <div className="flex flex-1 justify-end">
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-bold ${badgeColor}`}
                                  >
                                    +{prediction.points} pts
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              }
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Leaderboard;
