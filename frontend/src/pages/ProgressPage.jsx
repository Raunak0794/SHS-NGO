import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  BookOpen,
  Award,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getProgressDashboard } from "../services/api";

export default function ProgressPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await getProgressDashboard();
      setData(res.data);
    } catch (err) {
      console.error("Load progress error:", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = data?.stats || {
    accuracy: 0,
    topicsMasteredCount: 0,
    weakTopicsCount: 0,
    improvingTopicsCount: 0,
    totalAttempts: 0,
    unreviewedMistakesCount: 0,
    streak: user?.streak || 0,
  };

  const weakTopics = data?.weakTopics || [];
  const improvingTopics = data?.improvingTopics || [];
  const strongTopics = data?.strongTopics || [];
  const subjectProgress = data?.subjectProgress || [];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="h-7 w-7 text-indigo-600" />
              <span>Learning Analytics & Mastery</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Real-time breakdown of your syllabus concepts, strengths, and areas needing practice.
            </p>
          </div>

          <Link
            to="/practice?tab=quiz"
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 self-start sm:self-auto"
          >
            <Brain className="h-4 w-4" />
            <span>Practice Weak Topics</span>
          </Link>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-3xl bg-white p-5 border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
              <span>Overall Accuracy</span>
              <Award className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900">{stats.accuracy}%</div>
            <div className="text-[11px] text-gray-400 mt-1">From {stats.totalAttempts} answers</div>
          </div>

          <div className="rounded-3xl bg-white p-5 border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
              <span>Mastered Concepts</span>
              <CheckCircle2 className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600">
              {stats.topicsMasteredCount}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">&ge; 80% accuracy score</div>
          </div>

          <div className="rounded-3xl bg-white p-5 border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
              <span>Weak Topics</span>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-red-600">
              {stats.weakTopicsCount}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">Needs extra practice</div>
          </div>

          <div className="rounded-3xl bg-white p-5 border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
              <span>Study Streak</span>
              <Flame className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600">
              {stats.streak} Days
            </div>
            <div className="text-[11px] text-gray-400 mt-1">Keep the fire burning!</div>
          </div>
        </div>

        {/* Weak Topics to Practice (Highest Priority) */}
        {weakTopics.length > 0 && (
          <div className="rounded-3xl bg-red-50/50 p-6 md:p-8 border border-red-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-red-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span>Topics Needing Practice</span>
                </h3>
                <p className="text-xs text-red-700/80 mt-0.5">
                  AI identified these topics where accuracy is under 50%.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {weakTopics.map((topic) => (
                <div
                  key={topic._id}
                  className="bg-white p-4 rounded-2xl border border-red-200/80 shadow-xs flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase text-red-600 block">
                      {topic.subject}
                    </span>
                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm">{topic.topic}</h4>
                    <span className="text-xs text-gray-400">
                      Mastery: {topic.masteryScore}% ({topic.accuracy}% accuracy)
                    </span>
                  </div>

                  <Link
                    to={`/tutor?subject=${encodeURIComponent(topic.subject)}`}
                    className="shrink-0 p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition"
                    title="Ask AI about this"
                  >
                    Learn
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subject Mastery Progress Bars */}
        <div className="rounded-3xl bg-white p-6 md:p-8 border border-gray-200/80 shadow-xs space-y-6">
          <h3 className="text-base font-bold text-gray-900">Subject Breakdown</h3>

          <div className="space-y-4">
            {subjectProgress.map((sub) => (
              <div key={sub.subject} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-gray-800">{sub.subject}</span>
                  <span className="text-indigo-600">{sub.mastery}% Mastery</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-500 to-purple-500"
                    style={{ width: `${sub.mastery}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mastered Concepts Showcase */}
        {strongTopics.length > 0 && (
          <div className="rounded-3xl bg-white p-6 md:p-8 border border-gray-200/80 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>Mastered Concepts ({strongTopics.length})</span>
            </h3>

            <div className="flex flex-wrap gap-2">
              {strongTopics.map((topic) => (
                <div
                  key={topic._id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 text-green-800 border border-green-200 text-xs font-semibold"
                >
                  <span>🎉 {topic.topic}</span>
                  <span className="text-[10px] text-green-600 font-bold">({topic.accuracy}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
