import React, { useState } from "react";
import { FileText, ExternalLink, X, BookOpen } from "lucide-react";

export default function SourceCitationCard({ sources = [] }) {
  const [activeCitation, setActiveCitation] = useState(null);

  if (!Array.isArray(sources) || sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 pt-2.5 border-t border-gray-100/80">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2">
        <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
        <span>Verified Sources from Your Notes:</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {sources.map((src, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveCitation(src)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50/80 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-100"
          >
            <FileText className="h-3 w-3 text-indigo-500" />
            <span className="max-w-[150px] truncate">{src.documentName || "Notes"}</span>
            <span className="rounded bg-white/80 px-1 py-0.2 text-[10px] font-bold text-indigo-600 border border-indigo-100">
              Page {src.pageNumber || 1}
            </span>
          </button>
        ))}
      </div>

      {/* Citation Detail Modal */}
      {activeCitation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setActiveCitation(null)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-100 pb-3 mb-3">
              <div>
                <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-sm">
                  <FileText className="h-4 w-4" />
                  <span>{activeCitation.documentName}</span>
                </div>
                <span className="text-xs text-gray-400">
                  Page {activeCitation.pageNumber} • Match score: {Math.round((activeCitation.score || 0.8) * 100)}%
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveCitation(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-gray-700 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
              "{activeCitation.excerpt || "Text excerpt from your study material."}"
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveCitation(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
