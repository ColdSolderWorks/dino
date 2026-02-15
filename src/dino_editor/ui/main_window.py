from __future__ import annotations

from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox

import customtkinter as ctk

from dino_editor.core.hardware import detect_hardware_capabilities
from dino_editor.core.models import Clip, ProjectState, ZoomEvent
from dino_editor.core.project_io import load_project, save_project
from .preview_canvas import PreviewCanvas


class MainWindow(ctk.CTk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Dino Editor")
        self.geometry("1200x720")

        self.project = ProjectState()
        self.selected_rect: tuple[float, float, float, float] | None = None

        self._build_ui()
        self._refresh_hardware_status()

    def _build_ui(self) -> None:
        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=2)
        self.grid_columnconfigure(2, weight=1)
        self.grid_rowconfigure(1, weight=1)

        toolbar = ctk.CTkFrame(self)
        toolbar.grid(row=0, column=0, columnspan=3, sticky="ew", padx=10, pady=10)

        ctk.CTkButton(toolbar, text="Import Video", command=self.import_video).pack(side="left", padx=6, pady=6)
        ctk.CTkButton(toolbar, text="Save Project", command=self.save_project_dialog).pack(side="left", padx=6, pady=6)
        ctk.CTkButton(toolbar, text="Load Project", command=self.load_project_dialog).pack(side="left", padx=6, pady=6)

        self.hardware_label = ctk.CTkLabel(toolbar, text="Hardware: scanning...")
        self.hardware_label.pack(side="right", padx=6)

        left = ctk.CTkFrame(self)
        left.grid(row=1, column=0, sticky="nsew", padx=(10, 5), pady=(0, 10))
        left.grid_rowconfigure(1, weight=1)
        ctk.CTkLabel(left, text="Timeline Clips").grid(row=0, column=0, sticky="w", padx=10, pady=(10, 6))

        self.clip_list = tk.Listbox(left)
        self.clip_list.grid(row=1, column=0, sticky="nsew", padx=10, pady=(0, 10))

        center = ctk.CTkFrame(self)
        center.grid(row=1, column=1, sticky="nsew", padx=5, pady=(0, 10))
        center.grid_rowconfigure(1, weight=1)
        ctk.CTkLabel(center, text="Preview").grid(row=0, column=0, sticky="w", padx=10, pady=(10, 6))
        self.preview = PreviewCanvas(center, on_rect_selected=self.on_rect_selected)
        self.preview.grid(row=1, column=0, sticky="nsew", padx=10, pady=(0, 10))

        right = ctk.CTkFrame(self)
        right.grid(row=1, column=2, sticky="nsew", padx=(5, 10), pady=(0, 10))

        ctk.CTkLabel(right, text="Zoom Controls").pack(anchor="w", padx=10, pady=(10, 6))

        ctk.CTkLabel(right, text="Zoom Scale").pack(anchor="w", padx=10)
        self.zoom_scale_var = tk.StringVar(value="2.0")
        ctk.CTkEntry(right, textvariable=self.zoom_scale_var).pack(fill="x", padx=10, pady=(0, 8))

        ctk.CTkLabel(right, text="Duration (seconds)").pack(anchor="w", padx=10)
        self.duration_var = tk.StringVar(value="2.0")
        ctk.CTkEntry(right, textvariable=self.duration_var).pack(fill="x", padx=10, pady=(0, 8))

        ctk.CTkButton(right, text="Apply Timed Zoom", command=lambda: self.apply_zoom(instant=False)).pack(fill="x", padx=10, pady=5)
        ctk.CTkButton(right, text="Apply Instant Zoom", command=lambda: self.apply_zoom(instant=True)).pack(fill="x", padx=10, pady=5)

        ctk.CTkLabel(right, text="Event Log").pack(anchor="w", padx=10, pady=(15, 6))
        self.log_box = ctk.CTkTextbox(right, height=250)
        self.log_box.pack(fill="both", expand=True, padx=10, pady=(0, 10))

    def _refresh_hardware_status(self) -> None:
        caps = detect_hardware_capabilities()
        details = []
        if caps.has_nvidia:
            details.append("NVIDIA")
        if caps.has_amd:
            details.append("AMD")
        if caps.has_intel_qsv:
            details.append("Intel QSV")
        if not details:
            details.append("CPU")

        self.hardware_label.configure(
            text=f"Hardware: {' / '.join(details)} | H264={caps.h264_encoder} HEVC={caps.hevc_encoder}"
        )

    def on_rect_selected(self, rect: tuple[float, float, float, float]) -> None:
        self.selected_rect = rect
        self._log(f"Zoom region selected: x={rect[0]:.0f}, y={rect[1]:.0f}, w={rect[2]:.0f}, h={rect[3]:.0f}")

    def import_video(self) -> None:
        paths = filedialog.askopenfilenames(
            title="Select media",
            filetypes=[("Video Files", "*.mp4 *.mov *.mkv *.avi"), ("All Files", "*.*")],
        )
        if not paths:
            return

        for path in paths:
            clip = Clip(path=path)
            self.project.clips.append(clip)
            self.clip_list.insert("end", Path(path).name)
        self._log(f"Imported {len(paths)} clip(s).")

    def apply_zoom(self, instant: bool) -> None:
        if self.selected_rect is None:
            messagebox.showwarning("Zoom", "Please select a rectangle in preview first.")
            return
        if not self.project.clips:
            messagebox.showwarning("Zoom", "Import at least one video clip first.")
            return

        try:
            scale = float(self.zoom_scale_var.get())
            duration = 0.0 if instant else float(self.duration_var.get())
        except ValueError:
            messagebox.showerror("Zoom", "Zoom scale and duration must be numeric.")
            return

        current_index = self.clip_list.curselection()[0] if self.clip_list.curselection() else 0
        x, y, w, h = self.selected_rect
        mode = "instant" if instant else "timed"
        event = ZoomEvent(
            clip_index=current_index,
            start_time=0.0,
            duration=duration,
            rect_x=x,
            rect_y=y,
            rect_w=w,
            rect_h=h,
            zoom_scale=scale,
            mode=mode,
        )
        self.project.zoom_events.append(event)

        label = "Instant" if instant else f"Timed ({duration:.2f}s)"
        self._log(f"{label} zoom added to clip #{current_index + 1} with scale {scale:.2f}x.")

    def save_project_dialog(self) -> None:
        path = filedialog.asksaveasfilename(
            title="Save project",
            defaultextension=".dino",
            filetypes=[("Dino Project", "*.dino"), ("JSON", "*.json")],
        )
        if not path:
            return

        save_project(path, self.project)
        self._log(f"Project saved: {path}")

    def load_project_dialog(self) -> None:
        path = filedialog.askopenfilename(
            title="Load project",
            filetypes=[("Dino Project", "*.dino *.json"), ("All Files", "*.*")],
        )
        if not path:
            return

        self.project = load_project(path)
        self.clip_list.delete(0, "end")
        for clip in self.project.clips:
            self.clip_list.insert("end", Path(clip.path).name)

        self._log(f"Project loaded: {path}")

    def _log(self, message: str) -> None:
        self.log_box.insert("end", f"{message}\n")
        self.log_box.see("end")
