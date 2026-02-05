import { useEffect, useState } from "react";
import Header from "./Header";
import { Link } from "react-router-dom";
import { getLeagues } from "../services/api";

function LeaderboardList() {
  const [leagues, setLeagues] = useState([]);

  useEffect(() => {
    getLeagues()
      .then(setLeagues)
      .catch((err) => console.log(err));
  }, []);

  return (
    <div className="p-4 relative">
      <Header title={"Overview"} />
      <main className="grid gap-4 bg-gray-200 p-4 rounded">
        {leagues.map((league) => (
          <Link className="block group" to={`/leaderboard/${league.id}`}>
            <div className="border bg-gray-100 rounded p-3 shadow transition group-hover:shadow-md group-hover:border-blue-300 cursor-pointer">
              <h3 className="font-bold text-xl">
                {league.name}{" "}
                <span className="text-gray-500 text-sm">
                  ({league.start_year})
                </span>
              </h3>
            </div>
          </Link>
        ))}
      </main>
    </div>
  );
}
export default LeaderboardList;
