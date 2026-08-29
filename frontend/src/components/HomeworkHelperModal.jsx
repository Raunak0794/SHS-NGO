import React, { useState } from "react";
import { HelpCircle, Sparkles, Lightbulb, Footprints, CheckCircle, X, Loader2 } from "lucide-react";
import { homeworkHelper } from "../services/api";
import toast from "react-hot-toast";

export default function HomeworkHelperModal({ isOpen, onClose, initialSubject = "Mathematics" }) {
  const [problem, setProblem] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [stepType, setStepType] = useState("understand");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleAsk = async (type) => {
    if (!problem.trim()) {
      toast.error("Please enter your homework question.");
      return;
    }

    const currentType = type || stepType;
    setStepType(currentType);
    setLoading(true);
    try {
      const res = await homeworkHelper({
        problem: problem.trim(),
        subject,
        stepType: currentType,
      });
      setResult(res.data);
    } catch (err) {
      toast.error("Could not get homework help. Please try again.");
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
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-base">Homework Helper</h3>
              <p className="text-xs text-gray-500">Step-by-step guidance so you learn how to solve it</p>
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

        {/* Input */}
        <div className="space-y-3 overflow-y-auto pr-1">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-700">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="text-xs font-semibold rounded-lg border border-gray-200 px-2 py-1 bg-white text-gray-700"
              >
                <option value="Mathematics">Mathematics</option>
                <option value="Science">Science</option>
                <option value="English">English</option>
                <option value="Social Science">Social Science</option>
              </select>
            </div>

            <textarea
              rows={3}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Paste or type your homework question here (e.g., 'Solve for x: 3x + 12 = 27' or 'Explain how water cycle works')..."
              className="w-full rounded-2xl border border-gray-200 p-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleAsk("understand")}
              disabled={loading}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                stepType === "understand" && result
                  ? "bg-purple-50 border-purple-400 text-purple-700"
                  : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
              }`}
            >
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span>Understand</span>
            </button>

            <button
              type="button"
              onClick={() => handleAsk("hint")}
              disabled={loading}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                stepType === "hint" && result
                  ? "bg-amber-50 border-amber-400 text-amber-700"
                  : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
              }`}
            >
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span>Give a Hint</span>
            </button>

            <button
              type="button"
              onClick={() => handleAsk("next_step")}
              disabled={loading}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                stepType === "next_step" && result
                  ? "bg-blue-50 border-blue-400 text-blue-700"
                  : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
              }`}
            >
              <Footprints className="h-4 w-4 text-blue-600" />
              <span>Next Step</span>
            </button>

            <button
              type="button"
              onClick={() => handleAsk("solution")}
              disabled={loading}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                stepType === "solution" && result
                  ? "bg-green-50 border-green-400 text-green-700"
                  : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
              }`}
            >
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Full Solution</span>
            </button>
          </div>

          {/* Response Box */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-slate-100 text-purple-600">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <span className="text-xs font-medium text-gray-500">Thinking step-by-step for you...</span>
            </div>
          ) : result ? (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm text-gray-800 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap">
              {result.guidance}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
