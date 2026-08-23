import axios from "axios";

const AUTH_TOKEN_STORAGE_KEY = "shs_auth_token";
const DEV_BACKEND_ORIGIN = "http://localhost:5000";
const trimTrailingSlash = (value) => String(value || "").trim().replace(/\/+$/, "");
const explicitApiUrl = trimTrailingSlash(import.meta.env.VITE_API_URL);
const explicitBackendUrl = trimTrailingSlash(import.meta.env.VITE_BACKEND_URL);
const explicitDevApiUrl = trimTrailingSlash(import.meta.env.VITE_DEV_API_URL);
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 8000);

export const API_BASE_URL =
  import.meta.env.DEV
    ? explicitDevApiUrl || `${DEV_BACKEND_ORIGIN}/api`
    : explicitApiUrl || "/api";

export const BACKEND_ORIGIN = API_BASE_URL.startsWith("http")
  ? API_BASE_URL.replace(/\/api\/?$/, "")
  : explicitBackendUrl || window.location.origin;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
});

export const getAuthToken = () => {
  try {
    if (typeof window !== "undefined") {
      const storedToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (storedToken) {
        return storedToken;
      }

      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.split('=')[1];

      return token ? decodeURIComponent(token) : null;
    }
  } catch {
    return null;
  }

  return null;
};

export const setAuthToken = (token) => {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
};

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  const headers = config.headers || {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!(config.data instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  } else {
    delete headers["Content-Type"];
  }

  config.headers = headers;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window === "undefined") {
      return Promise.reject(error);
    }

    const isLoginPage = window.location.pathname.includes("/login");
    const isRegisterPage = window.location.pathname.includes("/register");
    const isAuthRequest =
      error.config?.url?.includes("/auth/login") ||
      error.config?.url?.includes("/auth/register") ||
      error.config?.url?.includes("/auth/me");

    if (
      error.response?.status === 401 &&
      !isLoginPage &&
      !isRegisterPage &&
      !isAuthRequest &&
      !error.config?.headers?.["Content-Type"]?.includes("multipart/form-data")
    ) {
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// ================= AUTH ENDPOINTS =================
export const register = (userData) => apiClient.post("/auth/register", userData);
export const login = (credentials) => {
  const payload = credentials?.identifier
    ? { identifier: credentials.identifier, password: credentials.password }
    : {
        username: credentials?.username,
        email: credentials?.email,
        password: credentials?.password,
      };

  return apiClient.post("/auth/login", payload);
};
export const logout = () => apiClient.post("/auth/logout");
export const getMe = () => apiClient.get("/auth/me");

// ================= DASHBOARD =================
export const getDashboard = () => apiClient.get("/dashboard");
export const completeGoal = (id) => apiClient.post(`/dashboard/goals/${id}/complete`);

// ================= AI =================
export const getAIDashboard = () => apiClient.get("/ai/dashboard");
export const uploadMaterial = (formData) => apiClient.post("/ai/upload", formData);

// ================= MICRO-GOALS =================
export const generateMicroGoals = (goalId, numMicroGoals = 5) =>
  apiClient.post("/microgoals/generate", { goalId, numMicroGoals });

export const getMicroGoals = (goalId) => apiClient.get(`/microgoals/goal/${goalId}`);
export const getAllMicroGoals = () => apiClient.get("/microgoals/all");
export const updateMicroGoal = (microGoalId, data) =>
  apiClient.put(`/microgoals/${microGoalId}`, data);

// ================= WEEKLY REVIEW =================
export const generateWeeklyReview = (moodRating) =>
  apiClient.post("/microgoals/weekly-review/generate", { moodRating });
export const getWeeklyReviews = () => apiClient.get("/microgoals/weekly-review/all");

// ================= STUDY =================
export const createStudySession = (data) => apiClient.post("/study/create", data);
export const getAllStudySessions = () => apiClient.get("/study/sessions");
export const getStudySession = (sessionId) => apiClient.get(`/study/${sessionId}`);
export const uploadStudyMaterial = (formData) => apiClient.post("/study/upload", formData);
export const generateSummary = (sessionId) => apiClient.post(`/study/${sessionId}/summary`);
export const generateQuestions = (sessionId, numQuestions = 5, difficulty = "intermediate") =>
  apiClient.post(`/study/${sessionId}/questions`, { numQuestions, difficulty });
export const generateLearningPath = (sessionId) => apiClient.post(`/study/${sessionId}/learning-path`);
export const submitQuizAnswer = (sessionId, questionId, userAnswer) =>
  apiClient.post("/study/submit-answer", { sessionId, questionId, userAnswer });
export const updateLearningPathProgress = (sessionId, stepNumber) =>
  apiClient.put(`/study/${sessionId}/progress`, { stepNumber });

// ================= CALENDAR =================
export const getGoogleAuthUrl = () => apiClient.get("/auth/google/url");
export const syncMicroGoalToCalendar = (microGoalId, deadline, title, description) =>
  apiClient.post("/calendar/sync-microgoal", { microGoalId, deadline, title, description });
export const removeMicroGoalFromCalendar = (microGoalId) =>
  apiClient.delete(`/calendar/${microGoalId}`);
export const getCalendarEvents = (timeMin, timeMax) =>
  apiClient.get("/calendar/events", { params: { timeMin, timeMax } });
export const syncAllMicroGoalsToCalendar = () => apiClient.post("/calendar/sync-all");

export default apiClient;
