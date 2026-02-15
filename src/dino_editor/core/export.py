from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import tempfile

from .hardware import HardwareCapabilities
from .models import ProjectState


@dataclass(slots=True)
class ExportSettings:
    output_path: str
    codec: str = "h264"
    quality: str = "balanced"


def _quality_args(quality: str) -> list[str]:
    mapping = {
        "fast": ["-preset", "fast", "-crf", "28"],
        "balanced": ["-preset", "medium", "-crf", "23"],
        "high": ["-preset", "slow", "-crf", "18"],
    }
    return mapping.get(quality, mapping["balanced"])


def build_export_command(
    project: ProjectState,
    settings: ExportSettings,
    capabilities: HardwareCapabilities,
) -> tuple[list[str], str | None]:
    if not project.clips:
        raise ValueError("No clips in project")

    encoder = capabilities.hevc_encoder if settings.codec == "hevc" else capabilities.h264_encoder
    quality_args = _quality_args(settings.quality)

    if len(project.clips) == 1:
        clip = project.clips[0]
        cmd = ["ffmpeg", "-y", "-i", clip.path]
        if clip.in_point > 0:
            cmd.extend(["-ss", str(clip.in_point)])
        if clip.out_point is not None:
            duration = max(0.01, clip.out_point - clip.in_point)
            cmd.extend(["-t", str(duration)])
        cmd.extend(["-c:v", encoder, "-c:a", "aac", *quality_args, settings.output_path])
        return cmd, None

    concat_file = tempfile.NamedTemporaryFile(prefix="dino_concat_", suffix=".txt", delete=False)
    with concat_file:
        for clip in project.clips:
            concat_file.write(f"file '{Path(clip.path).as_posix()}'\n".encode("utf-8"))

    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concat_file.name,
        "-c:v",
        encoder,
        "-c:a",
        "aac",
        *quality_args,
        settings.output_path,
    ]
    return cmd, concat_file.name
