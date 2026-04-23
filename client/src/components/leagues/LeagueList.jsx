import { useEffect, useState } from "react";
import { getLeagues } from "../../services/api";
import CreateLeagueModal from "./CreateLeagueModal";
import { Link } from "react-router-dom";
import Header from "../common/Header";

function LeagueList() {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    getLeagues()
      .then(setLeagues)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // This function is passed down to the child
  const handleLeagueCreated = (newLeague) => {
    // Optimistically update the list without refreshing the page
    setLeagues([...leagues, newLeague]);
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4 relative">
      <Header title={"Admin Panel"} />
      <h2 className="text-2xl font-bold mb-4">Leagues</h2>

      <div className="grid gap-4">
        {leagues.map((league) => (
          // 2. Change div to Link
          <Link
            to={`/leagues/${league.id}`} // Dynamic URL construction
            key={league.id}
            className="block group" // 'group' allows us to style children on hover
          >
            <div className="border p-4 rounded shadow bg-white transition group-hover:shadow-md group-hover:border-blue-300 cursor-pointer">
              <h3 className="font-semibold text-lg text-gray-800 group-hover:text-blue-600">
                {league.name}{" "}
                <span className="text-gray-500 text-sm">
                  ({league.start_year})
                </span>
              </h3>
            </div>
          </Link>
        ))}

        {/* The "Add" Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="border p-2 rounded shadow bg-green-50 text-green-800 hover:bg-green-100 flex flex-col items-center justify-center border-green-200"
        >
          <span className="text-2lg font-bold">+</span>
          <span>Add New League</span>
        </button>
      </div>

      {/* Render the Modal conditionally */}
      {isModalOpen && (
        <CreateLeagueModal
          onClose={() => setIsModalOpen(false)}
          onLeagueCreated={handleLeagueCreated}
        />
      )}
    </div>
  );
}

export default LeagueList;
