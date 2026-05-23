import LeagueList from "./my_components/leagues/LeagueList";
import LeagueDetail from "./my_components/leagues/LeagueDetail";
import ScrapingOverview from "./my_components/leagues/ScrapingOverview";

import LeaderboardList from "./my_components/leaderboard/LeaderboardList";
import Leaderboard from "./my_components/leaderboard/Leaderboard";

import { Routes, Route } from "react-router-dom";
import WeekOverview from "./my_components/leagues/WeekOverview";

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <main className="max-w-4xl mx-auto">
        <Routes>
          <Route path="/leagues" element={<LeagueList />} />
          <Route path="/leagues/:id" element={<LeagueDetail />} />
          <Route path="/leagues/:id/scrape" element={<ScrapingOverview />} />
          <Route path="/leagues/:id/weeks" element={<WeekOverview />} />

          <Route path="/" element={<LeaderboardList />} />
          <Route path="/leaderboard/:id" element={<Leaderboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
