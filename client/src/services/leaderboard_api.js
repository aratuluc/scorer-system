import { api } from "./api";

export const getLeaderboardTitle = async (league_id) => {
  const res = await api.get(`/leaderboards/${league_id}/title`);
  return res.data;
};
