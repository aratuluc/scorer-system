import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  getLeaderboard,
  getScoredWeeks,
  getPlayerPredictions,
} from "@/services/api";
import { getLeaderboardTitle } from "@/services/leaderboard_api";
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

function Leaderboard() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [players, setPlayers] = useState([]);
  const [currentPlayerID, setCurrentPlayerID] = useState(null);

  // Sync state cleanly with the URL query structure tracking
  const currentWeek = parseInt(searchParams.get("week") || "0", 10);

  useEffect(() => {
    if (!id) return;

    getLeaderboard(id, currentWeek)
      .then((data) => {
        console.log("Database payload loaded successfully:", data);
        setPlayers(data || []);
      })
      .catch((err) => {
        console.error("Network interface connection failure:", err);
      });
  }, [id, currentWeek]);

  const { data: scoredWeeks = [] } = useQuery({
    queryKey: ["scoredWeeks", id],
    queryFn: () => getScoredWeeks(id),
  });

  const first = players[0];
  const second = players[1];
  const third = players[2];
  const remainingPlayers = players.slice(3);

  // Updates the browser address parameters when a new option is clicked
  const handleWeekChange = (value) => {
    setSearchParams({ week: value });
  };

  const selectedPlayer = players.find(
    (player) => player.id === currentPlayerID,
  );

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
            {/* Provide a global view entry fallback anchor */}
            <SelectItem value="0">{t("leaderboard.overall")}</SelectItem>
            {scoredWeeks.map((week) => {
              const weekStr = String(week.week_num);
              return (
                <SelectItem value={weekStr} key={`week-option-${week.id}`}>
                  {t("leaderboard.week")} {weekStr}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {players && players.length >= 3 ? (
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
        playerName={selectedPlayer?.player_name}
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

  const groupedPredictions = predictions.reduce((acc, prediction) => {
    const weekLabel = prediction.scored_week
      ? `Week ${prediction.scored_week}`
      : "Unscored";
    if (!acc[weekLabel]) acc[weekLabel] = [];
    acc[weekLabel].push(prediction);
    return acc;
  }, {});

  return (
    <div
      key={`pred-row-${prediction.id}`}
      className="flex flex-col gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-3"
    >
      {/* 1. Teams Section: Left-aligned, breaks cleanly or takes full row width on mobile */}
      <div className="font-semibold text-gray-800 text-center sm:text-left sm:flex-[2] sm:truncate sm:pr-2">
        {prediction.home_team}
        <span className="text-gray-400 font-normal text-xs mx-2">vs</span>
        {prediction.away_team}
      </div>

      {/* 2. Scores Display Matrix: Well-spaced layout section */}
      <div className="flex justify-center gap-6 text-sm sm:flex-[2]">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">
            {t("leaderboard.actual")}
          </span>
          <span className="font-bold text-gray-700">{actualScore}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">
            {t("leaderboard.predicted")}
          </span>
          <span className="font-semibold text-blue-600">{predScore}</span>
        </div>
      </div>

      {/* 3. Points Allocation Badge: Centers on mobile, right-aligns on desktop */}
      <div className="flex justify-center sm:flex-1 sm:justify-end">
        <span
          className={`px-3 py-1 rounded text-xs font-bold w-full text-center sm:w-auto ${badgeColor}`}
        >
          +{prediction.points} {t("leaderboard.pts")}
        </span>
      </div>
    </div>
  );
}

export default Leaderboard;
