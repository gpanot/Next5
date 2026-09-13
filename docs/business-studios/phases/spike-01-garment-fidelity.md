# SP1 — Spike: Garment fidelity (Shop go / no-go)

**Size:** S · **Depends on:** — (run in parallel with P0/P1) · **Output:** a short report, no product code

## Goal

Answer one question before building Shop Studio (P8): **does Nano Banana 2 Edit reproduce real
garments accurately enough that sellers would post the result?** If not, Shop is parked and Brand
launches alone.

## Tasks

- [ ] Collect **30 real product photos** from 3–5 Saigon shops (with permission): 10 prints/patterns,
      10 solid colours with details (buttons, pleats, collars), 5 sets, 5 accessories. Include front
      photo for all, detail photo for 15.
- [ ] Generate 3 Studio-model face/full-body references first (C17/C18 `model-vy`, C19/C20 `model-thao`,
      C15/C16 `model-an` from `04-image-prompts.md`).
- [ ] Write `scripts/spikes/garment-fidelity.ts` (run with `tsx`, **not** imported by the app) that, for
      each product × 3 shots (`full_body_front`, `half_body`, `detail_closeup`) × 1 model, composes the
      prompt using the IDENTITY + GARMENT + SET(`beige-wall`) + SHOT + QUALITY blocks from
      `02-architecture.md` §6.1 and calls WaveSpeed with images `[face, full_body, front, detail?]`.
      Save outputs to `scripts/spikes/out/{productId}/{shot}.jpg` and a `results.csv` with prompt,
      task id, seconds, cost.
- [ ] Also run a **variant B** prompt order (product images first, identity after) on 10 products to
      compare.
- [ ] Rate every output with 3 raters (Guillaume + 2 shop owners) on: **Garment match** (1 = wrong item,
      3 = small drift acceptable, 5 = identical), **Would you post it?** (yes/no), **Face/body believable** (yes/no).
      Reuse `scorer-eval/rating-app` if convenient, otherwise a shared sheet.
- [ ] Write `docs/business-studios/spike-01-report.md`: pass rates per category, best prompt order,
      typical failure types (print drift, colour shift, length change, added accessories), cost/time per image.

## Go / no-go

| Result | Decision |
|---|---|
| ≥ 70% of outputs "Would post" **and** average garment match ≥ 4 on solids/sets | **Go** — build P8 as specified |
| Prints/patterns < 50% but solids ≥ 70% | **Go with limits** — P8 shows a "Prints may vary — check before posting" warning and marks printed products |
| < 50% overall "Would post" | **No-go** — park P8; launch Brand only; re-test when a new model is available |

## Cursor kickoff prompt

```
Implement spike SP1 from docs/business-studios/phases/spike-01-garment-fidelity.md.
Read docs/business-studios/02-architecture.md §6.1 for prompt blocks and src/lib/wavespeed.ts for the API client.
Create scripts/spikes/garment-fidelity.ts only — do not modify app code except adding an optional
`imageUrls: string[]` parameter to submitEdit in src/lib/wavespeed.ts (keep imageUrl working).
Inputs: scripts/spikes/products/*.json (name, category, colour, front, detail?) and model reference paths.
Output files + results.csv as described. Print a cost summary at the end.
```
