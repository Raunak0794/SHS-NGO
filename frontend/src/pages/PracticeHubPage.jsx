import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Brain,
  Layers,
  BookMarked,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  Award,
  RotateCw,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  generateQuiz,
  submitQuiz,
  generateFlashcards,
  generateRevisionNotes,
  getRevisionNotes,
  deleteRevisionNote,
  getMaterials,
} from "../services/api";
import MistakeBook from "../components/MistakeBook";
import FlashcardDeck from "../components/FlashcardDeck";
import toast from "react-hot-toast";

export default function PracticeHubPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "quiz";
  const defaultSubject = searchParams.get("subject") || "Science";
  const defaultDoc = searchParams.get("doc") || "";

  // Quiz State
  const [quizSubject, setQuizSubject] = useState(defaultSubject);
  const [quizSource, setQuizSource] = useState(defaultDoc ? "document" : "subject");
  const [quizDocId, setQuizDocId] = useState(defaultDoc);
  const [quizDifficulty, setQuizDifficulty] = useState("adaptive");
  const [quizCount, setQuizCount] = useState(5);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizResults, setQuizResults] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // Flashcards State
  const [flashcardSubject, setFlashcardSubject] = useState(defaultSubject);
  const [flashcardTopic, setFlashcardTopic] = useState("Core Concepts");
  const [flashcards, setFlashcards] = useState([]);
  const [loadingFlashcards, setLoadingFlashcards] = useState(false);

  // Revision Notes State
  const [notesTitle, setNotesTitle] = useState("");
  const [notesSubject, setNotesSubject] = useState("Science");
  const [notesType, setNotesType] = useState("notes");
  const [savedNotes, setSavedNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [generatingNotes, setGeneratingNotes] = useState(false);

  // Materials list
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    getMaterials().then((res) => setMaterials(res.data?.materials || [])).catch(() => {});
    loadSavedNotes();
  }, []);

  const loadSavedNotes = async () => {
    setLoadingNotes(true);
    try {
      const res = await getRevisionNotes();
      setSavedNotes(res.data?.notes || []);
    } catch (err) {
      console.error("Load revision notes error:", err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleStartQuiz = async (e) => {
    if (e) e.preventDefault();
    setLoadingQuiz(true);
    setQuizResults(null);
    setSelectedAnswers({});
    try {
      const res = await generateQuiz({
        sourceType: quizSource,
        subject: quizSubject,
        documentId: quizDocId || undefined,
        numQuestions: quizCount,
        difficulty: quizDifficulty,
      });

      setQuizQuestions(res.data?.questions || []);
      if ((res.data?.questions || []).length === 0) {
        toast.error("No questions could be generated. Try a different topic.");
      }
    } catch (err) {
      toast.error("Could not generate quiz. Please try again.");
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleSelectOption = (questionId, option) => {
    if (quizResults) return; // locked after submission
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitQuiz = async () => {
    const unanswered = quizQuestions.filter((q) => !selectedAnswers[q._id]);
    if (unanswered.length > 0) {
      if (!window.confirm(`You haven't answered ${unanswered.length} question(s). Submit anyway?`)) {
        return;
      }
    }

    setSubmittingQuiz(true);
    try {
      const payloadAnswers = quizQuestions.map((q) => ({
        _id: q._id,
        question: q.question,
        options: q.options,
        userAnswer: selectedAnswers[q._id] || "",
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        topic: q.topic || quizSubject,
      }));

      const res = await submitQuiz({
        subject: quizSubject,
        answers: payloadAnswers,
      });

      setQuizResults(res.data);
      toast.success("Quiz submitted! Topic mastery updated.");
    } catch (err) {
      toast.error("Could not submit quiz");
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleGenerateFlashcards = async (e) => {
    e.preventDefault();
    setLoadingFlashcards(true);
    try {
      const res = await generateFlashcards({
        subject: flashcardSubject,
        topic: flashcardTopic,
      });
      setFlashcards(res.data?.flashcards || []);
    } catch (err) {
      toast.error("Could not generate flashcards");
    } finally {
      setLoadingFlashcards(false);
    }
  };

  const handleGenerateNotes = async (e) => {
    e.preventDefault();
    setGeneratingNotes(true);
    try {
      const res = await generateRevisionNotes({
        title: notesTitle,
        subject: notesSubject,
        type: notesType,
      });
      setSavedNotes((prev) => [res.data?.revision, ...prev]);
      setNotesTitle("");
      toast.success("Revision sheet created!");
    } catch (err) {
      toast.error("Could not generate revision notes");
    } finally {
      setGeneratingNotes(false);
    }
  };

  const handleDeleteNote = async (id) => {
    try {
      await deleteRevisionNote(id);
      setSavedNotes((prev) => prev.filter((n) => n._id !== id));
      toast.success("Note deleted");
    } catch (err) {
      toast.error("Could not delete note");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <span>Practice & Revision Hub</span>
              <Award className="h-6 w-6 text-yellow-500" />
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Adaptive tests, flashcards, mistake revisions, and formula sheets tailored for {user?.classLevel || "Class 8"}.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
          {[
            { id: "quiz", label: "Adaptive Quizzes", icon: Brain },
            { id: "flashcards", label: "Flashcards", icon: Layers },
            { id: "mistakes", label: "Mistake Book", icon: BookMarked },
            { id: "notes", label: "Quick Revision Notes", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSearchParams({ tab: tab.id })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-102"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Adaptive Quizzes */}
        {activeTab === "quiz" && (
          <div className="space-y-6">
            {quizQuestions.length === 0 ? (
              <div className="rounded-3xl bg-white p-6 md:p-8 border border-gray-200/80 shadow-xs max-w-2xl mx-auto">
                <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-indigo-600" />
                  <span>Configure Practice Quiz</span>
                </h2>

                <form onSubmit={handleStartQuiz} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Question Source
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "subject", label: "Entire Subject" },
                        { id: "weak_topics", label: "My Weak Topics" },
                        { id: "document", label: "Uploaded Notes" },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setQuizSource(s.id)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                            quizSource === s.id
                              ? "bg-indigo-50 border-indigo-500 text-indigo-700 font-bold"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {quizSource === "document" && materials.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Select Study Material
                      </label>
                      <select
                        value={quizDocId}
                        onChange={(e) => setQuizDocId(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 p-2.5 text-xs font-semibold bg-white text-gray-700"
                      >
                        <option value="">Choose a document...</option>
                        {materials.map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.title} ({m.subject})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Subject
                      </label>
                      <select
                        value={quizSubject}
                        onChange={(e) => setQuizSubject(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 p-2.5 text-xs font-semibold bg-white text-gray-700"
                      >
                        <option value="Science">Science</option>
                        <option value="Mathematics">Mathematics</option>
                        <option value="English">English</option>
                        <option value="Social Science">Social Science</option>
                        <option value="Hindi">Hindi</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Difficulty
                      </label>
                      <select
                        value={quizDifficulty}
                        onChange={(e) => setQuizDifficulty(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 p-2.5 text-xs font-semibold bg-white text-gray-700"
                      >
                        <option value="adaptive">Adaptive (Auto)</option>
                        <option value="easy">Easy (Fundamentals)</option>
                        <option value="medium">Medium (Standard)</option>
                        <option value="hard">Hard (Advanced)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Questions
                      </label>
                      <select
                        value={quizCount}
                        onChange={(e) => setQuizCount(Number(e.target.value))}
                        className="w-full rounded-xl border border-gray-200 p-2.5 text-xs font-semibold bg-white text-gray-700"
                      >
                        <option value="3">3 Questions</option>
                        <option value="5">5 Questions</option>
                        <option value="10">10 Questions</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loadingQuiz}
                      className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100"
                    >
                      {loadingQuiz ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Generating Adaptive Quiz...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Start Practice Quiz</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Active Quiz Screen */
              <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
                {/* Result Card if submitted */}
                {quizResults && (
                  <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white shadow-xl flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                        Quiz Completed
                      </span>
                      <h3 className="text-2xl font-black mt-1">
                        Score: {quizResults.correctCount} / {quizResults.totalQuestions} ({quizResults.accuracy}%)
                      </h3>
                      <p className="text-xs text-indigo-100 mt-1">{quizResults.message}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setQuizQuestions([])}
                      className="px-5 py-2.5 rounded-2xl bg-white text-indigo-700 text-xs font-bold hover:bg-indigo-50 shadow-md transition"
                    >
                      New Quiz
                    </button>
                  </div>
                )}

                {/* Questions List */}
                <div className="space-y-4">
                  {quizQuestions.map((q, qIndex) => {
                    const isSubmitted = !!quizResults;
                    const userAnswer = selectedAnswers[q._id];
                    const isCorrect = isSubmitted && userAnswer === q.correctAnswer;

                    return (
                      <div
                        key={q._id}
                        className={`rounded-3xl bg-white p-6 border shadow-xs transition-all ${
                          isSubmitted
                            ? isCorrect
                              ? "border-green-300 bg-green-50/20"
                              : "border-red-300 bg-red-50/20"
                            : "border-gray-200/80"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="rounded-lg bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                            Question {qIndex + 1}
                          </span>
                          <span className="text-xs font-semibold text-gray-400">
                            Topic: {q.topic || quizSubject}
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-4">
                          {q.question}
                        </h3>

                        {/* Options */}
                        <div className="space-y-2">
                          {(q.options || []).map((opt, optIdx) => {
                            const isSelected = selectedAnswers[q._id] === opt;
                            let optionClass = "border-gray-200 hover:bg-gray-50 text-gray-700";

                            if (isSubmitted) {
                              if (opt === q.correctAnswer) {
                                optionClass = "border-green-500 bg-green-50 text-green-800 font-bold";
                              } else if (isSelected && opt !== q.correctAnswer) {
                                optionClass = "border-red-500 bg-red-50 text-red-800";
                              } else {
                                optionClass = "border-gray-200 opacity-60 text-gray-600";
                              }
                            } else if (isSelected) {
                              optionClass = "border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold shadow-xs";
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => handleSelectOption(q._id, opt)}
                                className={`w-full p-3 rounded-2xl border text-xs sm:text-sm text-left transition flex items-center justify-between ${optionClass}`}
                              >
                                <span>{opt}</span>
                                {isSubmitted && opt === q.correctAnswer && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 ml-2" />
                                )}
                                {isSubmitted && isSelected && opt !== q.correctAnswer && (
                                  <XCircle className="h-4 w-4 text-red-600 shrink-0 ml-2" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation after submit */}
                        {isSubmitted && (
                          <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-gray-700">
                            <span className="font-bold text-gray-800">Explanation: </span>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Submit Action */}
                {!quizResults && (
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setQuizQuestions([])}
                      className="px-5 py-2.5 rounded-2xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitQuiz}
                      disabled={submittingQuiz}
                      className="btn-primary px-8 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100"
                    >
                      {submittingQuiz ? "Submitting..." : "Submit Answers"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Flashcards */}
        {activeTab === "flashcards" && (
          <div className="space-y-6 max-w-2xl mx-auto">
            {flashcards.length === 0 ? (
              <div className="rounded-3xl bg-white p-6 md:p-8 border border-gray-200/80 shadow-xs">
                <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  <span>Generate Flashcards</span>
                </h2>

                <form onSubmit={handleGenerateFlashcards} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Subject
                    </label>
                    <select
                      value={flashcardSubject}
                      onChange={(e) => setFlashcardSubject(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 p-2.5 text-xs font-semibold bg-white text-gray-700"
                    >
                      <option value="Science">Science</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="English">English</option>
                      <option value="Social Science">Social Science</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Topic or Concept
                    </label>
                    <input
                      type="text"
                      value={flashcardTopic}
                      onChange={(e) => setFlashcardTopic(e.target.value)}
                      placeholder="e.g. Light reflection laws, Chemical reactions, Triangle congruency"
                      className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loadingFlashcards}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100"
                  >
                    {loadingFlashcards ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Creating Flashcards...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Generate Flashcards</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                <FlashcardDeck
                  flashcards={flashcards}
                  subject={flashcardSubject}
                  topic={flashcardTopic}
                  onDone={() => setFlashcards([])}
                />
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setFlashcards([])}
                    className="text-xs text-indigo-600 hover:underline font-semibold"
                  >
                    Generate Another Set
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Mistake Book */}
        {activeTab === "mistakes" && (
          <div className="max-w-4xl mx-auto">
            <MistakeBook />
          </div>
        )}

        {/* Tab 4: Quick Notes & Formula Sheets */}
        {activeTab === "notes" && (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Generate Sheet */}
            <div className="rounded-3xl bg-white p-6 md:p-8 border border-gray-200/80 shadow-xs">
              <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <span>Create Revision Notes or Formula Sheet</span>
              </h2>

              <form onSubmit={handleGenerateNotes} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Title / Topic
                    </label>
                    <input
                      type="text"
                      value={notesTitle}
                      onChange={(e) => setNotesTitle(e.target.value)}
                      placeholder="e.g. Class 9 Physics Motion Formulas or Biology Digestion Steps"
                      className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Format
                    </label>
                    <select
                      value={notesType}
                      onChange={(e) => setNotesType(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 p-2.5 text-xs font-semibold bg-white text-gray-700"
                    >
                      <option value="notes">Quick Revision Notes</option>
                      <option value="formula_sheet">Formula Sheet</option>
                      <option value="definitions">Key Definitions</option>
                      <option value="exam_points">Exam High-Score Points</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={generatingNotes}
                    className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold"
                  >
                    {generatingNotes ? "Generating..." : "Generate & Save"}
                  </button>
                </div>
              </form>
            </div>

            {/* Saved Notes List */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Saved Revision Sheets ({savedNotes.length})
              </h3>

              {savedNotes.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400 bg-white rounded-3xl border border-gray-200">
                  No saved revision sheets yet. Create one above!
                </div>
              ) : (
                <div className="space-y-4">
                  {savedNotes.map((n) => (
                    <div
                      key={n._id}
                      className="rounded-3xl bg-white p-6 border border-gray-200/80 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                            {n.subject}
                          </span>
                          <h4 className="font-bold text-gray-900 text-sm">{n.title}</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(n._id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {n.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
