import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, Pause, Play } from "lucide-react";

export default function SpeechReader({ text }) {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggle = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setPaused(false);
      return;
    }

    const clean = String(text || "")
      .replace(/[#*`_\[\]()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.95; // Friendly, clear pace for school learners
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };

    utterance.onerror = () => {
      setSpeaking(false);
      setPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
    setPaused(false);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={speaking ? "Stop reading aloud" : "Read aloud"}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
        speaking
          ? "bg-indigo-600 text-white shadow-sm"
          : "bg-gray-100/80 hover:bg-gray-200/80 text-gray-600 hover:text-gray-900"
      }`}
    >
      {speaking ? (
        <>
          <VolumeX className="h-3.5 w-3.5 animate-pulse" />
          <span>Stop Voice</span>
        </>
      ) : (
        <>
          <Volume2 className="h-3.5 w-3.5 text-indigo-600" />
          <span>Read Aloud</span>
        </>
      )}
    </button>
  );
}
