# Changes

## 2.0

### Design
- Dark plum workspace with lavender accents, illustrated banners and style cards.
- Larger portrait preview and clear progress/status messages.
- Responsive layout, keyboard focus styling, and reduced-motion support.
- Locally bundled favicon and artwork; no external dependencies.

### Editing
- Drag-and-drop clip ordering with arrow controls as a touch/keyboard alternative.
- Undo/redo for structural edits, full-range reset, validated split dialog.
- Fairer duration allocation across short and long clips.
- Captions remain attached to clip objects through ordering and undo.
- Optional preview-only text placement guide.

### Reliability
- Media-element audio sources are shared correctly across split segments.
- Upload, analysis, and playback use operation locks.
- Stale preview operations cannot overwrite current playback.
- Recorder failures cannot surface as successful partial downloads.
- Recording pauses across seeks; soundtrack pauses across clip boundaries.
- Clear handling of invalid/unsupported files, unavailable browser APIs, and stalled playback.
- SHA-256 duplicate analysis ignores split references and skips overly large candidate files.
