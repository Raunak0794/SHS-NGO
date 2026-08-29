import React, { useState } from "react";
import {
  GraduationCap,
  BookOpen,
  Target,
  Sparkles,
  Check,
  ArrowRight,
  Clock,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

const AVAILABLE_CLASSES = [
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
];

const ALL_SUBJECTS = [
  { id: "Mathematics", label: "Mathematics", icon: "📐" },
  { id: "Science", label: "Science", icon: "🔬" },
  { id: "English", label: "English", icon: "📖" },
  { id: "Social Science", label: "Social Science", icon: "🌍" },
  { id: "Hindi", label: "Hindi", icon: "🇮🇳" },
  { id: "Computer Science", label: "Computer Science", icon: "💻" },
];

const LEARNING_GOALS = [
  { id: "understanding_concepts", label: "Understand Difficult Concepts", desc: "Clear explanations & real-life examples" },
  { id: "homework", label: "Homework & Assignment Help", desc: "Hints & step-by-step guidance" },
  { id: "exam_prep", label: "Exam Preparation & Top Marks", desc: "High-scoring answers & practice quizzes" },
  { id: "revision", label: "Quick Notes & Formula Revision", desc: "Bite-sized summaries & flashcards" },
];

export default function OnboardingModal({ isOpen, onClose }) {
  const { user, updateUserProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedClass, setSelectedClass] = useState(user?.classLevel || "Class 8");
  const [selectedSubjects, setSelectedSubjects] = useState(
    user?.subjects?.length ? user.subjects : ["Mathematics", "Science", "English", "Social Science"]
  );
  const [selectedGoals, setSelectedGoals] = useState(
    user?.learningGoals?.length ? user.learningGoals : ["understanding_concepts", "exam_prep"]
  );
  const [dailyMinutes, setDailyMinutes] = useState(user?.dailyStudyGoalMinutes || 30);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const toggleSubject = (sub) => {
    if (selectedSubjects.includes(sub)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter((s) => s !== sub));
      } else {
        toast.error("Please keep at least one subject selected.");
      }
    } else {
      setSelectedSubjects([...selectedSubjects, sub]);
    }
  };

  const toggleGoal = (goalId) => {
    if (selectedGoals.includes(goalId)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== goalId));
    } else {
      setSelectedGoals([...selectedGoals, goalId]);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await updateUserProfile({
        classLevel: selectedClass,
        subjects: selectedSubjects,
        learningGoals: selectedGoals,
        dailyStudyGoalMinutes: dailyMinutes,
        onboardingCompleted: true,
      });
      toast.success("Welcome aboard! Your AI Study Copilot is personalized for you.");
      if (onClose) onClose();
    } catch (err) {
      toast.error("Could not save profile setup. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 md:p-8 shadow-2xl transition-all">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            Welcome to SHS AI, {user?.fullName?.firstName || "Learner"}!
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Let's customize your study copilot in 3 quick steps.
          </p>

          {/* Progress dots */}
          <div className="flex justify-center items-center gap-2 mt-4">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step === num ? "w-8 bg-indigo-600" : step > num ? "w-2 bg-green-500" : "w-2 bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Class Selection */}
        {step === 1 && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              Which class are you studying in?
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              SHS AI will tune its language, examples, and math steps to match your grade syllabus.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {AVAILABLE_CLASSES.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className={`p-4 rounded-xl border-2 font-semibold text-sm transition-all duration-200 flex flex-col items-center gap-1 ${
                    selectedClass === cls
                      ? "border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-sm scale-102"
                      : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
                  }`}
                >
                  <span className="text-lg">📚</span>
                  <span>{cls}</span>
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-primary inline-flex items-center gap-2 px-6 py-2.5"
              >
                Next: Choose Subjects <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Subject Selection */}
        {step === 2 && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              Select your subjects
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Pick the subjects you want SHS AI to help you learn and practice.
            </p>
            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
              {ALL_SUBJECTS.map((sub) => {
                const isChecked = selectedSubjects.includes(sub.id);
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => toggleSubject(sub.id)}
                    className={`p-3 rounded-xl border-2 font-medium text-sm text-left transition-all duration-200 flex items-center justify-between ${
                      isChecked
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{sub.icon}</span>
                      <span>{sub.label}</span>
                    </div>
                    {isChecked && <Check className="h-4 w-4 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-primary inline-flex items-center gap-2 px-6 py-2.5"
              >
                Next: Study Goals <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Goals & Daily Target */}
        {step === 3 && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-600" />
              What would you like the most help with?
            </h3>
            <div className="space-y-2 mb-5">
              {LEARNING_GOALS.map((goal) => {
                const isSelected = selectedGoals.includes(goal.id);
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleGoal(goal.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-900"
                        : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs">{goal.label}</div>
                      <div className="text-xs text-gray-500">{goal.desc}</div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-indigo-600 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>

            <div className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-600" />
                  Daily Study Goal:
                </span>
                <span className="text-xs font-bold text-indigo-600 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100">
                  {dailyMinutes} Minutes / Day
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="120"
                step="15"
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>15 min</span>
                <span>30 min</span>
                <span>45 min</span>
                <span>60 min</span>
                <span>120 min</span>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2 px-8 py-2.5 shadow-lg shadow-indigo-100"
              >
                {saving ? "Setting up..." : "Start Learning 🚀"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
