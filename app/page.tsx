"use client";
import { useState, useRef } from "react";

export default function Home() {
  const [book, setBook] = useState<File | null>(null);
  const [voice, setVoice] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!book || !voice) return;

    setLoading(true);
    setError(null);
    setAudioUrl(null);

    const form = new FormData();
    form.append("book", book);
    form.append("voice", voice);

    try {
      const res = await fetch("https://spryer-unpitied-lorette.ngrok-free.dev/generate", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Generation failed");
      }
      const data = await res.json();
      setAudioUrl(`https://spryer-unpitied-lorette.ngrok-free.dev${data.audio_url}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-2xl shadow-md p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
          Islamic Audiobook Generator
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
            Upload Islamic Book (PDF)
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setBook(e.target.files?.[0] || null)}
              className="mt-1 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
            Upload Scholar Voice Sample (WAV, min 6 seconds)
            <input
              type="file"
              accept=".wav"
              onChange={(e) => setVoice(e.target.files?.[0] || null)}
              className="mt-1 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
            />
          </label>

          <button
            type="submit"
            disabled={!book || !voice || loading}
            className="mt-2 h-11 rounded-full bg-zinc-900 text-white text-sm font-medium disabled:opacity-40 hover:bg-zinc-700 transition-colors"
          >
            {loading ? "Generating... (this may take a while)" : "Generate Audiobook"}
          </button>
        </form>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {audioUrl && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-green-600 font-medium">✅ Audiobook ready!</p>
            <audio controls src={audioUrl} className="w-full" />
            <a
              href={audioUrl}
              download="audiobook.mp3"
              className="text-center text-sm text-zinc-600 underline"
            >
              Download MP3
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
