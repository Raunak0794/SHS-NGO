import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { requestPasswordReset } from "../services/api";

function getErrorMessage(error) {
  return (
    error.response?.data?.errors?.[0]?.msg ||
    error.response?.data?.message ||
    "Could not request a password reset. Please try again."
  );
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewResetUrl, setPreviewResetUrl] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setPreviewResetUrl("");

    try {
      const response = await requestPasswordReset(email.trim());
      setMessage(
        response.data?.message ||
        "If an account exists for that email, a password reset link has been sent."
      );
      setPreviewResetUrl(response.data?.previewResetUrl || "");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <Mail className="h-6 w-6 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Forgot your password?</h1>
          <p className="mt-2 text-gray-500">
            Enter your account email and we’ll send you a secure reset link.
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-lg bg-green-50 p-3 text-sm text-green-700" role="status">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
            <input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-300 p-3 pl-10 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 p-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Sending reset link..." : "Send reset link"}
          </button>
        </form>

        {previewResetUrl && (
          <a
            href={previewResetUrl}
            className="mt-4 block rounded-lg border border-indigo-200 p-3 text-center text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            Open development reset link
          </a>
        )}

        <Link
          to="/login"
          className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    </div>
  );
}
