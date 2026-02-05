import LeagueList from "./components/LeagueList";
import LeagueDetail from "./components/LeagueDetail";
import LeaderboardList from "./components/LeaderboardList";
import Leaderboard from "./components/Leaderboard";
import { Routes, Route } from "react-router-dom";
import { Link } from "react-router-dom";
function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <main className="max-w-4xl mx-auto">
        <Routes>
          <Route path="/leagues" element={<LeagueList />} />
          <Route path="/leagues/:id" element={<LeagueDetail />} />
          <Route path="/" element={<LeaderboardList />} />
          <Route path="/leaderboard/:id" element={<Leaderboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
