import os
import uuid
import fitz
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from TTS.api import TTS
from pydub import AudioSegment

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
VOICE_DIR = "voice_samples"

tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")


def extract_text(pdf_path: str) -> str:
    text = ""
    doc = fitz.open(pdf_path)
    for page in doc:
        text += page.get_text("text") or ""
    return text


def chunk_text(text: str, max_chars: int = 200):
    sentences = text.replace("\n", " ").split(". ")
    chunks, current = [], ""
    for s in sentences:
        if len(current) + len(s) < max_chars:
            current += s + ". "
        else:
            if current:
                chunks.append(current.strip())
            current = s + ". "
    if current:
        chunks.append(current.strip())
    return chunks


@app.post("/generate")
async def generate_audiobook(
    book: UploadFile = File(...),
    voice: UploadFile = File(...),
):
    job_id = str(uuid.uuid4())

    book_path = f"{UPLOAD_DIR}/{job_id}_book.pdf"
    voice_path = f"{VOICE_DIR}/{job_id}_voice.wav"

    with open(book_path, "wb") as f:
        f.write(await book.read())
    with open(voice_path, "wb") as f:
        f.write(await voice.read())

    text = extract_text(book_path)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    chunks = chunk_text(text)
    audio_segments = []

    for i, chunk in enumerate(chunks):
        chunk_path = f"{OUTPUT_DIR}/{job_id}_chunk_{i}.wav"
        tts.tts_to_file(
            text=chunk,
            speaker_wav=voice_path,
            language="ur",
            file_path=chunk_path,
        )
        audio_segments.append(AudioSegment.from_wav(chunk_path))

    combined = sum(audio_segments)
    output_path = f"{OUTPUT_DIR}/{job_id}_audiobook.mp3"
    combined.export(output_path, format="mp3")

    # cleanup chunks
    for i in range(len(chunks)):
        os.remove(f"{OUTPUT_DIR}/{job_id}_chunk_{i}.wav")

    return {"audio_url": f"/audio/{job_id}_audiobook.mp3"}


@app.get("/audio/{filename}")
def get_audio(filename: str):
    path = f"{OUTPUT_DIR}/{filename}"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="audio/mpeg")
