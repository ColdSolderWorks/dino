from __future__ import annotations

from pathlib import Path
from tkinter import END, Listbox, Tk, messagebox
from typing import Iterable

from tkinterdnd2 import DND_FILES, TkinterDnD

VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi"}


class ProjectState:
    def __init__(self) -> None:
        self.clips: list[str] = []


class MainWindow:
    def __init__(self, project_state: ProjectState | None = None) -> None:
        self.project_state = project_state or ProjectState()
        self.root: Tk = TkinterDnD.Tk()
        self.clip_list = Listbox(self.root)
        self.clip_list.pack(fill="both", expand=True)
        self.log_panel = Listbox(self.root)
        self.log_panel.pack(fill="x")

        self._build_ui()

    def _build_ui(self) -> None:
        # Window-level drop target registration.
        self.root.drop_target_register(DND_FILES)
        self.root.dnd_bind("<<Drop>>", self._on_window_drop)
        self._refresh_clip_list_ui()

    def import_video(self, paths: Iterable[str]) -> int:
        return self._add_clips(paths)

    def _on_window_drop(self, event) -> None:
        dropped_paths = [
            path.strip("{}") for path in self.root.tk.splitlist(event.data) if path.strip("{}")
        ]
        added_count = self._add_clips(dropped_paths)

        if added_count:
            self._log(f"Drag&drop ile {added_count} dosya eklendi.")

    def _add_clips(self, paths: Iterable[str]) -> int:
        valid_paths: list[str] = []
        invalid_paths: list[str] = []

        for raw_path in paths:
            clip_path = Path(raw_path)
            if clip_path.suffix.lower() in VIDEO_EXTENSIONS:
                valid_paths.append(str(clip_path))
            else:
                invalid_paths.append(str(clip_path))

        if invalid_paths:
            messagebox.showwarning(
                "Geçersiz dosya",
                "Sadece video dosyaları kabul edilir (.mp4, .mov, .mkv, .avi).",
            )

        if not valid_paths:
            return 0

        self.project_state.clips.extend(valid_paths)
        self._refresh_clip_list_ui()
        return len(valid_paths)

    def _refresh_clip_list_ui(self) -> None:
        self.clip_list.delete(0, END)
        for clip_path in self.project_state.clips:
            self.clip_list.insert(END, clip_path)

    def _log(self, message: str) -> None:
        self.log_panel.insert(END, message)
