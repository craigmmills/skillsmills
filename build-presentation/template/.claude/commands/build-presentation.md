---
description: Generate a content-driven Google Slides deck (titles + bullets + images + speaker notes) from a meeting brief
argument-hint: <meeting-brief>
allowed-tools: Read, Write, Bash, Grep, Glob
---

You are building a presentation deck for a {{SLUG}} audience. The build script lives at `tools/build-presentation/build_presentation.py`. JSON specs go to `tools/build-presentation/specs/`; the script produces a brand-new editable Google Slides deck with text in IBM Plex Sans.

## Input

`$ARGUMENTS` — a brief describing the meeting. At minimum: who the audience is, how long the slot is, what topics need covering. If the brief is sparse, surface the gaps and ask before drafting.

## Step 1 — Read the brief and the project state

Read `$ARGUMENTS`. Identify:

- **Audience** — tone and depth depend on this.
- **Duration** — minutes available. Roughly 1 minute per content slide; allow time for transitions and questions.
- **Topics** — what's being decided / shown / asked for.
- **Decision asks** — does the slot end in a vote, a request for feedback, or just an update?

Then pull relevant context from the project — the main deliverable document, any structured framework material, and any rendered charts that could be embedded.

## Step 2 — Sketch a slide outline before writing the spec

Before producing JSON, sketch the outline as a numbered list (1–2 lines per slide). Show this to the user and confirm before generating the full spec.

Aim for 1 minute per content slide. A 10-minute slot ≈ 8–12 slides; a 15-minute slot ≈ 12–15. Leave headroom for discussion.

## Step 3 — Write the spec JSON

Write to `tools/build-presentation/specs/<short-slug>-<YYYY-MM-DD>.json`. Format:

```json
{
  "title": "Deck title shown in Drive",
  "slides": [
    {"type": "title", "title": "Headline", "subtitle": "Subtitle / context line"},
    {"type": "section", "title": "Section divider"},
    {"type": "content", "title": "Slide title", "bullets": ["...", "..."], "speaker_notes": "Talk track."},
    {"type": "content_image", "title": "...", "bullets": ["..."], "image_path": "<absolute path>", "speaker_notes": "..."},
    {"type": "image", "title": "Optional title above image", "image_path": "<absolute path>", "speaker_notes": "..."},
    {"type": "two_column", "title": "...", "left_title": "Today", "left": ["..."], "right_title": "Target", "right": ["..."], "speaker_notes": "..."},
    {"type": "quote", "text": "Pulled quote", "attribution": "Source"}
  ]
}
```

Slide types:

- `title` — large title + optional subtitle. Use once at the top.
- `section` — divider between major sections.
- `content` — title + bulleted body. Default type.
- `content_image` — title + left-half bullets + right-half image.
- `image` — full-bleed image with optional title above.
- `two_column` — title + two parallel bullet columns.
- `quote` — large pulled quote with attribution.

Every content slide should have **speaker notes** (2–4 sentences) — what the user reads on the morning of the meeting.

Bullets should be tight (under ~12 words). If a slide needs more than 5–7 bullets, split into two slides.

For image embeds, prefer absolute paths.

## Step 4 — Build the deck

From the repo root:

```bash
tools/build-presentation/.venv/bin/python tools/build-presentation/build_presentation.py tools/build-presentation/specs/<slug>-<YYYY-MM-DD>.json
```

If the venv doesn't exist:

```bash
python3.13 -m venv tools/build-presentation/.venv
tools/build-presentation/.venv/bin/pip install --quiet -r tools/build-presentation/requirements.txt
```

OAuth credentials live at `~/.config/{{SLUG}}-deck/credentials.json` (override with `{{SLUG_UPPER}}_DECK_CONFIG_DIR`). For first-time setup, follow `tools/build-presentation/SETUP.md`.

The script's last stdout line is the deck URL. Capture it.

## Step 5 — Report

Tell the user:

- **Deck URL** — the live editable Slides link.
- **Slide count and rough timing** — confirms the duration is right.
- **What you embedded** — list any charts, images, or quotes you reused.
- **What you'd suggest tweaking before the meeting** — usually 1–2 spots where the audience's framing might want adjusting once they see the draft.
- **Iteration loop** — edit the spec JSON to refine, re-run the command to regenerate. Don't manually edit the live deck.

## Failure modes worth flagging

- **Missing OAuth credentials** — script exits with a setup message; point at `tools/build-presentation/SETUP.md`.
- **Image path doesn't exist** — happens when a chart hasn't been rendered yet.
- **Spec validation** — malformed JSON or missing required fields will fail the Python tool. Read `build_presentation.py` for supported keys per slide type.
- **Slides API rate limits** — large decks (30+ slides with image uploads) can hit per-minute caps. Split or retry.

## Naming convention for spec files

`tools/build-presentation/specs/<audience>-<YYYY-MM-DD>.json`.
