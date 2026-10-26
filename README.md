# 🎬 VlogCut Studio

A browser-based video editor that turns everyday clips into short
vertical stories for TikTok, Reels, and Shorts.

Built with HTML, CSS, and vanilla JavaScript, featuring a responsive
dark purple workspace and local video processing.

## Features

### Video Editing

- Upload multiple video clips
- Drag and drop files into the editor
- Drag clip cards or use arrows to rearrange them
- Trim clips using source start and end times
- Split clips into independently editable segments
- Restore a clip’s full source range
- Undo and redo structural edits
- Preview the full edited sequence

### Styles and Text

- Everyday Diary: warm tones and up to 4-second suggested cuts
- Quick Recap: bold contrast and up to 2-second suggested cuts
- Slow Sunday: muted tones and up to 6-second suggested cuts
- Suggested shorter edits with 15-, 30-, or 60-second targets
- Opening hook displayed during the first three seconds
- Manual captions that follow their clips when reordered
- Fill or fit framing
- Optional preview-only text placement guide

### Audio and Export

- Keep or mute original clip audio
- Add music from your device
- Adjustable music volume
- Music loops to cover the edit
- Export vertical video at 720 × 1280
- H.264/AAC MP4 when supported, otherwise WebM
- Cancel playback or discard an unfinished export
- Download a JSON edit plan for reference

### Additional Tools

- SHA-256 checks for identical uploaded files
- Responsive desktop and mobile layouts
- Built-in editing guide
- Separate link to explore CapCut templates

## Technologies

- HTML5
- CSS3
- Vanilla JavaScript
- Canvas API
- Web Audio API
- MediaRecorder API
- Web Crypto API

No framework, API key, account, or npm installation is required.

## Project Structure

If you uploaded the extracted folder directly, your repository contains:

    vlogcut-studio/
    ├── index.html
    ├── style.css
    ├── app.js
    ├── assets/
    │   └── mark.svg
    ├── README.md
    ├── CHANGELOG.md
    └── VALIDATION.md

## Run Locally

Open a terminal in the folder containing `index.html`:

    cd vlogcut-studio
    python3 -m http.server 8000

Then open:

    http://localhost:8000

On Windows, you can also use:

    py -m http.server 8000

Stop the server with **Ctrl+C**.

If port 8000 is occupied, use another port:

    python3 -m http.server 8001

Then visit http://localhost:8001.

Desktop Chrome or Edge is recommended. Use localhost or HTTPS
for browser features such as duplicate detection.

## How to Create a Video

1. Upload your video clips.
2. Arrange them using drag-and-drop or the arrow controls.
3. Adjust In and Out times to trim footage.
4. Split clips to remove unwanted or repeated sections.
5. Choose an editing style.
6. Optionally select a target duration and suggest a shorter cut.
7. Add an opening hook and captions.
8. Add optional music and adjust the volume.
9. Preview the edited sequence.
10. Click **Export video**, wait for rendering, then download.

Keep the tab visible and your computer awake during export.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |

Shortcuts are inactive while typing in form fields.

Undo/redo covers structural edits and style changes.
Hook, caption text entry, music, and framing are not separate undo steps.

## Privacy

Video editing, audio mixing, duplicate checking, and rendering
happen in your browser.

The application does not upload your footage or include analytics.
Its assets load locally. CapCut opens separately when you select
the external link.

## Important Limitations

- Projects remain in memory and reset when the page refreshes or closes.
- The JSON edit plan contains settings and clip timings, not media.
  It cannot restore a project.
- Supported video and audio codecs depend on your browser.
- Export runs in real time and can have small frame-level timing differences.
- Large projects may exceed browser memory.
- Duplicate detection finds identical files, not repeated scenes or speech.
- Candidate files larger than 250 MB are skipped during duplicate hashing.
- Suggested cuts use timing rules; they do not understand your story.
- Captions are entered manually.
- There is no automatic transcription, beat synchronization,
  direct TikTok publishing, or built-in CapCut template integration.
- Use music and footage you have permission to publish.

## CapCut Workflow

To continue editing with CapCut:

1. Export and download your video from VlogCut Studio.
2. Open CapCut separately.
3. Import the exported video.
4. Apply available effects, sounds, or template workflows there.

CapCut templates do not run inside this application.

## Validation

The included `VALIDATION.md` documents browser tests covering:

- Uploads and thumbnails
- Reordering, trimming, splitting, and undo/redo
- Captions and style selection
- Duplicate detection
- Music loading and repeated playback
- Video export and cancellation
- Original audio, music mixing, and mute behavior
- Invalid media handling
- Responsive mobile layout

Testing used Chromium and short sample media. Compatibility with
every browser, codec, device, or project size is not guaranteed.

## Customization

- Edit `index.html` to change the layout and interface text.
- Edit `style.css` to customize colors, typography, and spacing.
- Edit `app.js` to change editing behavior and export settings.
- Replace `assets/mark.svg` to customize the logo.

## Project Goal

Help creators spend less time assembling clips and more time
telling their everyday stories.
