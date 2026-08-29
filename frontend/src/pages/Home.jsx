import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  BookOpen,
  Brain,
  HelpCircle,
  Award,
  UploadCloud,
  Flame,
  Clock,
  ArrowRight,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getProgressDashboard, getStudyRecommendation } from "../services/api";
import WhatShouldIStudyCard from "../components/WhatShouldIStudyCard";
import OnboardingModal from "../components/OnboardingModal";
import HomeworkHelperModal from "../components/HomeworkHelperModal";
import AnswerCheckerModal from "../components/AnswerCheckerModal";

const SUBJECT_ICONS = {
  Mathematics: "📐",
  Science: "🔬",
  English: "📖",
  "Social Science": "🌍",
  Hindi: "🇮🇳",
  "Computer Science": "💻",
  General: "📚",
};

export default function Home() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showAnswerModal, setShowAnswerModal] = useState(false);

  useEffect(() => {
    // Open onboarding if new user or onboarding not done
    if (user && !user.onboardingCompleted && !user.classLevel) {
      setShowOnboarding(true);
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, recRes] = await Promise.all([
        getProgressDashboard().catch(() => ({ data: {} })),
        getStudyRecommendation().catch(() => ({ data: {} })),
      ]);
      setDashboardData(dashRes.data || {});
      setRecommendation(recRes.data?.recommendations || null);
    } catch (err) {
      console.error("Load home data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const studentSubjects = user?.subjects?.length
    ? user.subjects
    : ["Mathematics", "Science", "English", "Social Science"];

  const stats = dashboardData?.stats || {
    accuracy: 0,
    topicsMasteredCount: 0,
    streak: user?.streak || 0,
    unreviewedMistakesCount: 0,
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
          loadData();
        }}
      />

      {/* Homework Helper Modal */}
      <HomeworkHelperModal
        isOpen={showHomeworkModal}
        onClose={() => setShowHomeworkModal(false)}
      />

      {/* Answer Checker Modal */}
      <AnswerCheckerModal
        isOpen={showAnswerModal}
        onClose={() => setShowAnswerModal(false)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Welcome back, {user?.fullName?.firstName || "Learner"}! 👋
              </h1>
              {user?.classLevel && (
                <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
                  {user.classLevel}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Here is your daily study copilot overview. Ready to learn something new today?
            </p>
          </div>

          {/* Streak & Daily Goal Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 rounded-2xl bg-amber-50 px-3.5 py-2 border border-amber-200 text-amber-800 text-xs font-bold shadow-xs">
              <Flame className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span>{stats.streak || 0} Day Streak</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl bg-indigo-50 px-3.5 py-2 border border-indigo-100 text-indigo-800 text-xs font-bold shadow-xs">
              <Clock className="h-4 w-4 text-indigo-600" />
              <span>{user?.dailyStudyGoalMinutes || 30}m Goal</span>
            </div>
          </div>
        </div>

        {/* Priority Recommendation Card ("What Should I Study?") */}
        <WhatShouldIStudyCard
          recommendation={recommendation}
          loading={loading}
        />

        {/* Quick Action Tools Bar */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
            Quick Study Tools
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Link
              to="/tutor"
              className="group flex flex-col items-center text-center p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:border-indigo-500 hover:shadow-md transition-all"
            >
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-2 group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold text-gray-800">Ask AI Tutor</span>
              <span className="text-[10px] text-gray-400 mt-0.5">Instant answers</span>
            </Link>

            <Link
              to="/practice?tab=quiz"
              className="group flex flex-col items-center text-center p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:border-purple-500 hover:shadow-md transition-all"
            >
              <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 mb-2 group-hover:scale-110 transition-transform">
                <Brain className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold text-gray-800">Practice Quiz</span>
              <span className="text-[10px] text-gray-400 mt-0.5">Adaptive tests</span>
            </Link>

            <Link
              to="/materials"
              className="group flex flex-col items-center text-center p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 mb-2 group-hover:scale-110 transition-transform">
                <UploadCloud className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold text-gray-800">Upload Notes</span>
              <span className="text-[10px] text-gray-400 mt-0.5">PDFs & documents</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowHomeworkModal(true)}
              className="group flex flex-col items-center text-center p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:border-amber-500 hover:shadow-md transition-all"
            >
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 mb-2 group-hover:scale-110 transition-transform">
                <HelpCircle className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold text-gray-800">Homework Helper</span>
              <span className="text-[10px] text-gray-400 mt-0.5">Hints & steps</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAnswerModal(true)}
              className="group flex flex-col items-center text-center p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:border-green-500 hover:shadow-md transition-all col-span-2 sm:col-span-1"
            >
              <div className="p-3 rounded-2xl bg-green-50 text-green-600 mb-2 group-hover:scale-110 transition-transform">
                <Award className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold text-gray-800">Check My Answer</span>
              <span className="text-[10px] text-gray-400 mt-0.5">Score & feedback</span>
            </button>
          </div>
        </div>

        {/* My Subjects Overview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              My Subjects
            </h2>
            <Link
              to="/subjects"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {studentSubjects.map((sub) => {
              const progressEntry = (dashboardData?.subjectProgress || []).find(
                (p) => p.subject.toLowerCase() === sub.toLowerCase()
              );
              const mastery = progressEntry?.mastery || 50;

              return (
                <div
                  key={sub}
                  className="rounded-3xl bg-white p-5 border border-gray-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{SUBJECT_ICONS[sub] || "📚"}</span>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {mastery}% Mastered
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-800 text-base">{sub}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {progressEntry?.topicsCount || 0} topics recorded
                    </p>

                    <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-500 to-purple-500"
                        style={{ width: `${mastery}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <Link
                      to={`/tutor?subject=${encodeURIComponent(sub)}`}
                      className="text-xs font-semibold text-gray-600 hover:text-indigo-600 py-1"
                    >
                      Ask AI
                    </Link>
                    <Link
                      to={`/practice?tab=quiz&subject=${encodeURIComponent(sub)}`}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition"
                    >
                      Practice
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Learning Stats & Mistake Book alert */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-3xl bg-white p-5 border border-gray-200/80 shadow-xs flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-green-50 text-green-600 shrink-0">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <div className="text-2xl font-black text-gray-900">{stats.accuracy}%</div>
              <div className="text-xs font-semibold text-gray-500">Practice Accuracy</div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 border border-gray-200/80 shadow-xs flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 shrink-0">
              <Brain className="h-7 w-7" />
            </div>
            <div>
              <div className="text-2xl font-black text-gray-900">{stats.topicsMasteredCount}</div>
              <div className="text-xs font-semibold text-gray-500">Topics Mastered</div>
            </div>
          </div>

          <Link
            to="/practice?tab=mistakes"
            className="rounded-3xl bg-white p-5 border border-gray-200/80 shadow-xs flex items-center justify-between hover:border-amber-400 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
                <BookOpen className="h-7 w-7" />
              </div>
              <div>
                <div className="text-2xl font-black text-amber-700">
                  {stats.unreviewedMistakesCount}
                </div>
                <div className="text-xs font-semibold text-gray-500">Mistakes to Review</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
}