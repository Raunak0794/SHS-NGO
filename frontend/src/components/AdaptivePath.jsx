import React from "react";
import { Brain, Zap, TrendingUp, CheckCircle } from "lucide-react";

const AdaptivePath = ({ path }) => {
  if (!path || path.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <Brain className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
        <p className="text-gray-500">No adaptive path generated yet.</p>
        <p className="text-sm text-gray-400">Upload material to get personalized learning path.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-800">Your Adaptive Path</h3>
        </div>
        <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">Powered by Gemini AI</span>
      </div>

      <div className="space-y-4">
        {path.map((step, index) => {
          const isLast = index === path.length - 1;
          return (
            <div key={index} className="relative">
              {!isLast && (
                <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gradient-to-b from-indigo-300 to-transparent"></div>
              )}
              <div className="flex gap-3">
                <div className="relative z-10">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-600 text-sm font-bold">{index + 1}</span>
                  </div>
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-gray-700 leading-relaxed">{step}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <Zap className="w-4 h-4" />
            <span>Personalized for you</span>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>AI-optimized sequence</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdaptivePath;