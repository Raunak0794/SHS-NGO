import React from "react";
import { Target, Sparkles, CheckCircle, Clock } from "lucide-react";

const MicroGoalCard = ({ goal, onComplete }) => {
  if (!goal) {
    return (
      <div className="glass-card p-6 text-center">
        <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No active micro-goals</p>
        <p className="text-sm text-gray-400">Generate new goals to continue learning</p>
      </div>
    );
  }

  const progress = goal.progress || 0;

  return (
    <div className="glass-card p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-800">Next Micro-Goal</h3>
        </div>
        <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          AI Generated
        </span>
      </div>

      <h4 className="text-xl font-bold text-gray-800 mb-2">{goal.title}</h4>
      
      {goal.description && (
        <p className="text-gray-600 text-sm mb-4">{goal.description}</p>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Due Date (if exists) */}
      {goal.dueDate && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Clock className="w-4 h-4" />
          <span>Due: {new Date(goal.dueDate).toLocaleDateString()}</span>
        </div>
      )}

      {!goal.completed && progress < 100 && (
        <button
          onClick={() => onComplete(goal._id)}
          className="w-full btn-primary inline-flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Mark Complete
        </button>
      )}

      {goal.completed && (
        <div className="w-full py-2 bg-green-100 text-green-700 rounded-xl text-center font-medium flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Completed!
        </div>
      )}
    </div>
  );
};

export default MicroGoalCard;