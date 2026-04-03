import React from "react";

const ProgressChart = ({ percent }) => {
  // Clamp percent between 0 and 100
  const safePercent = Math.min(100, Math.max(0, percent || 0));

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r="72"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
          />
          <circle
            cx="80"
            cy="80"
            r="72"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="12"
            strokeDasharray={`${2 * Math.PI * 72}`}
            strokeDashoffset={`${2 * Math.PI * 72 * (1 - safePercent / 100)}`}
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4CAF9A" />
              <stop offset="100%" stopColor="#2196F3" />
            </linearGradient>
          </defs>
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">{safePercent}%</span>
        </div>
      </div>
      <p className="text-sm text-gray-500 mt-2">Weekly Progress</p>
    </div>
  );
};

export default ProgressChart;