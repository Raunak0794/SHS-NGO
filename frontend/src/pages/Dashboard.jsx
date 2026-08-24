import React, { useEffect, useState, useCallback } from "react";
import { getDashboard, createGoal, completeGoal } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";
import MicroGoalTracker from "../components/MicroGoalTracker";
import { 
  TrendingUp, 
  Award, 
  Target, 
  Sparkles,
  CheckCircle,
  Loader2,
  RefreshCw,
  Trophy,
  Calendar,
  Clock,
  Plus,
  X
} from "lucide-react";

const EMPTY_GOAL_FORM = {
  title: "",
  description: "",
  category: "other",
  priority: "medium",
  dueDate: "",
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completingId, setCompletingId] = useState(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL_FORM);
  const { user } = useAuth();

  // fetch dashboard data
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getDashboard();
      if (!res?.data) {
        throw new Error("Invalid API response");
      }
      setData(res.data);
    } catch (err) {
      console.error("Dashboard load error:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleGoalInput = (event) => {
    const { name, value } = event.target;
    setGoalForm((current) => ({ ...current, [name]: value }));
  };

  const handleCreateGoal = async (event) => {
    event.preventDefault();
    const title = goalForm.title.trim();

    if (title.length < 3) {
      toast.error("Enter a goal title with at least 3 characters.");
      return;
    }

    setCreatingGoal(true);
    try {
      await createGoal({ ...goalForm, title });
      toast.success("Goal created. You can now generate its micro-goals.");
      setGoalForm(EMPTY_GOAL_FORM);
      setShowGoalForm(false);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not create the goal.");
    } finally {
      setCreatingGoal(false);
    }
  };

  // mark goal complete
  const handleComplete = async (id) => {
    if (!id) return;
    setCompletingId(id);
    try {
      await completeGoal(id);
      await load();
    } catch (err) {
      console.error("Complete goal error:", err);
      toast.error("Could not complete goal. Please try again.");
    } finally {
      setCompletingId(null);
    }
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Analyzing your progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={load} className="btn-primary inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center">
        <p className="text-gray-600">No dashboard data available.</p>
      </div>
    );
  }

  const progressPercent = Number(data.weeklyProgress) || 0;
  const isAllCompleted = !data.nextGoal;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {getGreeting()}, {user?.fullName?.firstName || "Learner"}! 👋
              </h1>
              <p className="text-indigo-100">Track your learning journey and celebrate your progress</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden md:flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGoalForm((visible) => !visible)}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
              >
                {showGoalForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showGoalForm ? "Cancel" : "Add Goal"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showGoalForm && (
          <form onSubmit={handleCreateGoal} className="glass-card p-6 mb-8">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-gray-800">Create a main goal</h2>
              <p className="mt-1 text-sm text-gray-500">
                Add your learning goal, then generate a step-by-step micro-goal plan.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="goal-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Goal title
                </label>
                <input
                  id="goal-title"
                  name="title"
                  value={goalForm.title}
                  onChange={handleGoalInput}
                  maxLength={120}
                  placeholder="Example: Learn React fundamentals"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  required
                  autoFocus
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="goal-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="goal-description"
                  name="description"
                  value={goalForm.description}
                  onChange={handleGoalInput}
                  maxLength={1000}
                  rows={3}
                  placeholder="What do you want to achieve?"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div>
                <label htmlFor="goal-category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="goal-category"
                  name="category"
                  value={goalForm.category}
                  onChange={handleGoalInput}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="programming">Programming</option>
                  <option value="languages">Languages</option>
                  <option value="soft-skills">Soft skills</option>
                  <option value="design">Design</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="goal-priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  id="goal-priority"
                  name="priority"
                  value={goalForm.priority}
                  onChange={handleGoalInput}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label htmlFor="goal-due-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Due date (optional)
                </label>
                <input
                  id="goal-due-date"
                  name="dueDate"
                  type="date"
                  value={goalForm.dueDate}
                  onChange={handleGoalInput}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={creatingGoal || goalForm.title.trim().length < 3}
                className="btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingGoal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creatingGoal ? "Creating..." : "Create Goal"}
              </button>
            </div>
          </form>
        )}
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8 text-indigo-600" />
              <span className="text-3xl font-bold text-indigo-600">{progressPercent}%</span>
            </div>
            <h3 className="text-gray-700 font-medium">Overall Progress</h3>
            <p className="text-gray-500 text-sm mt-1">Keep pushing forward!</p>
          </div>
          
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <span className="text-3xl font-bold text-yellow-500">{data.badges?.length || 0}</span>
            </div>
            <h3 className="text-gray-700 font-medium">Badges Earned</h3>
            <p className="text-gray-500 text-sm mt-1">Achievements unlocked</p>
          </div>
          
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-green-500" />
              <span className="text-3xl font-bold text-green-500">{data.completedCount || 0}</span>
            </div>
            <h3 className="text-gray-700 font-medium">Goals Completed</h3>
            <p className="text-gray-500 text-sm mt-1">This week</p>
          </div>
        </div>

        {/* Main Cards Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Next Goal Card */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-800">Next Goal</h2>
            </div>
            
            {isAllCompleted ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">🎉 All goals completed!</h3>
                <p className="text-gray-600">Great job! New goals will be generated soon.</p>
              </div>
            ) : (
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{data.nextGoal?.title}</h3>
                <p className="text-gray-600 mb-4">{data.nextGoal?.description || "Continue your learning journey"}</p>
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{data.nextGoal?.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${data.nextGoal?.progress || 0}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleComplete(data.nextGoal?._id)}
                  disabled={completingId === data.nextGoal?._id}
                  className="w-full btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {completingId === data.nextGoal?._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Mark as Complete
                </button>
              </div>
            )}
          </div>

          {/* Progress Chart Card */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-semibold text-gray-800">Weekly Progress</h2>
            </div>
            <div className="flex flex-col items-center">
              <div className="relative w-48 h-48 mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="12"
                    strokeDasharray={`${2 * Math.PI * 88}`}
                    strokeDashoffset={`${2 * Math.PI * 88 * (1 - progressPercent / 100)}`}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-indigo-600">{progressPercent}%</span>
                </div>
              </div>
              <p className="text-gray-600 text-center">
                {progressPercent >= 70 
                  ? "📈 Great Progress! Keep it up!" 
                  : "📊 Keep Going! You're doing great!"}
              </p>
            </div>
          </div>
        </div>

        {data.nextGoal?._id && (
          <div className="mb-8">
            <MicroGoalTracker goalId={data.nextGoal._id} onUpdate={load} />
          </div>
        )}

        {/* Badges Section */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-semibold text-gray-800">Earned Badges</h2>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {Array.isArray(data.badges) && data.badges.length > 0 ? (
              data.badges.map((badge, index) => (
                <div
                  key={index}
                  className="group relative px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-full font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                >
                  <span>{badge}</span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Achievement unlocked!
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">Complete your first micro-goal to earn a badge! 🏆</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => window.location.href = '/studysphereai'}
            className="p-4 glass-card text-center hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Sparkles className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700">AI Study</span>
          </button>
          <button 
            onClick={() => window.location.href = '/weekly-reviews'}
            className="p-4 glass-card text-center hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Calendar className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700">Weekly Review</span>
          </button>
          <button 
            onClick={() => window.location.href = '/mentors'}
            className="p-4 glass-card text-center hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Trophy className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700">Mentors</span>
          </button>
          <button 
            onClick={load}
            className="p-4 glass-card text-center hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <RefreshCw className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700">Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
