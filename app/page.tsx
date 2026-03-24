"use client";
import { useState } from "react";

const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY!;

export default function Home() {
  const [mode, setMode] = useState<"pdf" | "text">("pdf");
  const [book, setBook] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function extractTextFromPdf(file: File): Promise<string> {
    const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
    GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    const buffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: buffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return text;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAudioUrl(null);

    try {
      const finalText = mode === "pdf" ? await extractTextFromPdf(book!) : text;

      if (!finalText.trim()) throw new Error("No text found");

      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: finalText,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      });

      if (!res.ok) throw new Error("ElevenLabs API error: " + res.statusText);

      const blob = await res.blob();
      setAudioUrl(URL.createObjectURL(blob));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-2xl shadow-md p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">Islamic Audiobook Generator</h1>

        <div className="flex rounded-full border border-zinc-200 dark:border-zinc-700 overflow-hidden text-sm">
          <button type="button" onClick={() => setMode("pdf")} className={`flex-1 py-2 transition-colors ${mode === "pdf" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}>PDF Upload</button>
          <button type="button" onClick={() => setMode("text")} className={`flex-1 py-2 transition-colors ${mode === "text" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}>Paste Text</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "pdf" ? (
            <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
              Upload Islamic Book (PDF)
              <input type="file" accept=".pdf" onChange={(e) => setBook(e.target.files?.[0] || null)}
                className="mt-1 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200" />
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
              Paste Text
              <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Paste your Urdu/Arabic text here..."
                className="mt-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3 text-sm resize-none focus:outline-none" />
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
            ElevenLabs Voice ID
            <input type="text" value={voiceId} onChange={(e) => setVoiceId(e.target.value)}
              placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
              className="mt-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3 text-sm focus:outline-none" />
          </label>

          <button type="submit"
            disabled={(mode === "pdf" ? !book : !text.trim()) || !voiceId || loading}
            className="mt-2 h-11 rounded-full bg-zinc-900 text-white text-sm font-medium disabled:opacity-40 hover:bg-zinc-700 transition-colors">
            {loading ? "Generating..." : "Generate Audiobook"}
          </button>
        </form>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {audioUrl && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-green-600 font-medium">✅ Audiobook ready!</p>
            <audio controls src={audioUrl} className="w-full" />
            <a href={audioUrl} download="audiobook.mp3" className="text-center text-sm text-zinc-600 underline">Download MP3</a>
          </div>
        )}
      </div>
    </div>
  );
}
