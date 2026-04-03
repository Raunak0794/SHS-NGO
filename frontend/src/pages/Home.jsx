import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";  // ✅ Fixed import
import {
  Brain,
  Calendar,
  Target,
  Sparkles,
  TrendingUp,
  Award,
  ArrowRight,
  Rocket,
  BookOpen,
  Zap,
  LogIn,
  UserPlus
} from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Learning",
      description: "Personalized study plans and smart recommendations powered by Gemini AI",
      color: "from-purple-500 to-indigo-500"
    },
    {
      icon: Target,
      title: "Smart Goal Tracking",
      description: "Break down big goals into manageable micro-goals with progress tracking",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Calendar,
      title: "Calendar Integration",
      description: "Sync your micro-goals with Google Calendar for better time management",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: TrendingUp,
      title: "Weekly Reviews",
      description: "Get AI-generated insights and track your learning consistency",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Award,
      title: "Gamification",
      description: "Earn badges and maintain streaks as you progress through your goals",
      color: "from-yellow-500 to-amber-500"
    },
    {
      icon: Zap,
      title: "Study Materials",
      description: "Upload and analyze study materials with automatic summary generation",
      color: "from-pink-500 to-rose-500"
    }
  ];

  const stats = [
    { value: "1000+", label: "Active Learners" },
    { value: "5000+", label: "Goals Achieved" },
    { value: "95%", label: "Success Rate" },
    { value: "24/7", label: "AI Support" }
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 mr-2" />
            AI-Powered Learning Platform
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Welcome to SHS NGO
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Transform your study journey with personalized AI insights, smart goal tracking,
            and seamless calendar integration. Learn smarter, not harder.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white/90 text-gray-700 font-semibold rounded-xl transition-all duration-200 shadow-md flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float animation-delay-2000" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Learning Platform
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Master Your Learning
              </span>
              <br />
              <span className="text-gray-800">with AI Assistance</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
              Transform your study journey with personalized AI insights, smart goal tracking,
              and seamless calendar integration. Learn smarter, not harder.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/studysphereai')}
                className="group px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                Get Started
                <Rocket className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-8 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white/90 text-gray-700 font-semibold rounded-xl transition-all duration-200 shadow-md flex items-center justify-center gap-2"
              >
                View Dashboard
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white/50 backdrop-blur-sm py-12 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-indigo-600">{stat.value}</div>
                <div className="text-gray-600 mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Powerful Features for <span className="gradient-text">Modern Learners</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to stay organized, motivated, and on track with your learning goals
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group glass-card p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                  onClick={() => navigate('/studysphereai')}
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join thousands of learners who are already using AI to achieve their goals
          </p>
          <button
            onClick={() => navigate('/studysphereai')}
            className="px-8 py-3 bg-white text-indigo-600 font-semibold rounded-xl hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 mx-auto"
          >
            Start Learning Now
            <BookOpen className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;