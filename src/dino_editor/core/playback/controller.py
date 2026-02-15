from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path


class PlaybackController:
    def __init__(self) -> None:
        self.current_clip: str | None = None
        self.position = 0.0
        self.duration = 0.0
        self.playing = False

    def load_clip(self, clip_path: str) -> None:
        self.current_clip = clip_path
        self.position = 0.0
        self.duration = self._probe_duration(clip_path)

    def _probe_duration(self, clip_path: str) -> float:
        ffprobe = shutil.which("ffprobe")
        if not ffprobe:
            return 0.0
        result = subprocess.run(
            [
                ffprobe,
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "json",
                clip_path,
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            return 0.0
        try:
            payload = json.loads(result.stdout)
            return float(payload["format"]["duration"])
        except Exception:
            return 0.0

    def get_frame_path(self, at_time: float, width: int = 640) -> str | None:
        if not self.current_clip:
            return None
        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            return None

        frame_file = tempfile.NamedTemporaryFile(prefix="dino_frame_", suffix=".png", delete=False)
        frame_file.close()
        cmd = [
            ffmpeg,
            "-y",
            "-ss",
            str(max(0.0, at_time)),
            "-i",
            self.current_clip,
            "-frames:v",
            "1",
            "-vf",
            f"scale={width}:-1",
            frame_file.name,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if result.returncode != 0:
            Path(frame_file.name).unlink(missing_ok=True)
            return None
        self.position = max(0.0, at_time)
        return frame_file.name

    def step(self, delta: float) -> float:
        self.position = max(0.0, min(self.duration or 0.0, self.position + delta))
        return self.position
