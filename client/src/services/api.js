import axios from "axios";
const API_URL = import.meta.env.VITE_API_BASE_URL;

// Create a base instance
export const api = axios.create({
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

export const initializeWeeksAPI = async (league_id) => {
  const response = await api.put(`/leagues/${league_id}/weeks`);
  return response.data;
};

export const getWeeks = async (league_id) => {
  const response = await api.get(`/leagues/${league_id}/weeks`);
  return response.data;
};

export const getScoredWeeks = async (league_id) => {
  const response = await api.get(`/leaderboards/${league_id}/weeks`, {
    params: {
      type: "scored",
    },
  });
  return response.data;
};

export const fetchAllScores = async (league_id) => {
  const response = await api.put(`/leagues/${league_id}/matches/`);
  return response.data;
};

export const autofillPredictionsAPI = async (league_id) => {
  const response = await api.post(`/leagues/${league_id}/predictions:autofill`);
  return response.data;
};

export const loginAdmin = async (username, password) => {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  // Using your axios 'api' instance
  const response = await api.post("/api/admin/login", formData, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  // Axios automatically parses the JSON for us
  const data = response.data;

  // Notice the exact camelCase key to match your interceptor!
  localStorage.setItem("adminToken", data.access_token);

  return data;
};

export const getMatches = async (leagueID, isUnset, weeknum) => {
  const response = await api.get(`/leagues/${leagueID}/matches`, {
    params: {
      unset: isUnset,
      week: weeknum,
    },
  });
  return response.data;
};

export const sendUnsetFix = async (leagueID, payload) => {
  const response = await api.patch(`/leagues/${leagueID}/fix`, payload, {
    params: { type: "unsetMatches" },
  });
  return response.data;
};

export const getPlayerPredictions = async (leagueID, playerID, weekNum) => {
  const response = await api.get(`/predictions/${leagueID}`, {
    params: { player_id: playerID, week_num: weekNum },
  });
  return response.data;
};

export const getStagingMatches = async (league_id) => {
  const response = await api.get(`/leagues/${league_id}/staging-matches`);
  return response.data;
};

export const initializeWeeksDeltaAPI = async (league_id) => {
  const response = await api.put(`/leagues/${league_id}/weeks-delta`);
  return response.data;
};

export const initializeMatchesDeltaAPI = async (league_id) => {
  const response = await api.put(`/leagues/${league_id}/matches-delta`);
  return response.data;
};

