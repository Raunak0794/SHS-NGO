import React, { useState, useEffect } from "react";
import { BookMarked, CheckCircle2, AlertTriangle, RefreshCw, Trash2, ArrowRight } from "lucide-react";
import { getMistakes, resolveMistake } from "../services/api";
import toast from "react-hot-toast";

export default function MistakeBook({ subjectFilter, onStartPractice }) {
  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(subjectFilter || "All");

  const loadMistakes = async () => {
    setLoading(true);
    try {
      const res = await getMistakes({ subject: selectedSubject });
      setMistakes(res.data?.mistakes || []);
    } catch (err) {
      console.error("Load mistakes error:", err);
      toast.error("Could not load Mistake Book");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMistakes();
  }, [selectedSubject]);

  const handleResolve = async (id) => {
    try {
      await resolveMistake(id);
      setMistakes((prev) => prev.filter((m) => m._id !== id));
      toast.success("Great job! Resolved from your Mistake Book.");
    } catch (err) {
      toast.error("Could not update mistake");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with subject pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-amber-500" />
            <span>Digital Mistake Book</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Every question you missed is saved here so you can turn weaknesses into strengths.
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {["All", "Mathematics", "Science", "English", "Social Science"].map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSelectedSubject(sub)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedSubject === sub
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : mistakes.length === 0 ? (
        <div className="text-center py-12 bg-amber-50/50 rounded-3xl border border-amber-100 p-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 mb-3">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h4 className="text-base font-bold text-gray-800">Your Mistake Book is Clear!</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            No unreviewed mistakes found. Take a practice quiz to test your mastery!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {mistakes.map((m) => (
            <div
              key={m._id}
              className="group relative rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs hover:border-amber-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                    {m.subject}
                  </span>
                  <span className="text-xs font-medium text-gray-400">• {m.topic}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleResolve(m._id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-lg transition"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>I've Mastered This</span>
                </button>
              </div>

              <h4 className="text-sm font-semibold text-gray-800 mt-2.5">
                {m.question}
              </h4>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-red-50/70 border border-red-100 text-red-700">
                  <span className="font-bold block text-[10px] text-red-500 uppercase tracking-wider mb-0.5">
                    Your Answer
                  </span>
                  {m.studentAnswer || "(No answer given)"}
                </div>

                <div className="p-2.5 rounded-xl bg-green-50/70 border border-green-100 text-green-700">
                  <span className="font-bold block text-[10px] text-green-500 uppercase tracking-wider mb-0.5">
                    Correct Answer
                  </span>
                  {m.correctAnswer}
                </div>
              </div>

              {m.explanation && (
                <div className="mt-3 text-xs text-gray-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-bold text-gray-700">Why: </span>
                  {m.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
