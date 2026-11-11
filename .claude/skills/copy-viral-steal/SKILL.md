---
name: copy-viral-steal
description: Measures a Copy Viral Post reference reel's look (Admin › Copy Viral Post) with the /steal method - contact sheets, cut rhythm, spectrogram, face size and zooms - and writes what the auto director renders with - the theme (style.json), the layout numbers (hints.json) and the board animations shot by shot, written for Guillaume's lines (scenes.json) - in place of the look guessed from Gemini's words. Use for "/copy-viral-steal <projectId>", when the admin tab launches it headless, or when Guillaume asks to steal or re-measure a Copy Viral reel's style.
argument-hint: "<projectId> [--boards]"
allowed-tools: Read Write Edit Glob Grep Bash(npx tsx scripts/copy-viral.ts *) Bash(ffmpeg *) Bash(ffprobe *) Bash(mkdir *) Bash(cp *)
---

# Copy Viral Post: steal the reel's look

Two steps make Guillaume's version: **this skill sets everything up once** (theme, captions, cuts, layout numbers and
the board animations), then **the auto director** joins his takes and renders with it in 1 to 4 minutes, with no
judgement of its own. So whatever moves on screen in the original must be in your files: the auto director adds only
the per-shot layout (full camera, split, picture behind) and face punch-ins from Gemini's reading.

You run on Guillaume's Claude Code subscription, headless: never ask a question, decide and write it down.
Run every command from the repo root (`next5-landing/`). Write in English.

**`--boards` (or `mode: "boards"` in steal-info)**: the look is already in `out`, from a setup Guillaume saved on
another reel of the same creator. Do NOT measure it again and do not touch `style.json`, `hints.json`, `STYLE.md` or
the assets. Read them, read `exampleScenes` (the boards written for the reel the setup was measured on: same
creator, same board vocabulary, other content), make the dense sheets of THIS reference (`fps=4` on the first 10 s and
on the shots whose overlays are not empty), then do only **section 4** for this reel and **section 5**. Reuse the
example's board types, sizes, places and rhythm; the content comes from this reel's shots and Guillaume's lines.

## 1. Read

```bash
npx tsx scripts/copy-viral.ts steal-info <id>
```

It prints absolute paths: `reference` (the reel, already downloaded), `work` (your scratch folder, the `W` of /steal),
`out` (where your files go), the /steal skill and its learnings, the engine's style schema, style guide, sfx guide,
sfx library, scene library and design system, and per shot: the original's stills, layout, overlays, original
on-screen text, what the original says, and **Guillaume's line and on-screen text**.

Read `stealSkill`, `learnings`, `styleSchema`, then `sceneLibrary` and `designSystem` (the board items live in the
headers of `tools/video-agent-engine/engine/lib/scenes-story.js` and `scenes-life.js`: read them too). Follow /steal's
**section 2 (Measure)** and **section 3 (Write the style)** with these changes:

- **Skip section 1** (the reel is `reference`) and **sections 4 to 6** (no test edit: the admin tab previews it).
- **Skip the music level** (the ElevenLabs part). Judge the music on the spectrogram only.
- No sub-agents: do the passes yourself, one after the other.
- `video-agent/styles/<name>/` is `out` here; `W` is `work` (`mkdir -p` both first).
- Make the contact sheets denser where the boards move: `fps=4` on the first 10 s and on any shot whose overlays
  are not empty, so you see every entrance, highlight and swap.

## 2. The theme: style.json

- **Never set `layout.seam`** and never add `zoom.keys`: the layout and the punch-ins change shot by shot. A slow push
  goes in `zoom.drift`.
- Captions: the closest `captions.style` and its keys. Cuts: `cuts` as measured (hard, or the soft look).
- **Music**: `music: { "mute": true }` only when the reel has no music; otherwise leave the bed to the engine.
- **Sound effects**: only from `sfxLibrary` (copy the files into `out/assets/sfx/`, point `sfx.kit` at
  `assets/sfx/<file>`). Never generate any.
- The `creator` and `name` keys are replaced at render: skip them.
- Save 6 to 10 key stills to `out/stills/` as /steal says.

## 3. The layout numbers: hints.json

```json
{ "captionY": 1285, "captions": true, "splitSeam": 1410 }
```

Measured on the sheets, in px of a 1920 tall frame (a 384 px tall tile: y = tile y x 5):

- `splitSeam`: the top of the camera card in the split shots (where the paper ends). Required when any shot is split.
- `captionY`: the centre of the spoken caption line. `captions: false` when the reel shows no spoken captions.

## 4. The board animations: scenes.json

The heart of the copy. For **every shot whose original shows something on the paper or over the camera** (titles,
documents, lists, phone or app mockups, highlights, chips, arrows), write the engine scenes that do the same thing,
in the same place, entering and moving on the same beats, **saying Guillaume's content**: his `myOnScreenText` is the
title, his `myLine` gives the words of lists, documents and labels. Never copy the original creator's words, names or
pictures.

```json
{ "shots": {
  "1": [ { "type": "board", "layer": "stage", "from": 0, "to": 1, "items": [
    { "k": "text", "text": "How To Create a", "at": 0, "x": 540, "y": 170, "size": 64 },
    { "k": "text", "text": "Great Shop Hook", "at": "cue:shop hook", "x": 540, "y": 250, "size": 84 }
  ] } ]
} }
```

- Keys are shot numbers (1-based, as `steal-info` prints them). A shot you leave out keeps the plain on-screen text;
  a shot you list draws ONLY your scenes, so include its title.
- Every `from`, `to` and `at`, at any depth, is a share of the shot (`0` its first frame, `1` its last, `0.5` its
  middle) or `"cue:<2-3 words of myLine>"` (when Guillaume says them). Never seconds.
- Paper scenes (`layer: 'stage'`) must fit above `splitSeam` on split shots; on full-camera shots use `layer: 'over'`
  and keep the face clear.
- Only what the engine draws from data: board items, the scene types of the scene library. No `actors`, no `media`,
  no `broll`, no file you would have to make. A phone mockup with a video becomes a board with a phone-shaped card and
  his words; a document becomes lines with the highlight moving on the cue.
- Match the density: if the original swaps the picture on the paper every second, so do you. Count the swaps per
  shot on the sheets and write them down in STYLE.md under "Boards and images".
- Fonts, colors and the serif or italic accent words come from style.json (`display`, `colors.accent`): do not
  hard-code a hex in the items unless the original does.

`out` must hold: `style.json`, `STYLE.md`, `hints.json`, `scenes.json`, `stills/`, and `assets/sfx/` when the kit
uses files.

## 5. Finish

```bash
npx tsx scripts/copy-viral.ts steal-done <id> "<3 to 5 short lines: seconds per shot, caption look and place, colors and grade, boards per shot, cut sounds, zooms>"
```

It checks the files (scenes.json times included) and marks the look done. If it prints an error, fix the file and run
it again. If you cannot finish (the reel will not decode, a tool is missing), run
`npx tsx scripts/copy-viral.ts steal-fail <id> "<why>"`.
