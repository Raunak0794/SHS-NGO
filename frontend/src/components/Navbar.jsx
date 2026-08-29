import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  FaGraduationCap, 
  FaHome, 
  FaChartLine, 
  FaRobot, 
  FaCalendarAlt, 
  FaBook,
  FaBrain,
  FaChalkboardTeacher,
  FaUserCircle,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaSignInAlt,
  FaUserPlus,
  FaCog
} from "react-icons/fa";
import { useAuth } from "../hooks/useAuth";

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
    { path: "/dashboard", name: "Home", icon: FaHome },
    { path: "/tutor", name: "AI Tutor", icon: FaRobot },
    { path: "/subjects", name: "My Subjects", icon: FaChalkboardTeacher },
    { path: "/materials", name: "Study Material", icon: FaBook },
    { path: "/practice", name: "Practice", icon: FaBrain },
    { path: "/plan", name: "Study Plan", icon: FaCalendarAlt },
    { path: "/progress", name: "Progress", icon: FaChartLine },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform duration-200">
              <FaGraduationCap className="text-white text-xl" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent leading-none">
                SHS AI
              </span>
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                Study Copilot
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <ul className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 text-xs font-semibold ${
                        isActive(link.path)
                          ? "bg-indigo-50 text-indigo-600 shadow-xs"
                          : "text-gray-600 hover:bg-gray-50 hover:text-indigo-600"
                      }`}
                    >
                      <Icon className="text-sm" />
                      {link.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Right side - Student Badge & Settings / Logout */}
          <div className="hidden md:flex items-center gap-2.5">
            {isAuthenticated ? (
              <>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-indigo-50/70 border border-gray-200/80 transition-all text-xs font-semibold text-gray-700 hover:text-indigo-600"
                  title="Profile & Settings"
                >
                  <FaUserCircle className="text-indigo-500 text-base" />
                  <span>{user?.fullName?.firstName || "Student"}</span>
                  {user?.classLevel && (
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                      {user.classLevel}
                    </span>
                  )}
                </Link>

                <Link
                  to="/settings"
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                  title="Settings"
                >
                  <FaCog />
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200 text-xs font-semibold"
                  title="Logout"
                >
                  <FaSignOutAlt />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-all text-xs font-bold"
                >
                  <FaSignInAlt />
                  Login
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs"
                >
                  <FaUserPlus />
                  Sign Up
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          {isAuthenticated && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isMobileMenuOpen}
              className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {isMobileMenuOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isAuthenticated && isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 py-2 animate-fadeIn shadow-lg">
          <ul className="flex flex-col px-3 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      isActive(link.path)
                        ? "bg-indigo-50 text-indigo-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="text-base text-indigo-500" />
                    {link.name}
                  </Link>
                </li>
              );
            })}
            
            <li className="pt-2 border-t border-gray-100">
              <Link
                to="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <FaCog className="text-gray-400" />
                  <span>Settings & Profile</span>
                </div>
                {user?.classLevel && (
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-md">
                    {user.classLevel}
                  </span>
                )}
              </Link>
            </li>

            <li>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-red-600 hover:bg-red-50 text-sm font-semibold text-left"
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
