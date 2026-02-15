from dino_editor.core.hardware import select_encoder


def test_hevc_prefers_nvidia_then_amd_then_qsv_then_cpu() -> None:
    assert select_encoder("hevc", has_nvidia=True, has_amd=True, has_intel_qsv=True) == "hevc_nvenc"
    assert select_encoder("hevc", has_nvidia=False, has_amd=True, has_intel_qsv=True) == "hevc_amf"
    assert select_encoder("hevc", has_nvidia=False, has_amd=False, has_intel_qsv=True) == "hevc_qsv"
    assert select_encoder("hevc", has_nvidia=False, has_amd=False, has_intel_qsv=False) == "libx265"


def test_h264_prefers_nvidia_then_amd_then_qsv_then_cpu() -> None:
    assert select_encoder("h264", has_nvidia=True, has_amd=True, has_intel_qsv=True) == "h264_nvenc"
    assert select_encoder("h264", has_nvidia=False, has_amd=True, has_intel_qsv=True) == "h264_amf"
    assert select_encoder("h264", has_nvidia=False, has_amd=False, has_intel_qsv=True) == "h264_qsv"
    assert select_encoder("h264", has_nvidia=False, has_amd=False, has_intel_qsv=False) == "libx264"
