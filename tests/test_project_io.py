from pathlib import Path

from dino_editor.core.models import Clip, ProjectState, ZoomEvent
from dino_editor.core.project_io import load_project, save_project


def test_save_and_load_roundtrip(tmp_path: Path) -> None:
    project = ProjectState(
        name="demo",
        clips=[Clip(path="video.mp4", in_point=1.0, out_point=5.0, timeline_start=3.0)],
        zoom_events=[
            ZoomEvent(
                clip_index=0,
                start_time=2.0,
                duration=2.0,
                rect_x=100,
                rect_y=80,
                rect_w=300,
                rect_h=180,
                zoom_scale=2.0,
                mode="timed",
            )
        ],
    )

    target = tmp_path / "sample.dino"
    save_project(target, project)
    loaded = load_project(target)

    assert loaded.name == "demo"
    assert len(loaded.clips) == 1
    assert loaded.clips[0].path == "video.mp4"
    assert loaded.clips[0].timeline_start == 3.0
    assert len(loaded.zoom_events) == 1
    assert loaded.zoom_events[0].zoom_scale == 2.0
