# Dino Editor (Prototype)

Windows-first video editor prototype built with **Python + CustomTkinter + FFmpeg**.

This is the first implementation pass and includes:

- Project skeleton for the editor app.
- Hardware-aware codec policy (**NVIDIA > AMD > Intel QuickSync > CPU**).
- UI foundation for:
  - importing clips,
  - preview area,
  - rectangle selection for zoom region,
  - instant/timed zoom events,
  - project save/load (`.dino` JSON format).
- Unit tests for hardware encoder selection policy and project save/load round-trip.

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

## Current status

This is a **foundation milestone** (not full NLE yet). Next milestones will add real playback pipeline, timeline editing logic, proxy generation, effects/transitions engine, and export queue.
