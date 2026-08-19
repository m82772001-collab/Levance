"use client";

import { useRef, useState } from "react";

interface SpeechRecognitionEventLike extends Event {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type RecognitionConstructor = new () => Recognition;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

export function VoiceAssistant() {
  const recognitionRef = useRef<Recognition | null>(null);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startListening = () => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Voice input is not supported here. You can type your request instead.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => setMessage(event.results[0][0].transcript);
    recognition.onerror = () => setError("Voice input could not be captured. Please type your request.");
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setError("");
    setListening(true);
    recognition.start();
  };

  const ask = async () => {
    if (!message.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: message.trim(), conversation: [] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Assistant unavailable");
      setReply(data.message ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assistant unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-label="LÉVANCE voice shopping assistant" className="space-y-3">
      <div className="flex gap-2">
        <button type="button" onClick={startListening} aria-pressed={listening} className="min-h-11 min-w-11 rounded-full border px-4">
          {listening ? "Listening…" : "Voice"}
        </button>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") void ask(); }}
          placeholder="Ask about products…"
          aria-label="Ask LÉVANCE assistant"
          className="min-h-11 flex-1 rounded border px-3"
        />
        <button type="button" onClick={() => void ask()} disabled={loading || !message.trim()} className="min-h-11 rounded border px-4 disabled:opacity-50">
          {loading ? "…" : "Ask"}
        </button>
      </div>
      {reply && <p className="rounded border p-3" aria-live="polite">{reply}</p>}
      {error && <p className="text-sm" role="alert">{error}</p>}
    </section>
  );
}
