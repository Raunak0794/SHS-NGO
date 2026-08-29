import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  UploadCloud,
  FileText,
  Search,
  Trash2,
  Edit2,
  Sparkles,
  Brain,
  Layers,
  CheckCircle2,
  Loader2,
  X,
  BookOpen,
} from "lucide-react";
import {
  getMaterials,
  uploadMaterialWithRAG,
  deleteMaterial,
  updateMaterial,
  getMaterialDetails,
  semanticSearch,
} from "../services/api";
import toast from "react-hot-toast";

export default function MaterialsPage() {
  const [searchParams] = useSearchParams();
  const initialSubject = searchParams.get("subject") || "All";

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [searchQuery, setSearchQuery] = useState("");
  const [semanticResults, setSemanticResults] = useState(null);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);

  // Upload State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSubject, setUploadSubject] = useState("Science");
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");

  // Material Detail / Chunks Modal
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Edit title modal
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const res = await getMaterials({
        subject: selectedSubject !== "All" ? selectedSubject : undefined,
        search: searchQuery || undefined,
      });
      setMaterials(res.data?.materials || []);
    } catch (err) {
      toast.error("Could not load study materials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [selectedSubject]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setUploadProgressText("Reading file & indexing text into vector chunks...");

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("title", uploadTitle.trim() || uploadFile.name);
    formData.append("subject", uploadSubject);

    try {
      const res = await uploadMaterialWithRAG(formData);
      toast.success(res.data?.message || "Notes indexed successfully!");
      setUploadFile(null);
      setUploadTitle("");
      loadMaterials();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed. Please check file format.");
    } finally {
      setUploading(false);
      setUploadProgressText("");
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? All search indices and chunks will be removed.`)) {
      return;
    }

    try {
      await deleteMaterial(id);
      setMaterials((prev) => prev.filter((m) => m._id !== id));
      toast.success("Material deleted");
    } catch (err) {
      toast.error("Could not delete material");
    }
  };

  const handleSemanticSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSemanticResults(null);
      loadMaterials();
      return;
    }

    setIsSearchingSemantic(true);
    try {
      const res = await semanticSearch({
        query: searchQuery.trim(),
        subject: selectedSubject !== "All" ? selectedSubject : undefined,
      });
      setSemanticResults(res.data?.results || []);
    } catch (err) {
      toast.error("Semantic search failed");
    } finally {
      setIsSearchingSemantic(false);
    }
  };

  const handleOpenDetails = async (id) => {
    setLoadingDetails(true);
    try {
      const res = await getMaterialDetails(id);
      setSelectedMaterial(res.data?.material);
    } catch (err) {
      toast.error("Could not load details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingMaterial || !editTitle.trim()) return;

    try {
      await updateMaterial(editingMaterial._id, { title: editTitle.trim() });
      setMaterials((prev) =>
        prev.map((m) => (m._id === editingMaterial._id ? { ...m, title: editTitle.trim() } : m))
      );
      setEditingMaterial(null);
      toast.success("Renamed successfully");
    } catch (err) {
      toast.error("Could not update material");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Study Materials & Notes 📚
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Upload your school textbooks, notes, and revision sheets. SHS AI indexes them page-by-page.
            </p>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="rounded-3xl bg-white p-6 md:p-8 border border-gray-200/80 shadow-xs">
          <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-indigo-600" />
            <span>Upload New Material</span>
          </h2>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Document Title (Optional)
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Chapter 4 - Light & Reflection Notes"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Subject
                </label>
                <select
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs font-semibold text-gray-700 bg-white focus:outline-none"
                >
                  <option value="Science">Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="English">English</option>
                  <option value="Social Science">Social Science</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            {/* File Dropzone */}
            <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-6 text-center hover:bg-indigo-50/60 transition">
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-600">
                  <FileText className="h-6 w-6" />
                </div>
                {uploadFile ? (
                  <div>
                    <span className="text-sm font-bold text-indigo-700 block">
                      {uploadFile.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {(uploadFile.size / 1024 / 1024).toFixed(2)} MB • Click to replace
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-bold text-indigo-700 block">
                      Choose a PDF, Word doc, or Text file
                    </span>
                    <span className="text-xs text-gray-400">
                      PDF, DOCX, or TXT up to 200MB
                    </span>
                  </div>
                )}
              </label>
            </div>

            {uploading && (
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 p-3 rounded-xl border border-indigo-100 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span>{uploadProgressText}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold disabled:opacity-40"
              >
                <Sparkles className="h-4 w-4" />
                <span>Index Notes with RAG</span>
              </button>
            </div>
          </form>
        </div>

        {/* Search & Filter Bar */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSemanticSearch} className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Semantic vector search across all notes..."
                className="w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-24 py-2.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none shadow-xs"
              />
              <button
                type="submit"
                disabled={isSearchingSemantic}
                className="absolute right-1.5 top-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700 transition"
              >
                {isSearchingSemantic ? "Searching..." : "Vector Search"}
              </button>
            </form>

            {/* Subject Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {["All", "Science", "Mathematics", "English", "Social Science"].map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    setSelectedSubject(sub);
                    setSemanticResults(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedSubject === sub
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white hover:bg-gray-100 text-gray-600 border border-gray-200/80"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Semantic Search Results banner */}
          {semanticResults && (
            <div className="rounded-2xl bg-indigo-50/70 p-4 border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900">
                  🎯 Found {semanticResults.length} relevant passages for "{searchQuery}"
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSemanticResults(null);
                    setSearchQuery("");
                    loadMaterials();
                  }}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  Clear Results
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {semanticResults.map((chunk, i) => (
                  <div key={i} className="p-3 bg-white rounded-xl border border-indigo-100 text-xs shadow-xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 mb-1">
                      <span>{chunk.documentName} • Page {chunk.pageNumber}</span>
                      <span className="text-gray-400">{Math.round((chunk.score || 0.8) * 100)}% match</span>
                    </div>
                    <p className="text-gray-700 line-clamp-3">"{chunk.content}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Materials Cards List */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-44 bg-gray-100 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-gray-200/80 p-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
                <BookOpen className="h-7 w-7" />
              </div>
              <h4 className="text-base font-bold text-gray-800">No Study Materials Found</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                Upload your first chapter or notes above. SHS AI will index them so you can chat with them and take quizzes!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {materials.map((m) => (
                <div
                  key={m._id}
                  className="rounded-3xl bg-white p-5 border border-gray-200/80 shadow-xs hover:shadow-lg hover:border-indigo-200 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                        {m.subject || "General"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMaterial(m);
                            setEditTitle(m.title);
                          }}
                          className="p-1 text-gray-400 hover:text-indigo-600 rounded-lg transition"
                          title="Rename"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(m._id, m.title)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-gray-900 text-sm line-clamp-2">{m.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {m.pageCount || 1} {m.pageCount === 1 ? "page" : "pages"} • {m.chunkCount || 1} indexed chunks
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to={`/tutor?doc=${m._id}&subject=${encodeURIComponent(m.subject || "General")}`}
                        className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Chat With AI</span>
                      </Link>

                      <Link
                        to={`/practice?tab=quiz&doc=${m._id}&subject=${encodeURIComponent(m.subject || "General")}`}
                        className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition"
                      >
                        <Brain className="h-3.5 w-3.5" />
                        <span>Take Quiz</span>
                      </Link>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenDetails(m._id)}
                      className="w-full text-center text-xs font-semibold text-gray-500 hover:text-gray-800 py-1"
                    >
                      View Indexed Chunks
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Details & Chunks Modal */}
      {selectedMaterial && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setSelectedMaterial(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-gray-800 text-base">{selectedMaterial.title}</h3>
                <span className="text-xs text-gray-400">
                  {selectedMaterial.chunkCount} vector chunks stored
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMaterial(null)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {(selectedMaterial.chunks || []).map((c, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-indigo-600 text-[11px]">
                    <span>Chunk #{c.chunkIndex + 1}</span>
                    <span>Page {c.pageNumber}</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{c.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {editingMaterial && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setEditingMaterial(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-gray-800 text-sm mb-3">Rename Material</h3>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-1.5 text-xs">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
