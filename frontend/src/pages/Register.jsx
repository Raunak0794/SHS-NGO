import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { username, firstName, lastName, email, password } = formData;
    if (!username || !firstName || !lastName || !email || !password) {
      setError("All fields are required");
      setLoading(false);
      return;
    }
    const result = await register(username, email, password, firstName, lastName);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleGoogleLogin = () => {
    window.open("http://localhost:3000/auth/google", "_self");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="bg-white rounded-xl shadow-md w-full max-w-md p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Create Your Account</h2>
        <p className="text-gray-600 mb-6">Join the school portal and start learning</p>
        {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input name="username" value={formData.username} onChange={handleChange} placeholder="Username" className="w-full p-3 pl-10 border rounded-lg" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First Name" className="w-full p-3 pl-10 border rounded-lg" required />
            </div>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last Name" className="w-full p-3 pl-10 border rounded-lg" required />
            </div>
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full p-3 pl-10 border rounded-lg" required />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} placeholder="Password" className="w-full p-3 pl-10 pr-10 border rounded-lg" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50">
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>
        <div className="my-4 text-center text-sm text-gray-600">or continue with</div>
        <button onClick={handleGoogleLogin} className="w-full border py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>
        <p className="text-center mt-4 text-sm text-gray-700">
          Already have an account? <Link to="/login" className="text-blue-700 font-bold">Login</Link>
        </p>
      </div>
    </div>
  );
}