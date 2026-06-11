import { api } from "./api";

export const getLeaderboardTitle = async (league_id) => {
  const res = await api.get(`/leaderboards/${league_id}/title`);
  return res.data;
};

export const rebuildEntireLeaderboard = async (league_id) => {
  const res = await api.post(`/leagues/${league_id}/recalculate-all`);
  return res.data;
};

export const getMaxScoredWeek = async (league_id) => {
  const res = await api.get(`/leaderboards/${league_id}/max-week`);
  return res.data;
};
