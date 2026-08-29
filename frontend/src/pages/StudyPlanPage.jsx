import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { generateStudyPlan, syncCalendarPlan, getGoogleAuthUrl } from "../services/api";
import toast from "react-hot-toast";

export default function StudyPlanPage() {
  const { user } = useAuth();
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [chaptersInput, setChaptersInput] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(45);
  const [loading, setLoading] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);

  // Set default date to 10 days from today
  useEffect(() => {
    const future = new Date(Date.now() + 10 * 86400000);
    setExamDate(future.toISOString().split("T")[0]);
  }, []);

  const handleGeneratePlan = async (e) => {
    e.preventDefault();
    if (!examName.trim() || !examDate) {
      toast.error("Please enter both exam name and target date.");
      return;
    }

    const chapters = chaptersInput
      .split(/,|\n/)
      .map((c) => c.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      const res = await generateStudyPlan({
        examName: examName.trim(),
        examDate,
        subject,
        chapters,
        dailyMinutes: Number(dailyMinutes),
      });

      setGeneratedPlan(res.data?.plan);
      toast.success("Exam study plan generated!");
    } catch (err) {
      toast.error("Could not generate study plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCalendar = async () => {
    if (!generatedPlan?.schedule || generatedPlan.schedule.length === 0) {
      toast.error("No sessions available to sync.");
      return;
    }

    setSyncingCalendar(true);
    try {
      const sessions = generatedPlan.schedule.map((item) => ({
        topic: item.topic,
        subject: item.subject || subject,
        date: item.date,
        durationMinutes: item.durationMinutes || dailyMinutes,
        tasks: item.tasks || ["Review key formulas", "Solve 5 practice problems"],
      }));

      await syncCalendarPlan({ sessions });
      toast.success("Study sessions synced to your Google Calendar!");
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (/calendar/i.test(msg)) {
        toast.error("Google Calendar not connected. Connect below.");
      } else {
        toast.error(msg || "Could not sync with Google Calendar");
      }
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const res = await getGoogleAuthUrl();
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      toast.error("Could not start Google authorization");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <CalendarIcon className="h-7 w-7 text-indigo-600" />
              <span>Exam Revision Planner</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              AI creates a day-by-day timetable prioritizing your weak topics and syncs it with Google Calendar.
            </p>
          </div>
        </div>

        {/* Plan Configuration Form */}
        <div className="rounded-3xl bg-white p-6 md:p-8 border border-gray-200/80 shadow-xs">
          <form onSubmit={handleGeneratePlan} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Exam Name / Title
                </label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g. Mid-Term Science Exam, Term 1 Math Assessment"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Exam Date
                </label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs font-semibold text-gray-700 bg-white"
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="English">English</option>
                  <option value="Social Science">Social Science</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Computer Science">Computer Science</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Daily Revision Time
                </label>
                <select
                  value={dailyMinutes}
                  onChange={(e) => setDailyMinutes(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs font-semibold text-gray-700 bg-white"
                >
                  <option value="30">30 Minutes / Day</option>
                  <option value="45">45 Minutes / Day</option>
                  <option value="60">60 Minutes / Day</option>
                  <option value="90">90 Minutes / Day</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Chapters / Topics on the Exam (Comma-separated)
              </label>
              <textarea
                rows={2}
                value={chaptersInput}
                onChange={(e) => setChaptersInput(e.target.value)}
                placeholder="e.g. Linear Equations, Triangles, Statistics, Coordinate Geometry"
                className="w-full rounded-xl border border-gray-200 p-3 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Planning Timetable...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Revision Plan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Generated Plan View */}
        {generatedPlan && (
          <div className="space-y-6 animate-fadeIn">
            <div className="rounded-3xl bg-white p-6 md:p-8 border border-gray-200/80 shadow-xs space-y-6">
              {/* Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{generatedPlan.examName}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {generatedPlan.daysRemaining} days remaining • {dailyMinutes} mins per session
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncCalendar}
                    disabled={syncingCalendar}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-md shadow-green-100 transition"
                  >
                    {syncingCalendar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarIcon className="h-4 w-4" />
                    )}
                    <span>Sync to Google Calendar</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConnectCalendar}
                    className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-semibold transition"
                    title="Connect Google Calendar Account"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Schedule Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Daily Revision Schedule
                </h4>

                <div className="space-y-3">
                  {(generatedPlan.schedule || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-200 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center justify-center h-12 w-12 rounded-xl bg-white border border-gray-200 font-bold text-xs shrink-0">
                          <span className="text-[10px] text-gray-400 uppercase">Day</span>
                          <span className="text-indigo-600 text-sm">{item.day || idx + 1}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-gray-900 text-xs sm:text-sm">
                              {item.topic}
                            </h5>
                            {item.isWeakTopic && (
                              <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Priority Weak Concept
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {Array.isArray(item.tasks) ? item.tasks.join(" • ") : item.tasks}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          {item.durationMinutes || dailyMinutes} min
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
