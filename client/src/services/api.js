import axios from "axios";
const API_URL = import.meta.env.VITE_API_BASE_URL;

// Create a base instance
const api = axios.create({
  baseURL: API_URL, // Your FastAPI URL
});

api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem("adminToken");

  if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }
  return config;
});

export const getLeagues = async () => {
  const response = await api.get("/leagues/");
  return response.data;
};

export const getLeague = async (league_id) => {
  const response = await api.get(`/leagues/${league_id}`);
  return response.data;
};

export const createLeague = async (leagueData) => {
  const response = await api.post("/leagues/", leagueData);
  return response.data;
};

export const getLinks = async (league_id) => {
  const response = await api.get(`/leagues/${league_id}/links`);
  return response.data;
};
export const addLink = async (league_id, linkData) => {
  const response = await api.post(`/leagues/${league_id}/links`, linkData);
  return response.data;
};

export const deleteLink = async (id, league_id) => {
  const response = await api.delete(`/leagues/${league_id}/links/${id}`);
  return response.data;
};

export const uploadLeagueCSV = async (leagueId, weeknum, fileObject) => {
  const formData = new FormData();

  formData.append("file", fileObject);

  const response = await api.post(
    `/leagues/${leagueId}/upload/${weeknum}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
};

export const getPlayers = async (league_id) => {
  const response = await api.get(`/leagues/${league_id}/players`);
  return response.data;
};
export const addPlayer = async (league_id, player_data) => {
  const response = await api.post(`/leagues/${league_id}/players`, player_data);
  return response.data;
};
export const editPlayer = async (league_id, player_id, player_data) => {
  const response = await api.patch(
    `/leagues/${league_id}/players/${player_id}`,
    player_data,
  );
  return response.data;
};
export const deletePlayer = async (league_id, player_id) => {
  await api.delete(`/leagues/${league_id}/players/${player_id}`);
};

export const sendUnknownFix = async (league_id, fix_data) => {
  const response = await api.put(`/leagues/${league_id}/predictions`, fix_data);
  return response.data;
};

export const initializeLeague = async (league_id) => {
  const response = await api.put(`/leagues/${league_id}/matches`);
  return response.data;
};

export const finalizePredictions = async (league_id) => {
  const response = await api.post(`/leagues/${league_id}/predictions`);
  return response.data;
};

export const getLeaderboard = async (league_id, weeknum) => {
  const response = await api.get(`/leaderboards/${league_id}`, {
    params: { week: weeknum },
  });
  return response.data;
};
