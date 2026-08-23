import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Navbar from "./components/Navbar";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Mentors = lazy(() => import("./pages/Mentors"));
const AIDashboard = lazy(() => import("./pages/AIDashboard"));
const WeeklyReviewPage = lazy(() => import("./pages/WeeklyReviewPage"));
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
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {isAuthenticated && <Navbar />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
          <Route path="/auth/google/success" element={<GoogleSuccess />} />
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/studysphereai" element={isAuthenticated ? <AIDashboard /> : <Navigate to="/login" />} />
          <Route path="/weekly-reviews" element={isAuthenticated ? <WeeklyReviewPage /> : <Navigate to="/login" />} />
          <Route path="/mentors" element={isAuthenticated ? <Mentors /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
