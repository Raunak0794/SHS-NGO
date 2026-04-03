import React, { useState, useEffect } from "react";
import { apiClient } from "../services/api";
import Navbar from "../components/Navbar";
import { 
  Calendar, 
  TrendingUp, 
  Award, 
  Clock, 
  Target,
  ThumbsUp,
  AlertCircle,
  Lightbulb,
  Smile,
  X,
  RefreshCw
} from "lucide-react";

const WeeklyReviewPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [moodRating, setMoodRating] = useState(3);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/microgoals/weekly-review/all");
      setReviews(res.data?.reviews || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateReview = async () => {
    try {
      setGenerating(true);
      const res = await apiClient.post("/microgoals/weekly-review/generate", { moodRating });
      setReviews((prev) => [res.data.weeklyReview, ...prev]);
      setMoodRating(3);
      alert("Weekly review generated successfully!");
    } catch (error) {
      console.error("Error generating review:", error);
      alert("Failed to generate weekly review");
    } finally {
      setGenerating(false);
    }
  };

  const getMoodEmoji = (rating) => {
    switch (rating) {
      case 1: return "😞";
      case 2: return "😟";
      case 3: return "😐";
      case 4: return "😊";
      case 5: return "🥳";
      default: return "😐";
    }
  };

  const getMoodText = (rating) => {
    switch (rating) {
      case 1: return "Not Great";
      case 2: return "Could Be Better";
      case 3: return "Neutral";
      case 4: return "Good";
      case 5: return "Excellent";
      default: return "Neutral";
    }
  };

  if (loading) {
    return (
      <div>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading weekly reviews...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
            📊 Weekly Learning Reviews
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Track your weekly progress, achievements, and get AI-powered recommendations
          </p>
        </div>

        {/* Generate Review Section */}
        <div className="glass-card p-6 mb-10">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Generate This Week's Review</h2>
            <div className="max-w-md mx-auto">
              <label className="block text-gray-700 font-medium mb-3">How are you feeling about your progress?</label>
              <div className="flex justify-center gap-3 mb-6">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setMoodRating(rating)}
                    className={`text-3xl p-2 rounded-full transition-all duration-200 ${
                      moodRating === rating 
                        ? "bg-indigo-100 scale-110 shadow-md" 
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {getMoodEmoji(rating)}
                  </button>
                ))}
              </div>
              <button
                onClick={generateReview}
                disabled={generating}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Review"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Reviews Grid */}
        {reviews.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No weekly reviews yet. Generate your first review!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((review) => (
              <div
                key={review._id}
                onClick={() => setSelectedReview(review)}
                className="glass-card p-5 cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Calendar className="w-5 h-5" />
                    <span className="font-semibold">
                      Week of {review.week?.startDate ? new Date(review.week.startDate).toLocaleDateString() : "Unknown"}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    (review.consistencyScore || 0) >= 70 
                      ? "bg-green-100 text-green-700" 
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {(review.consistencyScore || 0)}% Consistency
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{review.microGoalsCompleted || 0}/{review.totalMicroGoals || 0}</div>
                    <div className="text-xs text-gray-500">Micro-Goals</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{review.hoursSpent || 0}h</div>
                    <div className="text-xs text-gray-500">Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">🔥 {review.streak || 0}</div>
                    <div className="text-xs text-gray-500">Streak</div>
                  </div>
                </div>

                <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                  {review.aiSummary || "No summary available"}
                </p>

                <button className="text-indigo-600 text-sm font-medium hover:text-indigo-700">
                  View Details →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedReview(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                Week of {selectedReview.week?.startDate ? new Date(selectedReview.week.startDate).toLocaleDateString() : "Unknown Week"}
              </h2>
              <button onClick={() => setSelectedReview(null)} className="p-1 hover:bg-gray-100 rounded-full transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-indigo-50 rounded-xl p-4 text-center">
                  <Target className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-indigo-600">{selectedReview.overallProgress || 0}%</div>
                  <div className="text-xs text-gray-600">Completion Rate</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <Clock className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">{selectedReview.hoursSpent || 0}h</div>
                  <div className="text-xs text-gray-600">Hours Invested</div>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-600">{selectedReview.consistencyScore || 0}%</div>
                  <div className="text-xs text-gray-600">Consistency</div>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 text-center">
                  <Award className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-orange-600">🔥 {selectedReview.streak || 0}</div>
                  <div className="text-xs text-gray-600">Week Streak</div>
                </div>
              </div>

              {/* AI Summary */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-800">AI-Generated Summary</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">{selectedReview.aiSummary || "No summary available"}</p>
              </div>

              {/* Achievements */}
              {selectedReview.achievements?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsUp className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-gray-800">Achievements</h3>
                  </div>
                  <ul className="space-y-2">
                    {selectedReview.achievements.map((a, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-500">✓</span>
                        <span className="text-gray-700">{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Challenges */}
              {selectedReview.challenges?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h3 className="font-semibold text-gray-800">Challenges</h3>
                  </div>
                  <ul className="space-y-2">
                    {selectedReview.challenges.map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-red-500">⚠</span>
                        <span className="text-gray-700">{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {selectedReview.aiRecommendations?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-yellow-600" />
                    <h3 className="font-semibold text-gray-800">Recommendations for Next Week</h3>
                  </div>
                  <ul className="space-y-2">
                    {selectedReview.aiRecommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-yellow-500">💡</span>
                        <span className="text-gray-700">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Week Goals */}
              {selectedReview.nextWeekGoals?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-800">Goals for Next Week</h3>
                  </div>
                  <ul className="space-y-2">
                    {selectedReview.nextWeekGoals.map((g, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-purple-500">🎯</span>
                        <span className="text-gray-700">{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mood */}
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Smile className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-700">Your Mood</span>
                </div>
                <div className="text-2xl">
                  {getMoodEmoji(selectedReview.moodRating)} {getMoodText(selectedReview.moodRating)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyReviewPage;