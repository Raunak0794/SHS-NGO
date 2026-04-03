import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  FaGraduationCap, 
  FaHome, 
  FaChartLine, 
  FaRobot, 
  FaCalendarAlt, 
  FaChalkboardTeacher,
  FaUserCircle,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaSignInAlt,
  FaUserPlus
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinks = [
    { path: "/", name: "Home", icon: FaHome },
    { path: "/dashboard", name: "Dashboard", icon: FaChartLine },
    { path: "/studysphereai", name: "StudySphere AI", icon: FaRobot },
    { path: "/weekly-reviews", name: "Weekly Reviews", icon: FaCalendarAlt },
    { path: "/mentors", name: "Mentors", icon: FaChalkboardTeacher },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
              <FaGraduationCap className="text-white text-xl" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              SHS NGO
            </span>
          </Link>

          {/* Desktop Navigation - only for authenticated users */}
          {isAuthenticated && (
            <ul className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                        isActive(link.path)
                          ? "bg-indigo-50 text-indigo-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-indigo-600"
                      }`}
                    >
                      <Icon className="text-lg" />
                      {link.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Right side - User menu or Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50">
                  <FaUserCircle className="text-gray-500 text-xl" />
                  <span className="text-sm font-medium text-gray-700">
                    {user?.fullName?.firstName || user?.email?.split('@')[0] || "User"}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 font-medium"
                >
                  <FaSignOutAlt />
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-all duration-200 font-medium"
                >
                  <FaSignInAlt />
                  Login
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all duration-200 font-medium"
                >
                  <FaUserPlus />
                  Sign Up
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button - only for authenticated users (optional) */}
          {isAuthenticated && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {isMobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isAuthenticated && isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-2 animate-slideDown">
          <ul className="flex flex-col">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      isActive(link.path)
                        ? "bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="text-lg" />
                    {link.name}
                  </Link>
                </li>
              );
            })}
            <div className="border-t border-gray-100 my-2"></div>
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-3 px-2">
                <FaUserCircle className="text-gray-500 text-xl" />
                <span className="text-sm font-medium text-gray-700">
                  {user?.fullName?.firstName || user?.email?.split('@')[0] || "User"}
                </span>
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 font-medium"
              >
                <FaSignOutAlt />
                Logout
              </button>
            </div>
          </ul>
        </div>
      )}
    </nav>
  );
};

export default Navbar;