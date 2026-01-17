import axios from "axios";

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const upload = (url, data, responseType = 'blob', config = {}) =>
  axios.post(`${API_BASE_URL}/api/pdf/${url}`, data, {
    responseType: responseType,
    ...config,
  });
