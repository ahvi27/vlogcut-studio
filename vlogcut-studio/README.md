# VlogCut Studio 2.0

A private, browser-based video editor for short vertical vlogs. Redesigned with a dark purple workspace, responsive layouts, illustrated style cards, and a phone preview.

## Run it

1. Extract the ZIP.
2. Open a terminal in the `vlogcut-studio` folder (the folder containing `index.html`).
3. Run:

   ```bash
   python3 -m http.server 8000
   ```

4. Open **http://localhost:8000** in desktop Chrome or Edge.

Stop the local server with **Ctrl+C**. On Windows, `py -m http.server 8000` also works. If port 8000 is occupied, use 8001 and open http://localhost:8001.

No npm installation, account, API key, external font, or paid service is required. Opening `index.html` directly may work for editing, but localhost or HTTPS is recommended for all browser APIs, including duplicate detection.

## Editing workflow

1. **Upload:** click the upload area or Add clips, or drag video files onto it. MP4, MOV, and WebM containers are accepted; the codec must be supported by your browser. Convert unsupported footage to H.264 MP4 or WebM first.
2. **Arrange:** drag clip cards or use the arrow buttons. Arrow controls also work on touch devices.
3. **Trim:** set In and Out using source times in seconds. Start must be before end and both must be within the source duration.
4. **Split:** click Split, enter a source time within the selected range, and confirm. Both segments share the original footage; their trims and captions are independent. Trim or remove a segment to cut repeated sections.
5. **Reset/undo:** the ↺ button restores that clip's full source range. Undo/Redo covers clip imports, trims, splits, reordering, removal, styles, and suggested cuts. Up to 35 undo snapshots are retained. Hook, music, framing, and caption text entry are not separate undo steps.
6. **Style:** choose Everyday diary, Quick recap, or Slow Sunday. Styles change color treatment and opening-title typography in both preview and export. Suggested cuts use a maximum of 4, 2, or 6 seconds per clip respectively.
7. **Shorten:** choose a target and order, then Suggest a shorter cut. It shortens the current ranges and redistributes available time across clips, without lengthening already short clips. It can finish under the target if not enough footage is available.
8. **Text:** the opening hook is shown during the first three seconds of the full edit. Enter one caption per clip, one line in the caption box. Captions move with their clips. A new second segment created by Split starts with an empty caption.
9. **Music:** add your own supported audio file, set its volume, and choose whether to keep original clip audio. Music loops to cover the edit and pauses across source-loading gaps. Use Remove to clear it.
10. **Preview:** play the full edit; Stop cancels playback. The placement guide is approximate and is never burned into exports.
11. **Export:** the browser renders the full edit in real time at 720 × 1280 and approximately 30 fps. When rendering completes, click Download video. The actual extension is chosen from browser-supported MP4 or WebM formats; WebM is not merely renamed to MP4. Stop discards a partial render.

## Important limits

- Keep this tab visible and your computer awake during playback/export. Browser scheduling and media seeking can introduce small frame-level timing differences. This is not a frame-accurate professional editing engine.
- Export format and codec support depend on the browser and device. Desktop Chrome/Edge are recommended; an MP4-only destination may require conversion if the browser exports WebM.
- Large/long projects can exceed browser memory. Work with short batches of footage, particularly on mobile.
- Video files and edit history remain in memory until refresh/close. They are not saved automatically. Your browser may ask before leaving; this cannot guarantee data recovery.
- The JSON **Edit plan** is a human-readable reference; it contains times, captions, and settings, not the media, and cannot reload a project.
- **Duplicate detection** compares file contents with SHA-256. It reports identical imported source files, excluding intentional split segments from the same source. Potentially matching sources over 250 MB are skipped to limit hashing memory. Results do not mean repeated speech or scenes were detected.
- There is no AI story understanding, automatic speech removal, automatic transcription, beat synchronization, cloud upload, or direct TikTok publishing.
- CapCut is a separate external website/app. The included link does not apply CapCut templates inside VlogCut. Import your exported video into CapCut to continue editing there.
- Use music and footage you have permission to publish.

## Privacy and files

All editing, hashing, and rendering happens in your browser. This package loads its assets locally and makes no analytics or upload requests. The CapCut link opens an external service only when selected.

```text
vlogcut-studio/
├── index.html
├── style.css
├── app.js
├── assets/
│   └── mark.svg
├── README.md
├── CHANGELOG.md
└── VALIDATION.md
```

## Changes from the uploaded version

- Complete visual redesign and mobile layout.
- Clip drag-and-drop reordering, undo/redo, full-source resets, and a split dialog.
- One audio source node per underlying media element, fixing split/replay errors.
- Serial media import and editing locks to prevent overlapping operations.
- Correct preview seeking after trim changes and serialized preview refreshes.
- Captions stay with their clips when reordered, imported, or split.
- Export seek gaps are excluded from the recording; soundtrack pauses between segments.
- Media and recorder errors are reported; cleanup disconnects audio and releases recording tracks.
- Broken music files and invalid trim/split inputs produce useful errors.
- Safer filename/text handling and no third-party font dependency.
