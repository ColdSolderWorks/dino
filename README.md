# Dino Editor (Prototype)

Windows-first video editor prototype built with **Python + CustomTkinter + FFmpeg**.

Current prototype includes:

- Drag & drop video import (with fallback to file picker).
- Real frame preview with play/pause and seek step controls.
- Playback quality modes: full / half / quarter.
- Timeline clip list with:
  - move up/down,
  - trim in/out,
  - split at playhead.
- Rectangle-based zoom region selection and timed/instant zoom events.
- Project save/load (`.dino` JSON format).
- Export button with hardware-aware encoder policy:
  - **NVIDIA > AMD > Intel QuickSync > CPU**
- Export cancel support and log output.

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate  # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -e .[dev]
python -m dino_editor.app
```

## Run tests

```bash
pytest
```

## Notes

This is still a prototype: preview rendering is frame-based and intentionally simple to provide a working end-to-end flow before deeper optimization.
