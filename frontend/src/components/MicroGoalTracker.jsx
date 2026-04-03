import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../services/api";
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  Calendar, 
  Flag, 
  BookOpen, 
  ExternalLink,
  X,
  Edit3,
  Send
} from "lucide-react";

const MicroGoalTracker = ({ goalId, onUpdate }) => {
  const [microGoals, setMicroGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchMicroGoals = useCallback(async () => {
    if (!goalId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/microgoals/goal/${goalId}`);
      setMicroGoals(res.data?.microGoals || []);
    } catch (error) {
      console.error("Error fetching micro-goals:", error);
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    fetchMicroGoals();
  }, [fetchMicroGoals]);

  const updateMicroGoal = async (microGoalId, updates) => {
    try {
      const res = await apiClient.put(`/microgoals/${microGoalId}`, updates);
      setMicroGoals((prev) =>
        prev.map((mg) => (mg._id === microGoalId ? res.data.microGoal : mg))
      );
      if (onUpdate) onUpdate();
      // Update selected goal if it's the same
      if (selectedGoal?._id === microGoalId) {
        setSelectedGoal(res.data.microGoal);
      }
    } catch (error) {
      console.error("Error updating micro-goal:", error);
    }
  };

  const getProgressPercentage = () => {
    if (microGoals.length === 0) return 0;
    const completed = microGoals.filter((mg) => mg.status === "completed").length;
    return Math.round((completed / microGoals.length) * 100);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-700";
      case "medium": return "bg-yellow-100 text-yellow-700";
      case "low": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status) => {
    if (status === "completed") return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === "in-progress") return <Clock className="w-4 h-4 text-yellow-500" />;
    return <Circle className="w-4 h-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading micro-goals...</p>
      </div>
    );
  }

  const progress = getProgressPercentage();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <h3 className="text-xl font-semibold text-gray-800">📋 Micro-Goals ({microGoals.length})</h3>
          <div className="flex items-center gap-3">
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="text-sm font-medium text-gray-700">{progress}% Complete</span>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {microGoals.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-gray-500">No micro-goals yet. Generate them from your main goal!</p>
          </div>
        ) : (
          microGoals.map((mg) => (
            <div
              key={mg._id}
              onClick={() => {
                setSelectedGoal(mg);
                setShowDetails(true);
              }}
              className={`glass-card p-4 cursor-pointer transition-all hover:shadow-md ${
                mg.status === "completed" ? "bg-green-50/50" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">
                    <input
                      type="checkbox"
                      checked={mg.status === "completed"}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateMicroGoal(mg._id, { status: e.target.checked ? "completed" : "pending" });
                      }}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="text-lg font-semibold text-gray-800">{mg.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(mg.priority)}`}>
                        {mg.priority}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">{mg.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {mg.estimatedHours || 0}h est.</span>
                      {mg.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(mg.deadline).toLocaleDateString()}</span>}
                      <span className="flex items-center gap-1 capitalize">{getStatusIcon(mg.status)} {mg.status?.replace("-", " ")}</span>
                    </div>
                    {mg.subtasks?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {mg.subtasks.slice(0, 2).map((st, i) => (
                          <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            {st.completed ? "✓" : "○"} {st.title}
                          </span>
                        ))}
                        {mg.subtasks.length > 2 && (
                          <span className="text-xs text-gray-400">+{mg.subtasks.length - 2} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Flag className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showDetails && selectedGoal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetails(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">{selectedGoal.title}</h2>
              <button onClick={() => setShowDetails(false)} className="p-1 hover:bg-gray-100 rounded-full transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Description */}
              <p className="text-gray-700">{selectedGoal.description}</p>

              {/* Subtasks */}
              {selectedGoal.subtasks?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Subtasks</h4>
                  <div className="space-y-2">
                    {selectedGoal.subtasks.map((st, idx) => (
                      <label key={idx} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={() => {
                            const updated = selectedGoal.subtasks.map((s, i) =>
                              i === idx ? { ...s, completed: !s.completed } : s
                            );
                            updateMicroGoal(selectedGoal._id, { subtasks: updated });
                            setSelectedGoal({ ...selectedGoal, subtasks: updated });
                          }}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className={`text-gray-700 ${st.completed ? "line-through text-gray-400" : ""}`}>{st.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Resources */}
              {selectedGoal.resources?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Resources</h4>
                  <div className="space-y-1">
                    {selectedGoal.resources.map((res, idx) => (
                      <a key={idx} href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline text-sm">
                        {res.title} <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Status & Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={selectedGoal.status}
                    onChange={(e) => {
                      updateMicroGoal(selectedGoal._id, { status: e.target.value });
                      setSelectedGoal({ ...selectedGoal, status: e.target.value });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hours Spent</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={selectedGoal.actualHours || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      updateMicroGoal(selectedGoal._id, { actualHours: val });
                      setSelectedGoal({ ...selectedGoal, actualHours: val });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                <textarea
                  rows={3}
                  value={selectedGoal.feedback || ""}
                  onChange={(e) => {
                    updateMicroGoal(selectedGoal._id, { feedback: e.target.value });
                    setSelectedGoal({ ...selectedGoal, feedback: e.target.value });
                  }}
                  placeholder="Add your feedback about this micro-goal..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MicroGoalTracker;