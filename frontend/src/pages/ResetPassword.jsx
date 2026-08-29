import { useState } from "react";
import { Eye, EyeOff, KeyRound, Lock } from "lucide-react";
import { resetPassword, setAuthToken } from "../services/api";

function getErrorMessage(error) {
  return (
    error.response?.data?.errors?.[0]?.msg ||
    error.response?.data?.message ||
    "Could not reset your password. Please try again."
  );
}

export default function ResetPassword() {
  const [token] = useState(() => {
    const resetToken = new URLSearchParams(window.location.search).get("token") || "";
    window.history.replaceState({}, "", window.location.pathname);
    return resetToken;
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(token ? "" : "This password reset link is invalid.");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (
      password.length < 8 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setError("Use at least 8 characters with uppercase, lowercase, and a number.");
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword(token, password);
      setAuthToken(null);
      setSuccess(response.data?.message || "Password reset successfully.");
      setPassword("");
      setConfirmPassword("");
    } catch (resetError) {
      setError(getErrorMessage(resetError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <KeyRound className="h-6 w-6 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create a new password</h1>
          <p className="mt-2 text-gray-500">
            Your reset link can only be used once and expires automatically.
          </p>
        </div>

        {success ? (
          <div className="space-y-5">
            <div className="rounded-lg bg-green-50 p-4 text-center text-green-700" role="status">
              {success}
            </div>
            <a
              href="/login"
              className="block w-full rounded-lg bg-indigo-600 p-3 text-center font-semibold text-white transition hover:bg-indigo-700"
            >
              Continue to login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-700">
                New password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                <input
                  id="new-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-3 pl-10 pr-11 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-3 text-gray-500"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-gray-700">
                Confirm new password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-3 pl-10 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  required
                />
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Use at least 8 characters, including uppercase, lowercase, and a number.
            </p>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full rounded-lg bg-indigo-600 p-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Resetting password..." : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
