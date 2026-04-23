import LeagueList from "./components/leagues/LeagueList";
import LeagueDetail from "./components/leagues/LeagueDetail";
import ScrapingOverview from "./components/leagues/ScrapingOverview";

import LeaderboardList from "./components/leaderboard/LeaderboardList";
import Leaderboard from "./components/leaderboard/Leaderboard";

import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <main className="max-w-4xl mx-auto">
        <Routes>
          <Route path="/leagues" element={<LeagueList />} />
          <Route path="/leagues/:id" element={<LeagueDetail />} />
          <Route path="/leagues/:id/scrape" element={<ScrapingOverview />} />

          <Route path="/" element={<LeaderboardList />} />
          <Route path="/leaderboard/:id" element={<Leaderboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
