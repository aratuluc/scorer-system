import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getLeaderboard, getLinks } from "../../services/api";
import Header from "../common/Header";
import Card from "../common/Card";
import LeaderboardPlayer from "./LeaderboardPlayer";

function Leaderboard() {
  const { id } = useParams();
  const [links, setLinks] = useState([]);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    getLeaderboard(id, 0).then(setPlayers);
  }, [id]);

  return (
    <>
      <Header title={`League ${id}`} />
      <Card>
        <div className="flex flex-col gap-2">
          {players.length != 0 &&
            players.map((player, index) => (
              <LeaderboardPlayer
                key={player.name}
                playerData={player}
                rank={index}
              />
            ))}
        </div>
      </Card>
    </>
  );
}

export default Leaderboard;
