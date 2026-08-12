import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function GoogleSuccess() {
  const navigate = useNavigate();
  const { fetchUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) {
      navigate("/login?error=google_auth_failed");
      return;
    }
    fetchUser()
      .then(() => navigate("/"))
      .catch(() => navigate("/login"));
  }, [navigate, fetchUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold">Logging you in...</h2>
      </div>
    </div>
  );
}
