---
name: copy-viral-render
description: Directs and renders a Copy Viral Post edit (Admin › Copy Viral Post) so Guillaume's takes look as close as possible to the original viral reel - framing, green-screen cutout over the sequence pictures, on-screen texts, captions - by drafting the engine spec, comparing stills of the edit next to the original shot by shot, fixing the spec, then rendering. Use for "/copy-viral-render <projectId> [--sequence N] [--resolution 720x1280|1080x1920]", when the admin tab launches it headless, or when Guillaume asks to render or fix a Copy Viral project.
argument-hint: "<projectId> [--sequence N] [--resolution 720x1280|1080x1920]"
allowed-tools: Read Edit Write Glob Grep Bash(npx tsx scripts/copy-viral.ts *) Bash(node tools/video-agent-engine/engine/short.mjs *) Bash(ffmpeg *) Bash(ffprobe *)
---

# Copy Viral Post: direct and render

You are the editor. The goal is one thing: **Guillaume's version looks like the original reel**, shot for shot: same
framing and person size, same green-screen look over the same kind of picture, same on-screen texts in the same place
and on the same words, same caption look. His words and face replace the original creator's; nothing else should
look different. You run on Guillaume's Claude Code subscription (no API costs): take the time to get it right.

Run every command from the repo root (`next5-landing/`). Write every message and the spec texts in English.

## Arguments

`<projectId>` (a UUID), optional `--sequence N` (1-based: the quick preview of that sequence only, 720 by default),
optional `--resolution 720x1280|1080x1920` (default: 720 for a sequence, 1080 for the full edit). Pass the same
`--sequence` / `--resolution` to every command below.

## 1. Understand the job (read, don't guess)

```bash
npx tsx scripts/copy-viral.ts info <id> [--sequence N]
```

It prints the reel's style (read by Gemini; when `stolen` is set, the look was measured by /copy-viral-steal: read its
`notes` (STYLE.md) first, the draft already uses its `styleJson`, so keep its captions, colors and sounds), and per shot: the original's stills (`originalStills`, 3 per shot) and
mid frame, Gemini's reading (layout, framing, face %, movement, on-screen text, overlays, background), what the
original says, Guillaume's line and on-screen text, his take (file, size), and the background picture for the shot's
sequence. **Read the original stills and the background pictures** (Read tool on the .jpg files). Note per sequence:
how big the person is (face height as % of 1920), where (centered? low?), what is behind, which texts show where.

## 2. Draft

```bash
npx tsx scripts/copy-viral.ts draft <id> [--sequence N]
```

Joins the takes in shot order, frames the face, transcribes (whisper.cpp), writes `source/style.json` and a first
`source/spec.js` from fixed rules, and runs `prepare`. It prints `engineDir` and `spans` (where each shot sits in the
joined take, in SOURCE seconds: every time in the spec is a SOURCE second). `files/words.md` in the engine dir lists
every word with its source time.

## 3. Compare, measure, fix: until it matches (strict)

```bash
npx tsx scripts/copy-viral.ts compare <id> [--sequence N]
```

Takes fresh stills, writes `<engineDir>/compare/shot-NN.jpg` (original LEFT, Guillaume's edit RIGHT, same moment of
the shot) and `compare/all.jpg`, and **measures** every shot with Apple Vision (`measure` in its output):

- `original` / `mine`: face centre (`cx`, `cy`) and height `h`, in px of the 1080×1920 frame.
- `sizeDiffPct`, `dx`, `dy`: how far mine is from the original. `ok` = within ±8 % size and ±40 px.
- `cutout.match`: the exact `scale`, `x`, `bottom` for that shot's entry in `spec.cutout` (`cutout.index`) that puts
  his face on the original's face, at its size.

**The edit is not done until `measure.allOk` is true.** Each round:

1. Set every non-ok shot's cutout entry to its `cutout.match` values (one cutout entry per shot; keep their
   `from`/`to`). These are computed, not guesses: apply them as they are.
2. Read `compare/all.jpg` for what numbers cannot see: on-screen texts (same words, place, size), captions (same
   look and place, never over the face), the picture behind, layout.
3. If you changed `cam`, `cut`, `media` or a cutout's `from`/`to`: `node tools/video-agent-engine/engine/short.mjs prepare <engineDir>`.
4. `compare` again.

Shrinking and moving him is expected: the original creator was shrunk and placed the same way. Never answer
"his take is framed too tight" or "record from further back": a smaller scale and a higher `bottom` show his chest cut
by a straight edge over the picture, exactly like the original's cut-out. The only acceptable non-match is a shot
where `mine` is null twice in a row (no face found): say so.

A **real-room shot** (no picture, layout `0`) that must look smaller than his take: put it in a cutout too, over a
picture, or over his own room. Use the sequence's picture, or `bg`-less paper if the original shows a plain backdrop.
`zoom.keys` only makes him bigger (1 to 1.15).

At most 5 rounds. If `allOk` is still false then, render anyway and list each shot's `sizeDiffPct` / `dx` / `dy` in the
final message.

Engine reference: `tools/video-agent-engine/references/scene-library.md` (spec keys, scenes, cutout, captions) and
`style-schema.md` (style.json keys). Read the part you need, not everything.

### Recipes that work (tested on this engine)

**Green screen, person smaller over a picture** (the original shows a cut-out person over a background picture):
a *standard* cutout standing on the paper, the paper fully shown, and the sequence picture as a full-frame image
board behind him. **The draft already writes this** for every shot whose sequence has a picture (`cutout` list with
`scale: 0.8`, one picture board per sequence): your job is to tune `scale`, `x` and `bottom` per stretch (split a
cutout entry when two sequences need different sizes). Every layout key in that range must be `1920` (a key at `0` hands the cutout back to the camera
and doubles him).

```js
layout: { keys: [[0, 1920], [7.47, 1920]] },                // one key per shot, all 1920 in the cutout range
cutout: [{ from: 0, to: 26.5, scale: 0.75, x: 540, bottom: 1920 }],  // scale = person size (1 = take size), x = eyes x, bottom = feet line
scenes: [
  { type: 'board', layer: 'stage', from: 0, to: 7.47, push: 0, items: [
    { k: 'img', img: 'assets/images/bg-1.jpg', x: 540, y: 960, s: 1080, h: 1920, shown: true, shadow: false, at: 0 } ] },
  // next sequence: another board from its first shot's start with its own bg-N picture
]
```

- `scale`, `x`, `bottom`: set from `measure` (`cutout.match`), never by eye. `x` = where his eyes land sideways,
  `bottom` = where the take's bottom edge lands (lower than 1920 lifts him up).
- The pictures are copied to `assets/images/bg-<shot number>.<ext>` by the draft.
- A sequence without a picture: his real room, full camera (`layout` key `0`), outside the cutout range.

**Real room, framing**: `zoom.keys: [[t, z, 400]]` punches in on a cut (1 to 1.15 max, never below 1). For a wider
look than the take you cannot zoom out: say so instead.

**On-screen text** (title, list): `board` scenes on `layer: 'over'` (over the camera) or `'stage'` (over the paper,
also over a picture board when listed after it). Items `{k: 'text', text, x, y, size, color, halo, at}`; a list =
one item per line, each `at` on the word it is said (`files/words.md`). Same place and size as the original.

**Captions**: `captions.yKeys: [[0, y]]` (line centre y), `captions.size`, `captions.maxWords`, and in `style.json`
`captions.style` (`band` with `bg: 'none'` = white words with a shadow; `rise` = said word on a block). Match the
original's place and look. Never over his face (eyes to chin).

## 4. Render

```bash
npx tsx scripts/copy-viral.ts render <id> [--sequence N] [--resolution …]
```

Renders (720 draft or 1080), writes the .srt, and marks the edit or the sequence preview as done in the admin tab.
If something is broken beyond repair, mark it failed with the reason instead:

```bash
npx tsx scripts/copy-viral.ts fail <id> [--sequence N] "why"
```

Never leave the job running: end with `render` or `fail`.

## Final message

Three to six lines: the final `measure` numbers per shot (size %, dx, dy), what else you matched (texts, captions,
picture), anything that still differs and why (an engine limit, never "the take"), and the output path.

## Rules

- Never cover his face with text. Keep texts and captions inside the safe zone (clear of the top 220 px, the bottom
  450 px, 35 px each side).
- Keep Guillaume's words and timings: never cut words; `cut: [[a, b]]` only for a retake or dead air.
- Only these commands: `scripts/copy-viral.ts`, the engine's `short.mjs`, ffmpeg/ffprobe, and file reads/edits in
  the engine dir. Do not edit the project's `project.json` or anything outside the engine dir.
