import React from "react";
import { Award, Star, Trophy, Sparkles } from "lucide-react";

const BadgeRow = ({ badges }) => {
  if (!badges || badges.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No badges earned yet. Complete goals to earn badges!</p>
      </div>
    );
  }

  // Helper to get icon based on badge name/content
  const getBadgeIcon = (badge) => {
    const name = badge.toLowerCase();
    if (name.includes("star") || name.includes("crusher")) return <Star className="w-4 h-4" />;
    if (name.includes("trophy") || name.includes("master")) return <Trophy className="w-4 h-4" />;
    if (name.includes("spark") || name.includes("hero")) return <Sparkles className="w-4 h-4" />;
    return <Award className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge, index) => (
        <div
          key={index}
          className="group relative px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex items-center gap-1.5"
        >
          {getBadgeIcon(badge)}
          <span>{badge}</span>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Achievement unlocked!
          </div>
        </div>
      ))}
    </div>
  );
};

export default BadgeRow;