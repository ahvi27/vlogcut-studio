# Validation report — VlogCut Studio 2.0

## Environment

- Tested in headless Chromium 153.0.8010.0 using Playwright.
- Served over localhost using the packaged HTML, CSS, JavaScript, and SVG.
- Desktop viewport: 1440 × 1050. Mobile layout: 390 × 844.
- Video fixtures: two short WebM clips with different dimensions and distinct audio tones, plus a byte-identical duplicate. Music fixture: a separate looping WAV tone.
- No browser JavaScript errors were recorded in the successful test runs.

## Passed checks

- Initial empty state and useful feedback when playing without footage.
- Help dialog open/close and mobile help access.
- Multi-file upload, metadata loading, and thumbnail generation.
- Arrow reordering and actual drag-and-drop reordering.
- Captions remain associated with their clips after reordering.
- Undo and redo of structural edits.
- Byte-identical source detection.
- Clip removal, valid trims, rejection of out-of-range trims, and full-source reset.
- Split dialog creates separate editable ranges referencing the same video resource.
- All three style selections update editor state.
- Framing changes redraw the preview.
- Opening hook is not incorrectly shown when selecting a clip beyond the first three seconds of the edit.
- Preview-only placement guide toggles.
- Music loads, volume updates, and music can be removed.
- Two successive full previews of split footage complete without media-source errors.
- Actual browser video export with original sound and music.
- Repeated export after muting original sound and removing music.
- Stopping playback unlocks the editor.
- Canceling an export discards the partial result and hides the download link.
- JSON edit-plan download contains the current clip ranges and captions.
- A hard 15-second target is respected when footage exceeds the target.
- Short clips retain their length while remaining time is redistributed.
- No horizontal overflow at the tested mobile width.
- Broken video and audio files produce an error without destroying the existing edit.

## Export inspection

The final tested build selected WebM because the test browser did not advertise the supported H.264/AAC MP4 profiles. FFprobe confirmed a valid 720 × 1280 VP9 video track and an Opus audio track.

FFmpeg decoded both the soundtrack export and the muted export. Frequency checks confirmed:

- The original clip's 440 Hz tone remained in both split sections.
- The later clip's 660 Hz tone replaced the original tone at the expected section.
- The selected music's 880 Hz tone was present alongside both source tones.
- The muted export decoded to zero-valued audio samples.

Desktop and mobile screenshots were visually inspected. The mobile hero was adjusted to prevent decorative artwork from overlapping its text.

## Limits of verification

These results establish the tested workflows, not universal codec/device compatibility. H.264/AAC MP4 recording, Safari, physical mobile devices, long projects, and unusually large or damaged media were not validated. The MP4 selection path uses browser capability detection and falls back to WebM. Rendering is real-time and subject to frame scheduling; it is not a frame-accurate transcoder. See README.md for feature scope and operating limits.
