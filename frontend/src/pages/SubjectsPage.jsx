import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Brain,
  Sparkles,
  Award,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getProgressDashboard, getMaterials } from "../services/api";

const SUBJECT_DETAILS = {
  Mathematics: {
    icon: "📐",
    color: "from-blue-500 to-indigo-600",
    desc: "Numbers, Algebra, Geometry, Mensuration & Arithmetic",
  },
  Science: {
    icon: "🔬",
    color: "from-emerald-500 to-teal-600",
    desc: "Physics, Chemistry, Biology & Environmental Science",
  },
  English: {
    icon: "📖",
    color: "from-violet-500 to-purple-600",
    desc: "Grammar, Reading Comprehension, Vocabulary & Writing",
  },
  "Social Science": {
    icon: "🌍",
    color: "from-amber-500 to-orange-600",
    desc: "History, Geography, Civics & Economics",
  },
  Hindi: {
    icon: "🇮🇳",
    color: "from-rose-500 to-pink-600",
    desc: "Vyakaran, Sahitya, Reading & Writing",
  },
  "Computer Science": {
    icon: "💻",
    color: "from-cyan-500 to-blue-600",
    desc: "Coding fundamentals, Algorithms & Digital literacy",
  },
};

export default function SubjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, matRes] = await Promise.all([
        getProgressDashboard().catch(() => ({ data: {} })),
        getMaterials().catch(() => ({ data: {} })),
      ]);
      setDashboardData(dashRes.data || {});
      setMaterials(matRes.data?.materials || []);
    } catch (err) {
      console.error("Load subjects error:", err);
    } finally {
      setLoading(false);
    }
  };

  const studentSubjects = user?.subjects?.length
    ? user.subjects
    : ["Mathematics", "Science", "English", "Social Science"];

  const subjectProgressList = dashboardData?.subjectProgress || [];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <span>My Subjects</span>
              {user?.classLevel && (
                <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                  {user.classLevel}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track mastery, explore notes, and take adaptive tests across all your subjects.
            </p>
          </div>

          <Link
            to="/practice?tab=quiz"
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 self-start sm:self-auto"
          >
            <Brain className="h-4 w-4" />
            <span>Practice All Subjects</span>
          </Link>
        </div>

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studentSubjects.map((sub) => {
            const detail = SUBJECT_DETAILS[sub] || {
              icon: "📚",
              color: "from-indigo-500 to-purple-600",
              desc: "Curriculum study and revision",
            };

            const progress = subjectProgressList.find(
              (p) => p.subject.toLowerCase() === sub.toLowerCase()
            );
            const mastery = progress?.mastery || 50;
            const subMaterials = materials.filter(
              (m) => (m.subject || "General").toLowerCase() === sub.toLowerCase()
            );

            return (
              <div
                key={sub}
                className="rounded-3xl bg-white p-6 border border-gray-200/80 shadow-xs hover:shadow-lg hover:border-indigo-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        {detail.icon}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">{sub}</h2>
                        <span className="text-xs text-gray-400">
                          {subMaterials.length} {subMaterials.length === 1 ? "Note" : "Notes"} Uploaded
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-indigo-600">{mastery}%</span>
                      <span className="block text-[10px] text-gray-400 uppercase font-semibold">
                        Mastery
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-4">{detail.desc}</p>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mb-5">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-500 to-purple-500"
                      style={{ width: `${mastery}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to={`/tutor?subject=${encodeURIComponent(sub)}`}
                      className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Ask AI Tutor</span>
                    </Link>

                    <Link
                      to={`/practice?tab=quiz&subject=${encodeURIComponent(sub)}`}
                      className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition"
                    >
                      <Brain className="h-3.5 w-3.5" />
                      <span>Take Quiz</span>
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to={`/practice?tab=flashcards&subject=${encodeURIComponent(sub)}`}
                      className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-gray-700 text-xs font-semibold transition"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>Flashcards</span>
                    </Link>

                    <Link
                      to={`/materials?subject=${encodeURIComponent(sub)}`}
                      className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-gray-700 text-xs font-semibold transition"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>View Notes</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
