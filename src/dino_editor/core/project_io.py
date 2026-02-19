from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

from .models import Clip, ProjectState, ZoomEvent


def save_project(path: str | Path, project: ProjectState) -> None:
    target = Path(path)
    payload = asdict(project)
    target.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def load_project(path: str | Path) -> ProjectState:
    source = Path(path)
    payload = json.loads(source.read_text(encoding="utf-8"))

    clips = [Clip(**item) for item in payload.get("clips", [])]
    zoom_events = [ZoomEvent(**item) for item in payload.get("zoom_events", [])]

    return ProjectState(
        name=payload.get("name", "Untitled"),
        clips=clips,
        zoom_events=zoom_events,
    )
