import axios from "axios";
const API_URL = import.meta.env.VITE_API_BASE_URL;

// Create a base instance
const api = axios.create({
  baseURL: API_URL, // Your FastAPI URL
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
  const response = await api.post(`/leagues/${league_id}/links`);
  return response.data;
};
export const deleteLink = async () => {
  await api.delete(`/leagues/links/${league_id}`);
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
