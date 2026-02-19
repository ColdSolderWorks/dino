from __future__ import annotations

from dataclasses import dataclass
import shutil
import subprocess


@dataclass(slots=True)
class HardwareCapabilities:
    has_nvidia: bool
    has_amd: bool
    has_intel_qsv: bool
    hevc_encoder: str
    h264_encoder: str


def _ffmpeg_encoders() -> set[str]:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return set()

    result = subprocess.run(
        [ffmpeg, "-hide_banner", "-encoders"],
        capture_output=True,
        text=True,
        check=False,
    )

    encoders: set[str] = set()
    for line in result.stdout.splitlines():
        parts = line.split()
        if len(parts) >= 2 and parts[0].startswith("V"):
            encoders.add(parts[1])
    return encoders


def detect_hardware_capabilities() -> HardwareCapabilities:
    encoders = _ffmpeg_encoders()

    has_nvidia = "h264_nvenc" in encoders or "hevc_nvenc" in encoders
    has_amd = "h264_amf" in encoders or "hevc_amf" in encoders
    has_intel_qsv = "h264_qsv" in encoders or "hevc_qsv" in encoders

    hevc_encoder = select_encoder(
        "hevc",
        has_nvidia=has_nvidia,
        has_amd=has_amd,
        has_intel_qsv=has_intel_qsv,
    )
    h264_encoder = select_encoder(
        "h264",
        has_nvidia=has_nvidia,
        has_amd=has_amd,
        has_intel_qsv=has_intel_qsv,
    )

    return HardwareCapabilities(
        has_nvidia=has_nvidia,
        has_amd=has_amd,
        has_intel_qsv=has_intel_qsv,
        hevc_encoder=hevc_encoder,
        h264_encoder=h264_encoder,
    )


def select_encoder(
    codec: str,
    *,
    has_nvidia: bool,
    has_amd: bool,
    has_intel_qsv: bool,
) -> str:
    if codec not in {"h264", "hevc"}:
        raise ValueError("codec must be 'h264' or 'hevc'")

    if codec == "hevc":
        if has_nvidia:
            return "hevc_nvenc"
        if has_amd:
            return "hevc_amf"
        if has_intel_qsv:
            return "hevc_qsv"
        return "libx265"

    if has_nvidia:
        return "h264_nvenc"
    if has_amd:
        return "h264_amf"
    if has_intel_qsv:
        return "h264_qsv"
    return "libx264"
