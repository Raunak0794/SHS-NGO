import React, { useState } from "react";
import {
  User,
  GraduationCap,
  BookOpen,
  Target,
  Clock,
  Calendar,
  Save,
  Check,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getGoogleAuthUrl } from "../services/api";
import toast from "react-hot-toast";

const AVAILABLE_CLASSES = ["Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];

const ALL_SUBJECTS = [
  "Mathematics",
  "Science",
  "English",
  "Social Science",
  "Hindi",
  "Computer Science",
];

export default function SettingsPage() {
  const { user, updateUserProfile } = useAuth();

  const [classLevel, setClassLevel] = useState(user?.classLevel || "Class 8");
  const [subjects, setSubjects] = useState(
    user?.subjects?.length ? user.subjects : ["Mathematics", "Science", "English", "Social Science"]
  );
  const [dailyMinutes, setDailyMinutes] = useState(user?.dailyStudyGoalMinutes || 30);
  const [saving, setSaving] = useState(false);

  const toggleSubject = (sub) => {
    if (subjects.includes(sub)) {
      if (subjects.length > 1) {
        setSubjects(subjects.filter((s) => s !== sub));
      } else {
        toast.error("Please keep at least one subject selected.");
      }
    } else {
      setSubjects([...subjects, sub]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile({
        classLevel,
        subjects,
        dailyStudyGoalMinutes: dailyMinutes,
      });
      toast.success("Settings saved successfully!");
    } catch (err) {
      toast.error("Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      const res = await getGoogleAuthUrl();
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      toast.error("Could not initialize Google Calendar authorization");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Settings & Profile ⚙️
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Customize your grade level, subject list, study goals, and Google Calendar connection.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Class Level */}
          <div className="rounded-3xl bg-white p-6 md:p-8 border border-gray-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              <span>Current Class Level</span>
            </h2>
            <p className="text-xs text-gray-500">
              SHS AI customizes explanations and quiz difficulty based on your grade syllabus.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {AVAILABLE_CLASSES.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setClassLevel(cls)}
                  className={`p-3.5 rounded-2xl border-2 font-bold text-xs sm:text-sm transition-all ${
                    classLevel === cls
                      ? "border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-xs"
                      : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          {/* Subjects */}
          <div className="rounded-3xl bg-white p-6 md:p-8 border border-gray-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <span>Enrolled Subjects</span>
            </h2>
            <p className="text-xs text-gray-500">
              Choose the subjects you study at school.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ALL_SUBJECTS.map((sub) => {
                const isChecked = subjects.includes(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => toggleSubject(sub)}
                    className={`p-3.5 rounded-2xl border-2 font-semibold text-xs transition flex items-center justify-between ${
                      isChecked
                        ? "border-indigo-600 bg-indigo-50/80 text-indigo-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
                    }`}
                  >
                    <span>{sub}</span>
                    {isChecked && <Check className="h-4 w-4 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daily Goal */}
          <div className="rounded-3xl bg-white p-6 md:p-8 border border-gray-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              <span>Daily Study Target</span>
            </h2>
            <p className="text-xs text-gray-500">
              Set how many minutes you want to study every day to maintain your streak.
            </p>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min="15"
                max="120"
                step="15"
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl whitespace-nowrap border border-indigo-100">
                {dailyMinutes} min / day
              </span>
            </div>
          </div>

          {/* Google Calendar Connection */}
          <div className="rounded-3xl bg-white p-6 md:p-8 border border-gray-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <span>Google Calendar Integration</span>
            </h2>
            <p className="text-xs text-gray-500">
              Sync your AI exam study plans directly to your Google Calendar.
            </p>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-semibold text-gray-700">
                Google Calendar Sync
              </span>
              <button
                type="button"
                onClick={handleConnectGoogleCalendar}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-indigo-600 text-xs font-bold shadow-xs transition"
              >
                <span>Connect / Reauthorize</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Save Action */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-xs font-bold shadow-lg shadow-indigo-100"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
