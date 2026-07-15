import LeagueList from "./my_components/leagues/LeagueList";
import LeagueDetail from "./my_components/leagues/LeagueDetail";
import ScrapingOverview from "./my_components/leagues/ScrapingOverview";
import CustomBetsOverview from "./my_components/leagues/CustomBetsOverview";

import LeaderboardList from "./my_components/leaderboard/LeaderboardList";
import Leaderboard from "./my_components/leaderboard/Leaderboard";

import { Routes, Route } from "react-router-dom";
import WeekOverview from "./my_components/leagues/WeekOverview";
import LoginPage from "./my_components/admin/LoginPage";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useTranslation } from "react-i18next";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-100 p-6">
        <main className="max-w-4xl mx-auto">
          <Routes>
            <Route path="/leagues" element={<LeagueList />} />
            <Route path="/leagues/:id" element={<LeagueDetail />} />
            <Route path="/leagues/:id/scrape" element={<ScrapingOverview />} />
            <Route path="/leagues/:id/weeks" element={<WeekOverview />} />
            <Route path="/leagues/:id/custom-bets" element={<CustomBetsOverview />} />

            <Route path="/" element={<LeaderboardList />} />
            <Route path="/leaderboard/:id" element={<Leaderboard />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </main>
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
