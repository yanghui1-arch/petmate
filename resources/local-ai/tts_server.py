from __future__ import annotations

import argparse
import io
import json
import threading
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Petmate local Qwen3-TTS server")
    parser.add_argument("--model", required=True)
    parser.add_argument("--ref-audio", required=True)
    parser.add_argument("--ref-text-file", required=True)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, required=True)
    return parser.parse_args()


class TTSRuntime:
    def __init__(self, model_path: str, ref_audio: str, ref_text_file: str) -> None:
        self.lock = threading.Lock()
        self.backend = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = "cuda:0" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.bfloat16 if torch.cuda.is_available() else torch.float32
        self.model = Qwen3TTSModel.from_pretrained(
            model_path,
            device_map=self.device,
            dtype=self.dtype,
            attn_implementation="sdpa",
        )
        ref_text = Path(ref_text_file).read_text(encoding="utf-8").strip()
        self.voice_clone_prompt = self.model.create_voice_clone_prompt(
            ref_audio=ref_audio,
            ref_text=ref_text,
            x_vector_only_mode=False,
        )

    def synthesize(self, text: str, language: str) -> bytes:
        with self.lock, torch.inference_mode():
            wavs, sample_rate = self.model.generate_voice_clone(
                text=text,
                language=language,
                voice_clone_prompt=self.voice_clone_prompt,
            )

        output = io.BytesIO()
        sf.write(output, wavs[0], sample_rate, format="WAV", subtype="PCM_16")
        return output.getvalue()


class Handler(BaseHTTPRequestHandler):
    runtime: TTSRuntime
    server_version = "PetmateQwenTTS/1.0"

    def do_GET(self) -> None:
        if self.path != "/health":
            self.send_error(404)
            return
        self.send_json(200, {"status": "ok", "backend": self.runtime.backend})

    def do_POST(self) -> None:
        if self.path != "/synthesize":
            self.send_error(404)
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0 or content_length > 1024 * 1024:
                self.send_json(400, {"error": "invalid request size"})
                return

            payload = json.loads(self.rfile.read(content_length))
            text = str(payload.get("text", "")).strip()
            language = str(payload.get("language", "Chinese"))
            if not text:
                self.send_json(400, {"error": "text is required"})
                return

            audio = self.runtime.synthesize(text, language)
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(audio)))
            self.end_headers()
            self.wfile.write(audio)
        except Exception as error:
            traceback.print_exc()
            self.send_json(500, {"error": str(error)})

    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"[http] {self.address_string()} {fmt % args}", flush=True)

    def send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    args = parse_args()
    print(f"Loading Qwen3-TTS from {args.model}", flush=True)
    Handler.runtime = TTSRuntime(args.model, args.ref_audio, args.ref_text_file)
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(
        f"Qwen3-TTS ready on http://{args.host}:{args.port} "
        f"(backend={Handler.runtime.backend})",
        flush=True,
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
