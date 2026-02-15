from dino_editor.core.export import ExportSettings, build_export_command
from dino_editor.core.hardware import HardwareCapabilities
from dino_editor.core.models import Clip, ProjectState


def _caps() -> HardwareCapabilities:
    return HardwareCapabilities(
        has_nvidia=True,
        has_amd=False,
        has_intel_qsv=False,
        hevc_encoder="hevc_nvenc",
        h264_encoder="h264_nvenc",
    )


def test_single_clip_export_command_contains_trim_and_encoder() -> None:
    project = ProjectState(clips=[Clip(path="a.mp4", in_point=2.0, out_point=5.0)])
    cmd, temp = build_export_command(project, ExportSettings(output_path="out.mp4", codec="h264"), _caps())

    assert temp is None
    assert cmd[0] == "ffmpeg"
    assert "-ss" in cmd
    assert "-t" in cmd
    assert "h264_nvenc" in cmd


def test_multi_clip_export_uses_concat_file() -> None:
    project = ProjectState(clips=[Clip(path="a.mp4"), Clip(path="b.mp4")])
    cmd, temp = build_export_command(project, ExportSettings(output_path="out.mp4", codec="hevc"), _caps())

    assert "-f" in cmd and "concat" in cmd
    assert "hevc_nvenc" in cmd
    assert temp is not None
