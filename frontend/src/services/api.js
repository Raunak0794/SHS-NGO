import axios from "axios";

const API = "http://localhost:3000/api";

export const apiClient = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ================= AUTH ENDPOINTS =================
export const register = (userData) => apiClient.post("/auth/register", userData);
export const login = (credentials) => apiClient.post("/auth/login", credentials);
export const logout = () => apiClient.post("/auth/logout");
export const getMe = () => apiClient.get("/auth/me");

// ================= DASHBOARD =================
export const getDashboard = () => apiClient.get("/dashboard");
export const completeGoal = (id) => apiClient.post(`/dashboard/goals/${id}/complete`);

// ================= AI =================
export const getAIDashboard = () => apiClient.get("/ai/dashboard");
export const uploadMaterial = (formData) =>
  apiClient.post("/ai/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

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
export const uploadStudyMaterial = (formData) =>
  apiClient.post("/study/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
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