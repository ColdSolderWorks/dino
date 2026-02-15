from __future__ import annotations

import tkinter as tk
from typing import Callable


class PreviewCanvas(tk.Canvas):
    def __init__(self, master: tk.Misc, on_rect_selected: Callable[[tuple[float, float, float, float]], None]) -> None:
        super().__init__(master, width=640, height=360, bg="#1f1f1f", highlightthickness=0)
        self._on_rect_selected = on_rect_selected
        self._start_x = 0.0
        self._start_y = 0.0
        self._rect_id: int | None = None

        self.bind("<ButtonPress-1>", self._on_press)
        self.bind("<B1-Motion>", self._on_drag)
        self.bind("<ButtonRelease-1>", self._on_release)

        self.create_text(320, 180, text="Preview Area\n(Click and drag to select zoom region)", fill="#bbbbbb")

    def _on_press(self, event: tk.Event) -> None:
        self._start_x = event.x
        self._start_y = event.y
        if self._rect_id is not None:
            self.delete(self._rect_id)
        self._rect_id = self.create_rectangle(event.x, event.y, event.x, event.y, outline="#00b4ff", width=2)

    def _on_drag(self, event: tk.Event) -> None:
        if self._rect_id is not None:
            self.coords(self._rect_id, self._start_x, self._start_y, event.x, event.y)

    def _on_release(self, event: tk.Event) -> None:
        x1, y1 = self._start_x, self._start_y
        x2, y2 = event.x, event.y
        left = min(x1, x2)
        top = min(y1, y2)
        width = abs(x2 - x1)
        height = abs(y2 - y1)
        if width > 4 and height > 4:
            self._on_rect_selected((left, top, width, height))
