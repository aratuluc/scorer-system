import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  getLeaderboard,
  getScoredWeeks,
  getPlayerPredictions,
} from "@/services/api";
import {
  getLeaderboardTitle,
  getMaxScoredWeek,
  getPlayersLeaderboard,
} from "@/services/leaderboard_api";
import Header from "../common/Header";
import Card from "../common/Card";
import LeaderboardPlayer from "./LeaderboardPlayer";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@base-ui/react";
import { Fragment } from "react";

function Leaderboard() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPlayerID, setCurrentPlayerID] = useState(null);

  // Sync state cleanly with the URL query structure tracking
  const currentWeek = parseInt(searchParams.get("week") || "0", 10);

  const { data: players = [], isLoading: isLeaderboardLoading } = useQuery({
    queryKey: ["leaderboard", id, currentWeek],
    queryFn: () => getLeaderboard(id, currentWeek),
  });

  const { data: maxWeek } = useQuery({
    queryKey: ["scoredWeeks", id],
    queryFn: () => getMaxScoredWeek(id),
  });

  const first = players[0];
  const second = players[1];
  const third = players[2];
  const remainingPlayers = players.slice(3);

  // Updates the browser address parameters when a new option is clicked
  const handleWeekChange = (value) => {
    setSearchParams({ week: value });
  };

  const currentPlayer = players.find((p) => p.player_id === currentPlayerID);

  const { data: leagueInfo, isLoading: isLeaguesLoading } = useQuery({
    queryKey: ["leagueInfo", id],
    queryFn: () => getLeaderboardTitle(id),
  });

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {isLeaguesLoading ? (
        <Spinner />
      ) : (
        <Header title={`${leagueInfo?.title}`} />
      )}

      {/* Fully Configured Dynamic Dropdown Selection Grid */}
      <div className="mb-6 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500">
          {t("leaderboard.filter_by")}
        </span>

        <Select value={String(currentWeek)} onValueChange={handleWeekChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("leaderboard.select_week")} />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: maxWeek?.max_week + 1 }, (_, i) => (
              <SelectItem value={String(i)} key={`week-dropdown-opt-${i}`}>
                {i === 0
                  ? t("leaderboard.overall")
                  : `${t("leaderboard.week")} ${i}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isLeaderboardLoading && players && players.length >= 3 ? (
        <div className="flex justify-center items-end h-64 gap-2 mb-10 mt-12 px-4">
          {/* 2nd Place */}
          <button
            onClick={() => setCurrentPlayerID(second?.player_id)}
            className="w-1/3 bg-gray-200 h-40 rounded-t-lg flex flex-col items-center justify-start pt-6 shadow-sm relative transition-transform hover:-translate-y-1"
          >
            <div className="absolute -top-8 text-4xl">🥈</div>
            <span className="font-bold text-gray-700 truncate w-full text-center px-2">
              {second?.player_name}
            </span>
            <span className="text-sm font-semibold text-gray-500">
              {second?.points} {t("leaderboard.pts")}
            </span>
          </button>

          {/* 1st Place */}
          <button
            onClick={() => setCurrentPlayerID(first?.player_id)}
            className="w-1/3 bg-yellow-400 h-56 rounded-t-lg flex flex-col items-center justify-start pt-8 shadow-xl z-10 relative transition-transform hover:-translate-y-1"
          >
            <div className="absolute -top-10 text-5xl">🥇</div>
            <span className="font-extrabold text-xl text-yellow-900 truncate w-full text-center px-2">
              {first?.player_name}
            </span>
            <span className="font-bold text-yellow-800">
              {first?.points} {t("leaderboard.pts")}
            </span>
          </button>

          {/* 3rd Place */}
          <button
            onClick={() => setCurrentPlayerID(third?.player_id)}
            className="w-1/3 bg-orange-200 h-32 rounded-t-lg flex flex-col items-center justify-start pt-4 shadow-sm relative transition-transform hover:-translate-y-1"
          >
            <div className="absolute -top-8 text-3xl">🥉</div>
            <span className="font-bold text-orange-900 truncate w-full text-center px-2">
              {third?.player_name}
            </span>
            <span className="text-sm font-semibold text-orange-800">
              {third?.points} {t("leaderboard.pts")}
            </span>
          </button>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-10">
          Loading podium stats...
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-2 p-2">
          {remainingPlayers.map((player, index) => (
            <LeaderboardPlayer
              key={`player-list-row-${player.player_id || player.player_name}`}
              playerData={player}
              rank={index + 4}
              onClick={setCurrentPlayerID}
            />
          ))}
          {remainingPlayers.length === 0 && players.length < 3 && (
            <div className="text-center text-gray-500 py-4">
              {t("leaderboard.not_enough_players")}
            </div>
          )}
        </div>
      </Card>

      <PredictionsModal
        currentPlayerID={currentPlayerID}
        setCurrentPlayerID={setCurrentPlayerID}
        playerName={currentPlayer?.player_name}
        currentWeek={currentWeek}
        leagueID={id}
      />
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
  const { t } = useTranslation();
  const result = useQuery({
    queryKey: ["predictions", currentPlayerID, currentWeek],
    queryFn: () => getPlayerPredictions(leagueID, currentPlayerID, currentWeek),
    enabled: currentPlayerID !== null,
  });
  const predictions = result.data || [];
  const [comparedPlayerID, setComparedPlayerID] = useState(null);

  const groupedPredictions = predictions.reduce((acc, prediction) => {
    const weekLabel = prediction.scored_week
      ? `Week ${prediction.scored_week}`
      : "Unscored";
    if (!acc[weekLabel]) acc[weekLabel] = [];
    acc[weekLabel].push(prediction);
    return acc;
  }, {});

  return (
    <Dialog
      open={currentPlayerID !== null}
      onOpenChange={() => setCurrentPlayerID(null)}
    >
      <DialogContent className="bg-gray-100 sm:max-w-2xl">
        <DialogHeader>
          <div className="flex justify-between">
            <DialogTitle className={"flex items-center justify-between"}>
              {t("leaderboard.viewing_predictions", { name: playerName })}
            </DialogTitle>
            <Button
              variant="outline"
              className={
                "mr-8 border rounded p-1 bg-blue-600 text-white hover:bg-blue-400"
              }
              onClick={() => {
                setComparedPlayerID(currentPlayerID);
              }}
            >
              {t("leaderboard.compare")}
            </Button>
          </div>
          <DialogDescription asChild>
            <div className="flex flex-col gap-3 mt-4 overflow-y-auto max-h-[60vh] p-1">
              {result.isLoading && <Spinner />}
              {result.data?.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  {t("leaderboard.no_predictions")}
                </div>
              )}

              {Object.entries(groupedPredictions).map(
                ([weekLabel, weekMatches]) => (
                  <div key={weekLabel} className="mb-6 last:mb-0">
                    <h3 className="font-bold text-lg text-gray-700 mb-3 border-b pb-1 sticky top-0 bg-gray-100 z-10">
                      {weekLabel}
                    </h3>
                    <div className="flex flex-col gap-3">
                      {weekMatches.map((prediction) => {
                        const actualScore =
                          prediction.home_score !== null &&
                          prediction.away_score !== null
                            ? `${prediction.home_score} - ${prediction.away_score}`
                            : t("leaderboard.tbd");
                        const predScore =
                          prediction.home_pred !== null &&
                          prediction.away_pred !== null
                            ? `${prediction.home_pred} - ${prediction.away_pred}`
                            : t("leaderboard.na");
                        const badgeColor =
                          prediction.points > 0
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500";

                        // Responsive Mobile Layout Matrix applied cleanly here inside the loop:
                        return (
                          <div
                            key={`pred-row-${prediction.id}`}
                            className="flex flex-col gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-3"
                          >
                            {/* 1. Teams Block */}
                            <div className="font-semibold text-gray-800 text-center sm:text-left sm:flex-[2] sm:truncate sm:pr-2">
                              {prediction.home_team}
                              <span className="text-gray-400 font-normal text-xs mx-2">
                                vs
                              </span>
                              {prediction.away_team}
                            </div>

                            {/* 2. Score Metrics Grid */}
                            <div className="flex justify-center gap-6 text-sm sm:flex-[2]">
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                                  {t("leaderboard.actual")}
                                </span>
                                <span className="font-bold text-gray-700">
                                  {actualScore}
                                </span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                                  {t("leaderboard.predicted")}
                                </span>
                                <span className="font-semibold text-blue-600">
                                  {predScore}
                                </span>
                              </div>
                            </div>

                            {/* 3. Points Badge Anchor */}
                            <div className="flex justify-center sm:flex-1 sm:justify-end">
                              <span
                                className={`px-3 py-1 rounded text-xs font-bold w-full text-center sm:w-auto ${badgeColor}`}
                              >
                                +{prediction.points} {t("leaderboard.pts")}
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
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
      <CompareModal
        comparedPlayerID={comparedPlayerID}
        setComparedPlayerID={setComparedPlayerID}
        currentWeek={currentWeek}
        leagueID={leagueID}
        comparedPlayerName={playerName}
      />
    </Dialog>
  );
}

function CompareModal({
  comparedPlayerID,
  setComparedPlayerID,
  comparedPlayerName,
  currentWeek,
  leagueID,
}) {
  const { t } = useTranslation();
  const [opponentID, setOpponentID] = useState(null);

  // Fetch the main player's data
  const ownerQuery = useQuery({
    queryKey: ["predictions", comparedPlayerID, currentWeek],
    queryFn: () =>
      getPlayerPredictions(leagueID, comparedPlayerID, currentWeek),
    enabled: comparedPlayerID !== null,
  });

  // Fetch all players in the league for the dropdown list
  const playersQuery = useQuery({
    queryKey: ["players", leagueID],
    queryFn: () => getPlayersLeaderboard(leagueID),
    enabled: comparedPlayerID !== null,
  });

  // Fetch the selected opponent's data
  const opponentQuery = useQuery({
    queryKey: ["predictions", opponentID, currentWeek],
    queryFn: () => getPlayerPredictions(leagueID, opponentID, currentWeek),
    enabled: opponentID !== null,
  });

  const ownerData = ownerQuery.data || [];
  const opponentData = opponentQuery.data || [];
  const playerList = playersQuery.data || [];

  return (
    <Dialog
      open={comparedPlayerID !== null}
      onOpenChange={() => {
        setComparedPlayerID(null);
        setOpponentID(null); // Reset choice on exit
      }}
    >
      <DialogContent className="bg-gray-100 sm:max-w-2xl max-h-[85vh] flex flex-col justify-between">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-gray-800">
            {t("leaderboard.compare_predictions")}
          </DialogTitle>
        </DialogHeader>

        {/* Top Header Selector Row */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center text-center p-3 bg-white rounded-lg border border-gray-200 shadow-sm mx-4 my-2">
          <div className="font-bold text-base text-blue-600 truncate px-2">
            {comparedPlayerName}
          </div>
          <div className="text-xs font-black tracking-widest text-gray-400 bg-gray-100 px-2 py-1 rounded">
            VS
          </div>
          <div className="flex justify-center">
            <Select
              value={opponentID || ""}
              onValueChange={(value) => setOpponentID(value)}
            >
              <SelectTrigger className="w-[170px] bg-gray-50 h-9 font-medium text-sm">
                <SelectValue placeholder={t("leaderboard.selectComparee")} />
              </SelectTrigger>
              <SelectContent>
                {/* Filter out the main player so they can't select themselves */}
                {playerList
                  .filter((p) => p.id !== comparedPlayerID)
                  .map((player) => (
                    <SelectItem
                      key={`player-selector-${player.id}`}
                      value={String(player.id)}
                    >
                      {player.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content Body Area */}
        <div className="flex-1 overflow-y-auto px-4 py-2 mt-2 max-h-[55vh] flex flex-col gap-4">
          {opponentID === null ? (
            <div className="text-center text-sm text-gray-400 my-12 italic">
              {t(
                "leaderboard.choose_opponent_prompt",
                "Select an opponent to begin head-to-head comparison",
              )}
            </div>
          ) : opponentQuery.isLoading ? (
            <div className="flex justify-center items-center my-12">
              <Spinner />
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 gap-y-3 items-center text-center">
              {ownerData.map((match) => {
                // Find the exact matching game by ID instead of array index
                const oppMatch = opponentData.find((m) => m.id === match.id);

                const actualScore =
                  match.home_score !== null && match.away_score !== null
                    ? `${match.home_score} - ${match.away_score}`
                    : t("leaderboard.tbd");

                const ownerPred = `${match.home_pred} - ${match.away_pred}`;
                const oppPred =
                  oppMatch !== undefined
                    ? `${oppMatch.home_pred} - ${oppMatch.away_pred}`
                    : t("leaderboard.na");

                const ownerPoints = match.points || 0;
                const oppPoints = oppMatch?.points || 0;

                const ownerWon = ownerPoints > oppPoints;
                const oppWon = oppPoints > ownerPoints;

                return (
                  <Fragment key={`comp-row-${match.id}`}>
                    {/* Game Row Header Label spanning all 3 columns */}
                    <div className="col-span-3 text-[11px] font-black text-gray-400 uppercase tracking-wider mt-4 border-b border-gray-200/60 pb-1 text-left">
                      {match.home_team}{" "}
                      <span className="font-normal lowercase text-gray-400/80 mx-1">
                        vs
                      </span>{" "}
                      {match.away_team}
                    </div>

                    {/* Left: Player A (Main Player) Guess */}
                    <div
                      className={`p-2.5 rounded-xl border text-sm flex flex-col items-center justify-center bg-white ${
                        ownerWon
                          ? "border-green-500 bg-green-50/40 shadow-sm ring-1 ring-green-400/20"
                          : "border-gray-200"
                      }`}
                    >
                      <span className="font-bold text-gray-800">
                        {ownerPred}
                      </span>
                      <span
                        className={`text-[10px] font-black mt-0.5 ${ownerWon ? "text-green-600" : "text-gray-400"}`}
                      >
                        +{ownerPoints} {t("leaderboard.pts")}
                      </span>
                    </div>

                    {/* Center: Actual Match Score Line */}
                    <div className="flex flex-col items-center justify-center min-w-[70px]">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                        {t("leaderboard.actual")}
                      </span>
                      <span className="text-xs font-black text-gray-600 bg-gray-200/70 px-2 py-1 rounded-md min-w-[50px]">
                        {actualScore}
                      </span>
                    </div>

                    {/* Right: Player B (Selected Opponent) Guess */}
                    <div
                      className={`p-2.5 rounded-xl border text-sm flex flex-col items-center justify-center bg-white ${
                        oppWon
                          ? "border-green-500 bg-green-50/40 shadow-sm ring-1 ring-green-400/20"
                          : "border-gray-200"
                      }`}
                    >
                      <span className="font-bold text-gray-800">{oppPred}</span>
                      <span
                        className={`text-[10px] font-black mt-0.5 ${oppWon ? "text-green-600" : "text-gray-400"}`}
                      >
                        +{oppPoints} {t("leaderboard.pts")}
                      </span>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default Leaderboard;
