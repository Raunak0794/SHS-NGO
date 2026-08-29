import React, { useState } from "react";
import { RotateCw, CheckCircle, HelpCircle, XCircle, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { reviewFlashcard } from "../services/api";
import toast from "react-hot-toast";

export default function FlashcardDeck({ flashcards = [], subject, topic, onDone }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No flashcards generated yet. Choose a topic and click "Generate Flashcards"!
      </div>
    );
  }

  const card = flashcards[currentIndex];

  const handleRating = async (rating) => {
    try {
      await reviewFlashcard({
        subject: subject || "General",
        topic: card.topic || topic || "General",
        rating,
      });

      if (currentIndex + 1 < flashcards.length) {
        setIsFlipped(false);
        setCurrentIndex((prev) => prev + 1);
      } else {
        toast.success("🎉 Flashcard session complete!");
        if (onDone) onDone();
      }
    } catch (err) {
      toast.error("Could not record flashcard progress");
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
        <span>
          Card {currentIndex + 1} of {flashcards.length}
        </span>
        <span className="text-indigo-600 font-semibold">{card.topic || subject}</span>
      </div>

      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-indigo-600 h-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
        />
      </div>

      {/* 3D Flip Card */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="cursor-pointer min-h-[220px] rounded-3xl p-6 shadow-lg border border-indigo-100 bg-gradient-to-tr from-white to-indigo-50/40 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.02] text-center"
      >
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span className="flex items-center gap-1 font-semibold uppercase tracking-wider text-[10px] text-indigo-500">
            <Sparkles className="h-3 w-3" />
            {isFlipped ? "Answer / Explanation" : "Question / Term"}
          </span>
          <span className="text-indigo-600 text-xs font-semibold flex items-center gap-1">
            <RotateCw className="h-3 w-3" /> Tap to Flip
          </span>
        </div>

        <div className="my-auto py-4">
          <p className="text-lg md:text-xl font-bold text-gray-800 leading-snug">
            {isFlipped ? card.back : card.front}
          </p>
        </div>

        <div className="text-[11px] text-gray-400 italic">
          {isFlipped ? "Rate how well you knew this below" : "Click anywhere on the card to flip"}
        </div>
      </div>

      {/* Feedback Buttons (active when flipped) */}
      {isFlipped ? (
        <div className="grid grid-cols-3 gap-2 pt-2 animate-fadeIn">
          <button
            type="button"
            onClick={() => handleRating("hard")}
            className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition"
          >
            <XCircle className="h-4 w-4 text-red-500" />
            <span>Hard</span>
          </button>

          <button
            type="button"
            onClick={() => handleRating("medium")}
            className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold transition"
          >
            <HelpCircle className="h-4 w-4 text-amber-500" />
            <span>Good</span>
          </button>

          <button
            type="button"
            onClick={() => handleRating("easy")}
            className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-bold transition"
          >
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Easy</span>
          </button>
        </div>
      ) : (
        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => {
              setIsFlipped(false);
              setCurrentIndex((prev) => Math.max(0, prev - 1));
            }}
            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-40 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5 inline mr-1" /> Prev
          </button>

          <button
            type="button"
            onClick={() => setIsFlipped(true)}
            className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md transition"
          >
            Show Answer
          </button>

          <button
            type="button"
            disabled={currentIndex === flashcards.length - 1}
            onClick={() => {
              setIsFlipped(false);
              setCurrentIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
            }}
            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-40 transition"
          >
            Next <ArrowRight className="h-3.5 w-3.5 inline ml-1" />
          </button>
        </div>
      )}
    </div>
  );
}
