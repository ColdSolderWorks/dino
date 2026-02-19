from __future__ import annotations

from pathlib import Path
import subprocess
import threading
import tkinter as tk
from tkinter import filedialog, messagebox

import customtkinter as ctk

try:
    from tkinterdnd2 import DND_FILES, TkinterDnD  # type: ignore
except ImportError:  # pragma: no cover
    DND_FILES = None
    TkinterDnD = None

from dino_editor.core.export import ExportSettings, build_export_command
from dino_editor.core.hardware import detect_hardware_capabilities
from dino_editor.core.models import Clip, ProjectState, ZoomEvent
from dino_editor.core.playback import PlaybackController
from dino_editor.core.project_io import load_project, save_project
from .preview_canvas import PreviewCanvas


class MainWindow(ctk.CTk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Dino Editor")
        self.geometry("1280x760")

        self.project = ProjectState()
        self.selected_rect: tuple[float, float, float, float] | None = None
        self.capabilities = detect_hardware_capabilities()
        self.playback = PlaybackController()
        self.playback_quality = tk.StringVar(value="half")
        self.playing = False
        self._export_process: subprocess.Popen[str] | None = None

        self._build_ui()
        self._refresh_hardware_status()
        if TkinterDnD is not None:
            try:
                TkinterDnD._require(self)  # type: ignore[attr-defined]
            except Exception:
                pass
        self._enable_drag_and_drop()

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
        ctk.CTkButton(toolbar, text="Export", command=self.export_dialog).pack(side="left", padx=6, pady=6)
        ctk.CTkButton(toolbar, text="Cancel Export", command=self.cancel_export).pack(side="left", padx=6, pady=6)

        self.hardware_label = ctk.CTkLabel(toolbar, text="Hardware: scanning...")
        self.hardware_label.pack(side="right", padx=6)

        left = ctk.CTkFrame(self)
        left.grid(row=1, column=0, sticky="nsew", padx=(10, 5), pady=(0, 10))
        left.grid_columnconfigure(0, weight=1)
        left.grid_rowconfigure(1, weight=1)
        ctk.CTkLabel(left, text="Timeline Clips").grid(row=0, column=0, sticky="w", padx=10, pady=(10, 6))

        self.clip_list = tk.Listbox(left)
        self.clip_list.grid(row=1, column=0, sticky="nsew", padx=10, pady=(0, 10))
        self.clip_list.bind("<<ListboxSelect>>", lambda _e: self.on_clip_selected())

        move_frame = ctk.CTkFrame(left)
        move_frame.grid(row=2, column=0, sticky="ew", padx=10, pady=(0, 8))
        ctk.CTkButton(move_frame, text="Move Up", command=lambda: self.move_clip(-1)).pack(side="left", padx=4)
        ctk.CTkButton(move_frame, text="Move Down", command=lambda: self.move_clip(1)).pack(side="left", padx=4)

        trim_frame = ctk.CTkFrame(left)
        trim_frame.grid(row=3, column=0, sticky="ew", padx=10, pady=(0, 10))
        ctk.CTkLabel(trim_frame, text="In").pack(side="left", padx=3)
        self.trim_in = tk.StringVar(value="0")
        ctk.CTkEntry(trim_frame, width=70, textvariable=self.trim_in).pack(side="left", padx=3)
        ctk.CTkLabel(trim_frame, text="Out").pack(side="left", padx=3)
        self.trim_out = tk.StringVar(value="")
        ctk.CTkEntry(trim_frame, width=70, textvariable=self.trim_out).pack(side="left", padx=3)
        ctk.CTkButton(trim_frame, text="Apply Trim", command=self.apply_trim).pack(side="left", padx=3)
        ctk.CTkButton(trim_frame, text="Split @ Playhead", command=self.split_at_playhead).pack(side="left", padx=3)

        center = ctk.CTkFrame(self)
        center.grid(row=1, column=1, sticky="nsew", padx=5, pady=(0, 10))
        center.grid_rowconfigure(1, weight=1)
        ctk.CTkLabel(center, text="Preview").grid(row=0, column=0, sticky="w", padx=10, pady=(10, 6))
        self.preview = PreviewCanvas(center, on_rect_selected=self.on_rect_selected)
        self.preview.grid(row=1, column=0, sticky="nsew", padx=10, pady=(0, 10))

        controls = ctk.CTkFrame(center)
        controls.grid(row=2, column=0, sticky="ew", padx=10, pady=(0, 10))
        ctk.CTkButton(controls, text="Play", command=self.play).pack(side="left", padx=4)
        ctk.CTkButton(controls, text="Pause", command=self.pause).pack(side="left", padx=4)
        ctk.CTkButton(controls, text="<<", command=lambda: self.seek_relative(-1.0)).pack(side="left", padx=4)
        ctk.CTkButton(controls, text=">>", command=lambda: self.seek_relative(1.0)).pack(side="left", padx=4)
        ctk.CTkLabel(controls, text="Quality").pack(side="left", padx=(15, 4))
        ctk.CTkOptionMenu(controls, values=["full", "half", "quarter"], variable=self.playback_quality).pack(side="left")

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

    def _enable_drag_and_drop(self) -> None:
        if DND_FILES and hasattr(self, "drop_target_register"):
            self.drop_target_register(DND_FILES)
            self.dnd_bind("<<Drop>>", self._on_drop)
            self._log("Drag & drop enabled.")
        else:
            self._log("Drag & drop unavailable (install tkinterdnd2).")

    def _on_drop(self, event: tk.Event) -> None:
        raw = self.tk.splitlist(event.data)
        self._add_clips([str(item).strip("{}") for item in raw])

    def _refresh_hardware_status(self) -> None:
        caps = self.capabilities
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
        if paths:
            self._add_clips(list(paths))

    def _add_clips(self, paths: list[str]) -> None:
        valid_suffixes = {".mp4", ".mov", ".mkv", ".avi"}
        added = 0
        invalid: list[str] = []
        for path in paths:
            if Path(path).suffix.lower() not in valid_suffixes:
                invalid.append(Path(path).name)
                continue
            self.project.clips.append(Clip(path=path))
            self.clip_list.insert("end", Path(path).name)
            added += 1
        if added:
            self._log(f"Imported {added} clip(s).")
            if len(self.project.clips) == added:
                self.clip_list.selection_set(0)
                self.on_clip_selected()
        if invalid:
            self._log("Skipped unsupported files: " + ", ".join(invalid))

    def on_clip_selected(self) -> None:
        idx = self._selected_index()
        if idx is None:
            return
        clip = self.project.clips[idx]
        self.trim_in.set(str(clip.in_point))
        self.trim_out.set("" if clip.out_point is None else str(clip.out_point))
        self.playback.load_clip(clip.path)
        self.seek_to(clip.in_point)

    def apply_trim(self) -> None:
        idx = self._selected_index()
        if idx is None:
            return
        clip = self.project.clips[idx]
        try:
            in_point = max(0.0, float(self.trim_in.get() or 0))
            out_text = self.trim_out.get().strip()
            out_point = float(out_text) if out_text else None
        except ValueError:
            messagebox.showerror("Trim", "In/Out values must be numeric.")
            return
        if out_point is not None and out_point <= in_point:
            messagebox.showerror("Trim", "Out must be greater than In.")
            return
        clip.in_point = in_point
        clip.out_point = out_point
        self._log(f"Trim applied for clip #{idx+1}: in={in_point}, out={out_point}")
        self.seek_to(in_point)

    def split_at_playhead(self) -> None:
        idx = self._selected_index()
        if idx is None:
            return
        clip = self.project.clips[idx]
        split_time = self.playback.position
        start = clip.in_point
        end = clip.out_point if clip.out_point is not None else max(start + 0.1, self.playback.duration)
        if split_time <= start or split_time >= end:
            messagebox.showwarning("Split", "Playhead must be inside clip range.")
            return

        first = Clip(path=clip.path, in_point=start, out_point=split_time, timeline_start=clip.timeline_start)
        second = Clip(path=clip.path, in_point=split_time, out_point=clip.out_point, timeline_start=clip.timeline_start)
        self.project.clips[idx:idx + 1] = [first, second]
        self._refresh_clip_list()
        self.clip_list.selection_set(idx + 1)
        self._log(f"Clip split at {split_time:.2f}s")

    def move_clip(self, direction: int) -> None:
        idx = self._selected_index()
        if idx is None:
            return
        new_idx = idx + direction
        if new_idx < 0 or new_idx >= len(self.project.clips):
            return
        self.project.clips[idx], self.project.clips[new_idx] = self.project.clips[new_idx], self.project.clips[idx]
        self._refresh_clip_list()
        self.clip_list.selection_set(new_idx)
        self._log(f"Moved clip to position {new_idx + 1}")

    def _selected_index(self) -> int | None:
        sel = self.clip_list.curselection()
        return sel[0] if sel else None

    def _refresh_clip_list(self) -> None:
        self.clip_list.delete(0, "end")
        for clip in self.project.clips:
            self.clip_list.insert("end", Path(clip.path).name)

    def seek_to(self, target_time: float) -> None:
        width_map = {"full": 960, "half": 640, "quarter": 426}
        width = width_map.get(self.playback_quality.get(), 640)
        frame = self.playback.get_frame_path(target_time, width=width)
        if frame:
            self.preview.show_frame(frame)
            Path(frame).unlink(missing_ok=True)

    def seek_relative(self, delta: float) -> None:
        self.seek_to(self.playback.step(delta))

    def play(self) -> None:
        if not self.playback.current_clip:
            self.on_clip_selected()
        if not self.playback.current_clip:
            return
        self.playing = True
        self._play_loop()

    def _play_loop(self) -> None:
        if not self.playing:
            return
        self.seek_relative(1 / 6)
        self.after(170, self._play_loop)

    def pause(self) -> None:
        self.playing = False

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

        current_index = self._selected_index() or 0
        x, y, w, h = self.selected_rect
        mode = "instant" if instant else "timed"
        event = ZoomEvent(
            clip_index=current_index,
            start_time=self.playback.position,
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
        self._refresh_clip_list()
        if self.project.clips:
            self.clip_list.selection_set(0)
            self.on_clip_selected()
        self._log(f"Project loaded: {path}")

    def export_dialog(self) -> None:
        if not self.project.clips:
            messagebox.showwarning("Export", "No clips to export.")
            return

        output = filedialog.asksaveasfilename(
            title="Export video",
            defaultextension=".mp4",
            filetypes=[("MP4", "*.mp4"), ("MKV", "*.mkv")],
        )
        if not output:
            return

        codec = "hevc" if messagebox.askyesno("Codec", "Use HEVC (H.265)?") else "h264"
        quality = "balanced"
        settings = ExportSettings(output_path=output, codec=codec, quality=quality)

        try:
            cmd, temp_concat = build_export_command(self.project, settings, self.capabilities)
        except ValueError as exc:
            messagebox.showerror("Export", str(exc))
            return

        self._log("Starting export: " + " ".join(cmd))
        threading.Thread(target=self._run_export, args=(cmd, temp_concat), daemon=True).start()

    def _run_export(self, cmd: list[str], temp_concat: str | None) -> None:
        try:
            self._export_process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            assert self._export_process.stdout
            for line in self._export_process.stdout:
                self.after(0, lambda l=line.rstrip(): self._log(l))
            code = self._export_process.wait()
            self.after(0, lambda: self._log("Export completed." if code == 0 else f"Export failed with code {code}"))
        finally:
            if temp_concat:
                Path(temp_concat).unlink(missing_ok=True)
            self._export_process = None

    def cancel_export(self) -> None:
        if self._export_process and self._export_process.poll() is None:
            self._export_process.terminate()
            self._log("Export cancelled by user.")

    def _log(self, message: str) -> None:
        self.log_box.insert("end", f"{message}\n")
        self.log_box.see("end")

