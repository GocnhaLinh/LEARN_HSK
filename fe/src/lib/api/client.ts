import axios, { AxiosError } from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30_000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string | string[] }>) => {
    const status = error.response?.status;
    const rawMsg = error.response?.data?.message;
    const detail = Array.isArray(rawMsg)
      ? rawMsg.join(", ")
      : rawMsg || error.message || "Network error";
    return Promise.reject(
      new Error(status ? `API ${status}: ${detail}` : detail),
    );
  },
);

export default apiClient;
