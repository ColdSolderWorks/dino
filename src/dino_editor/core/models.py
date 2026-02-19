from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

ZoomMode = Literal["instant", "timed"]


@dataclass(slots=True)
class Clip:
    path: str
    in_point: float = 0.0
    out_point: float | None = None
    timeline_start: float = 0.0


@dataclass(slots=True)
class ZoomEvent:
    clip_index: int
    start_time: float
    duration: float
    rect_x: float
    rect_y: float
    rect_w: float
    rect_h: float
    zoom_scale: float
    mode: ZoomMode
    easing: Literal["linear", "smooth"] = "smooth"


@dataclass(slots=True)
class ProjectState:
    name: str = "Untitled"
    clips: list[Clip] = field(default_factory=list)
    zoom_events: list[ZoomEvent] = field(default_factory=list)
