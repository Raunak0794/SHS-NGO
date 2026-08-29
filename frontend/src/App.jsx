import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Navbar from "./components/Navbar";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Home = lazy(() => import("./pages/Home"));
const AITutorPage = lazy(() => import("./pages/AITutorPage"));
const SubjectsPage = lazy(() => import("./pages/SubjectsPage"));
const MaterialsPage = lazy(() => import("./pages/MaterialsPage"));
const PracticeHubPage = lazy(() => import("./pages/PracticeHubPage"));
const StudyPlanPage = lazy(() => import("./pages/StudyPlanPage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const Mentors = lazy(() => import("./pages/Mentors"));
const GoogleSuccess = lazy(() => import("./pages/GoogleSuccess"));

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold text-sm">Loading SHS AI Copilot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-sans antialiased">
      {isAuthenticated && <Navbar />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/google/success" element={<GoogleSuccess />} />

          {/* Core Student Application Routes */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
          <Route path="/dashboard" element={isAuthenticated ? <Home /> : <Navigate to="/login" />} />
          <Route path="/tutor" element={isAuthenticated ? <AITutorPage /> : <Navigate to="/login" />} />
          <Route path="/chat" element={isAuthenticated ? <AITutorPage /> : <Navigate to="/login" />} />
          <Route path="/studysphereai" element={isAuthenticated ? <AITutorPage /> : <Navigate to="/login" />} />
          <Route path="/subjects" element={isAuthenticated ? <SubjectsPage /> : <Navigate to="/login" />} />
          <Route path="/materials" element={isAuthenticated ? <MaterialsPage /> : <Navigate to="/login" />} />
          <Route path="/practice" element={isAuthenticated ? <PracticeHubPage /> : <Navigate to="/login" />} />
          <Route path="/plan" element={isAuthenticated ? <StudyPlanPage /> : <Navigate to="/login" />} />
          <Route path="/weekly-reviews" element={isAuthenticated ? <StudyPlanPage /> : <Navigate to="/login" />} />
          <Route path="/progress" element={isAuthenticated ? <ProgressPage /> : <Navigate to="/login" />} />
          <Route path="/settings" element={isAuthenticated ? <SettingsPage /> : <Navigate to="/login" />} />
          <Route path="/mentors" element={isAuthenticated ? <Mentors /> : <Navigate to="/login" />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
