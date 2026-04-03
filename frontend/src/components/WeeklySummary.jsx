import React from "react";
import { Sparkles, TrendingUp, Award, Calendar } from "lucide-react";

const WeeklySummary = ({ summary, weekDates }) => {
  if (!summary) {
    return (
      <div className="glass-card p-6 text-center">
        <Sparkles className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
        <p className="text-gray-500">No weekly summary available yet.</p>
        <p className="text-sm text-gray-400">Generate a weekly review to see your AI summary.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-800">AI Weekly Summary</h3>
        </div>
        {weekDates && (
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {weekDates}
          </span>
        )}
      </div>
      
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 mb-4">
        <p className="text-gray-700 leading-relaxed">{summary}</p>
      </div>

      <div className="flex items-center justify-end text-sm text-gray-500 gap-3">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span>AI-generated insights</span>
        </div>
        <div className="flex items-center gap-1">
          <Award className="w-4 h-4 text-yellow-500" />
          <span>Progress tracking</span>
        </div>
      </div>
    </div>
  );
};

export default WeeklySummary;