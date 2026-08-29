import React from "react";
import { Sparkles, ArrowRight, BookOpen, AlertCircle, CheckCircle2, Flame } from "lucide-react";
import { Link } from "react-router-dom";

export default function WhatShouldIStudyCard({ recommendation, loading, onAction }) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white shadow-xl animate-pulse">
        <div className="h-6 w-48 bg-white/20 rounded mb-3"></div>
        <div className="h-4 w-72 bg-white/20 rounded mb-4"></div>
        <div className="h-10 w-36 bg-white/30 rounded-xl"></div>
      </div>
    );
  }

  const priority = recommendation?.priority || {
    title: "Start Your First Practice Session",
    reason: "Ask the AI Tutor a question or take a quick quiz to discover your strengths.",
    actionType: "quiz",
    subject: "Science",
    topic: "General",
  };

  const getActionLink = () => {
    if (priority.actionType === "review_mistakes") return "/practice?tab=mistakes";
    if (priority.actionType === "quiz") return `/practice?tab=quiz&subject=${encodeURIComponent(priority.subject || "Science")}`;
    if (priority.actionType === "chat") return `/tutor?subject=${encodeURIComponent(priority.subject || "Science")}`;
    if (priority.actionType === "upload") return "/materials";
    return "/practice";
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-800 p-6 md:p-8 text-white shadow-xl shadow-indigo-200">
      {/* Decorative background glow */}
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-purple-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-100 border border-white/10 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
            <span>Smart Study Recommendation</span>
          </div>

          <h2 className="text-xl md:text-2xl font-bold leading-tight">
            {priority.title}
          </h2>

          <p className="mt-2 text-sm text-indigo-100/90 leading-relaxed">
            {priority.reason}
          </p>

          {recommendation?.tips && recommendation.tips.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-xs text-indigo-200 bg-white/10 rounded-xl px-3 py-2 border border-white/5">
              <Flame className="h-4 w-4 text-amber-300 shrink-0" />
              <span>Tip: {recommendation.tips[0]}</span>
            </div>
          )}
        </div>

        <div className="shrink-0">
          <Link
            to={getActionLink()}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-indigo-700 shadow-lg hover:bg-indigo-50 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <span>Start Now</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
