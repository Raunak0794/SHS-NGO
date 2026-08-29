import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Sparkles,
  Send,
  BookOpen,
  HelpCircle,
  Award,
  Bookmark,
  BookmarkCheck,
  Plus,
  Trash2,
  FileText,
  Loader2,
  ChevronDown,
  Layers,
  GraduationCap,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  sendChatMessage,
  getConversations,
  getConversation,
  deleteConversation,
  saveMessage,
  simplifyExplanation,
  getMaterials,
} from "../services/api";
import SourceCitationCard from "../components/SourceCitationCard";
import SpeechReader from "../components/SpeechReader";
import HomeworkHelperModal from "../components/HomeworkHelperModal";
import AnswerCheckerModal from "../components/AnswerCheckerModal";
import toast from "react-hot-toast";

const MODES = [
  { id: "material", label: "My Notes", icon: "📚", desc: "Answers strictly grounded in your uploaded materials" },
  { id: "general", label: "General AI", icon: "🤖", desc: "Grade-appropriate general knowledge" },
  { id: "tutor", label: "Teach Me", icon: "🧑‍🏫", desc: "Socratic guidance with real-life analogies" },
  { id: "exam", label: "Exam Prep", icon: "📝", desc: "Model answers, marks distribution, and keywords" },
];

export default function AITutorPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialSubject = searchParams.get("subject") || "General";
  const initialDocId = searchParams.get("doc") || "";

  // State
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Settings for current session
  const [mode, setMode] = useState("material");
  const [subject, setSubject] = useState(initialSubject);
  const [documentId, setDocumentId] = useState(initialDocId);
  const [materials, setMaterials] = useState([]);

  // Modals
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showAnswerModal, setShowAnswerModal] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load conversations & materials list on mount
  useEffect(() => {
    loadConversations();
    loadMaterialsList();
  }, []);

  const loadConversations = async () => {
    try {
      const res = await getConversations();
      const list = res.data?.conversations || [];
      setConversations(list);
      if (list.length > 0 && !activeConversationId) {
        selectConversation(list[0]._id);
      }
    } catch (err) {
      console.error("Load conversations error:", err);
    }
  };

  const loadMaterialsList = async () => {
    try {
      const res = await getMaterials();
      setMaterials(res.data?.materials || []);
    } catch (err) {
      console.error("Load materials error:", err);
    }
  };

  const selectConversation = async (convId) => {
    setActiveConversationId(convId);
    setLoadingHistory(true);
    try {
      const res = await getConversation(convId);
      setMessages(res.data?.messages || []);
      if (res.data?.conversation) {
        setMode(res.data.conversation.mode || "material");
        setSubject(res.data.conversation.subject || "General");
      }
    } catch (err) {
      toast.error("Could not load chat messages");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInputText("");
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      if (activeConversationId === convId) {
        handleNewChat();
      }
      toast.success("Chat deleted");
    } catch (err) {
      toast.error("Could not delete chat");
    }
  };

  const handleSendMessage = async (textToSend, customMode) => {
    const text = textToSend || inputText;
    if (!text || !text.trim() || loading) return;

    const userMessage = {
      _id: `temp-${Date.now()}`,
      role: "user",
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    try {
      const res = await sendChatMessage({
        message: text.trim(),
        conversationId: activeConversationId,
        mode: customMode || mode,
        subject,
        documentId: documentId || undefined,
      });

      if (res.data?.conversationId && !activeConversationId) {
        setActiveConversationId(res.data.conversationId);
        loadConversations();
      }

      if (res.data?.message) {
        setMessages((prev) => [...prev, res.data.message]);
      }
    } catch (err) {
      console.error("Send message error:", err);
      toast.error("Could not send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimplify = async (previousQuestion, previousAnswer, topic) => {
    setLoading(true);
    try {
      const res = await simplifyExplanation({
        previousQuestion,
        previousAnswer,
        topic: topic || subject,
      });

      if (res.data?.answer) {
        const simplifiedMsg = {
          _id: `sim-${Date.now()}`,
          role: "assistant",
          content: `### 💡 Simpler Explanation:\n${res.data.answer}`,
          detectedConcepts: [topic || subject],
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, simplifiedMsg]);
      }
    } catch (err) {
      toast.error("Could not simplify explanation");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMessage = async (msgId) => {
    try {
      const res = await saveMessage(msgId);
      setMessages((prev) =>
        prev.map((m) => (m._id === msgId ? { ...m, isSaved: res.data?.isSaved } : m))
      );
      toast.success(res.data?.message || "Updated revision notes");
    } catch (err) {
      toast.error("Could not save message");
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden">
      {/* Homework Modal */}
      <HomeworkHelperModal
        isOpen={showHomeworkModal}
        onClose={() => setShowHomeworkModal(false)}
        initialSubject={subject}
      />

      {/* Answer Checker Modal */}
      <AnswerCheckerModal
        isOpen={showAnswerModal}
        onClose={() => setShowAnswerModal(false)}
        initialSubject={subject}
      />

      {/* Sidebar: Conversations */}
      <aside className="hidden md:flex w-72 flex-col border-r border-gray-200 bg-white p-4">
        <button
          type="button"
          onClick={handleNewChat}
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs shadow-md shadow-indigo-100 mb-4"
        >
          <Plus className="h-4 w-4" />
          <span>New Study Chat</span>
        </button>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-2">
            Recent Chats
          </div>
          {conversations.map((c) => (
            <div
              key={c._id}
              onClick={() => selectConversation(c._id)}
              className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs font-medium transition ${
                activeConversationId === c._id
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                <span className="truncate">{c.title || "Study Session"}</span>
              </div>
              <button
                type="button"
                onClick={(e) => handleDeleteConversation(c._id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-400">
              No previous chats. Ask a question to start!
            </div>
          )}
        </div>

        {/* Quick Tools in sidebar */}
        <div className="pt-3 border-t border-gray-100 space-y-1.5">
          <button
            type="button"
            onClick={() => setShowHomeworkModal(true)}
            className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Homework Helper</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAnswerModal(true)}
            className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition"
          >
            <Award className="h-4 w-4" />
            <span>Check My Answer</span>
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-white">
        {/* Chat Control Header */}
        <div className="border-b border-gray-100 bg-white/90 backdrop-blur-sm p-3.5 flex flex-wrap items-center justify-between gap-3">
          {/* Mode Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                title={m.desc}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  mode === m.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Subject & Document Filter */}
          <div className="flex items-center gap-2 text-xs">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-xl border border-gray-200 px-2.5 py-1.5 font-semibold text-gray-700 bg-white focus:outline-none"
            >
              <option value="General">All Subjects</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Science">Science</option>
              <option value="English">English</option>
              <option value="Social Science">Social Science</option>
            </select>

            {materials.length > 0 && (
              <select
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="rounded-xl border border-gray-200 px-2.5 py-1.5 font-semibold text-gray-700 bg-white focus:outline-none max-w-[140px] truncate"
              >
                <option value="">All Notes</option>
                {materials.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 && !loadingHistory && (
            <div className="max-w-md mx-auto text-center py-12 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-100">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">
                Hi {user?.fullName?.firstName || "there"}! Ask anything.
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                I'm your {user?.classLevel || "Class 8"} AI Study Copilot. Ask questions from your uploaded notes, get math steps, or prepare for exams!
              </p>

              {/* Sample Starters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4">
                {[
                  "Explain photosynthesis with a simple real-life example",
                  "Solve 2x + 5 = 15 step-by-step",
                  "What are the main causes of water pollution?",
                  "Give me 3 practice questions on Algebra",
                ].map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="p-3 rounded-2xl bg-indigo-50/60 hover:bg-indigo-100/70 border border-indigo-100 text-left text-xs font-semibold text-indigo-900 transition"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingHistory ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === "user";
              const prevUserMsg = !isUser && index > 0 && messages[index - 1].role === "user" ? messages[index - 1] : null;

              return (
                <div
                  key={msg._id || index}
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} animate-fadeIn`}
                >
                  {!isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-xs text-xs font-bold">
                      AI
                    </div>
                  )}

                  <div
                    className={`relative max-w-2xl rounded-3xl px-5 py-4 ${
                      isUser
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 rounded-tr-xs"
                        : "bg-slate-50 border border-gray-200/80 text-gray-800 rounded-tl-xs shadow-xs"
                    }`}
                  >
                    {/* Message Content */}
                    <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>

                    {/* Sources Citations */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <SourceCitationCard sources={msg.sources} />
                    )}

                    {/* Action Bar for Assistant Messages */}
                    {!isUser && (
                      <div className="mt-3 pt-2.5 border-t border-gray-200/60 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <SpeechReader text={msg.content} />

                          <button
                            type="button"
                            onClick={() => handleSaveMessage(msg._id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                              msg.isSaved
                                ? "bg-amber-100 text-amber-800 font-bold"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {msg.isSaved ? (
                              <>
                                <BookmarkCheck className="h-3.5 w-3.5 text-amber-600" />
                                <span>Saved</span>
                              </>
                            ) : (
                              <>
                                <Bookmark className="h-3.5 w-3.5" />
                                <span>Save Note</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* "I don't understand" / Explain Simpler action */}
                        {prevUserMsg && (
                          <button
                            type="button"
                            onClick={() =>
                              handleSimplify(
                                prevUserMsg.content,
                                msg.content,
                                msg.detectedConcepts?.[0]
                              )
                            }
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1"
                          >
                            <span>🤔 Explain Simpler</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Follow-up suggestion pills */}
                    {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {msg.suggestedFollowUps.map((suggestion, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => handleSendMessage(suggestion)}
                            className="text-[11px] font-semibold bg-white hover:bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100 transition shadow-xs"
                          >
                            💬 {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {loading && (
            <div className="flex items-center gap-3 animate-pulse">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white text-xs font-bold">
                AI
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-xs font-medium text-gray-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span>Reading notes & formulating answer...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-gray-100 bg-white p-3.5 sm:p-4">
          <div className="max-w-4xl mx-auto flex items-end gap-2">
            <textarea
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Ask SHS AI about ${subject === "General" ? "any topic or your notes" : subject}...`}
              className="flex-1 rounded-2xl border border-gray-200 bg-slate-50/60 p-3 text-xs sm:text-sm focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none max-h-32"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || loading}
              className="btn-primary h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-indigo-100 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
