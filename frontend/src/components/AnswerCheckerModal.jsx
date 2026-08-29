import React, { useState } from "react";
import { CheckCircle2, Sparkles, AlertCircle, X, Loader2, Award } from "lucide-react";
import { checkAnswer } from "../services/api";
import toast from "react-hot-toast";

export default function AnswerCheckerModal({ isOpen, onClose, initialSubject = "Science" }) {
  const [question, setQuestion] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  if (!isOpen) return null;

  const handleEvaluate = async (e) => {
    e.preventDefault();
    if (!question.trim() || !studentAnswer.trim()) {
      toast.error("Please enter both the question and your answer.");
      return;
    }

    setLoading(true);
    try {
      const res = await checkAnswer({
        question: question.trim(),
        studentAnswer: studentAnswer.trim(),
        subject,
      });
      setEvaluation(res.data);
    } catch (err) {
      toast.error("Could not check answer right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-green-100 text-green-700">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-base">Instant Answer Checker</h3>
              <p className="text-xs text-gray-500">Check how many marks your answer would get and how to improve</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleEvaluate} className="space-y-3 overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Question / Problem</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Why do leaves appear green in sunlight?"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Your Answer</label>
            <textarea
              rows={3}
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              placeholder="Write your answer as you would in your exam notebook..."
              className="w-full rounded-2xl border border-gray-200 p-3 text-xs focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none resize-none"
            />
          </div>

          <div className="flex justify-between items-center pt-1">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-xs font-semibold rounded-lg border border-gray-200 px-2.5 py-1.5 bg-white text-gray-700"
            >
              <option value="Science">Science</option>
              <option value="Mathematics">Mathematics</option>
              <option value="English">English</option>
              <option value="Social Science">Social Science</option>
            </select>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary inline-flex items-center gap-1.5 px-6 py-2 text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Check My Answer</span>
                </>
              )}
            </button>
          </div>

          {/* Results Box */}
          {evaluation && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      evaluation.status === "correct"
                        ? "bg-green-100 text-green-700"
                        : evaluation.status === "partially_correct"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {evaluation.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>
                <div className="text-sm font-bold text-gray-800">
                  Score: <span className="text-indigo-600">{evaluation.score}</span> / 10
                </div>
              </div>

              {evaluation.strengths && evaluation.strengths.length > 0 && (
                <div className="text-xs text-green-700 bg-green-50 p-2.5 rounded-xl border border-green-100">
                  <span className="font-bold block mb-0.5">🌟 What you got right:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {evaluation.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.improvements && evaluation.improvements.length > 0 && (
                <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                  <span className="font-bold block mb-0.5">💡 How to get full marks:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {evaluation.improvements.map((imp, idx) => (
                      <li key={idx}>{imp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.modelAnswer && (
                <div className="text-xs text-gray-700 bg-white p-3 rounded-xl border border-gray-200">
                  <span className="font-bold text-indigo-700 block mb-0.5">📖 Ideal Exam Answer:</span>
                  {evaluation.modelAnswer}
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
