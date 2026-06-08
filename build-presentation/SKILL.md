---
name: build-presentation
description: Generate content-driven Google Slides decks (title + bullets + images + speaker notes) from a JSON spec via a small Python tool. Use when the user wants to build a slide deck from a meeting brief or from existing project material, or when they invoke /build-presentation. The skill installs a project-local Python tool the first time it runs, then drives it via a project slash command.
---

# build-presentation

A reusable pattern for generating editable Google Slides decks from JSON specs.

A small Python script uses the Google Slides + Drive APIs, driven by a JSON spec, to produce a brand-new editable deck with IBM Plex Sans typography.

## What this skill does

- **Installs** a project-local `tools/build-presentation/` directory containing the Python script, its requirements, a setup walkthrough, and a project slash command.
- **Guides one-time Google Cloud setup** — a fresh Google Cloud project per *consuming project* (so credentials are never shared across projects).
- **Hands the project Claude a `/build-presentation` slash command** that composes specs from project context (briefs, READMEs, docs) and runs the Python tool to produce a deck.

The skill itself contains the templates. **It does not store any credentials, tokens, project-specific paths, or live deck IDs.**

## When to use

- The user has invoked `/build-presentation` and the project does not yet have `tools/build-presentation/` installed.
- The user explicitly asks to "set up the slide deck pipeline" or "install the build-presentation tool".
- The user wants to generate a deck from project material (a brief, an existing document, a meeting outline).

## When NOT to use

- The user wants a deck without Google Slides (e.g. Keynote, Powerpoint, Reveal.js). This skill produces Google Slides decks only.
- The user already has `tools/build-presentation/` in their project. In that case, run the project's `/build-presentation` slash command directly — don't reinstall.
- The user wants to manage authentication, share permissions, or do anything else with Google Workspace at scale. This skill installs a single-user Desktop OAuth flow.

## Installation flow

When invoked for the first time on a project:

### Step 1 — Confirm install scope

Ask the user for a **project slug** — used to name the Google Cloud project, the credentials config directory, and the deck title prefix. Conventional: hyphenated lowercase, matches the project directory name (e.g. `my-project`, `client-deck`).

The slug becomes:

- Google Cloud project name: `<slug>-deck`
- Credentials directory: `~/.config/<slug>-deck/`
- Env var override: `<SLUG_UPPER>_DECK_CONFIG_DIR` (with hyphens → underscores)

### Step 2 — Copy the template into the project

From the skill's `template/` directory:

```bash
SLUG="<slug>"
SLUG_UPPER=$(echo "$SLUG" | tr 'a-z-' 'A-Z_')

PROJECT_ROOT="$(pwd)"  # or wherever the user wants it
TEMPLATE_DIR="$(dirname "$(readlink -f "$0")")/template"

mkdir -p "$PROJECT_ROOT/tools/build-presentation/specs"
mkdir -p "$PROJECT_ROOT/.claude/commands"

# Copy and substitute placeholders
for f in build_presentation.py requirements.txt SETUP.md; do
  sed "s|{{SLUG}}|$SLUG|g; s|{{SLUG_UPPER}}|$SLUG_UPPER|g" \
    "$TEMPLATE_DIR/$f" > "$PROJECT_ROOT/tools/build-presentation/$f"
done

# Slash command
sed "s|{{SLUG}}|$SLUG|g; s|{{SLUG_UPPER}}|$SLUG_UPPER|g" \
  "$TEMPLATE_DIR/.claude/commands/build-presentation.md" \
  > "$PROJECT_ROOT/.claude/commands/build-presentation.md"

# Example spec (optional)
cp "$TEMPLATE_DIR/specs/example.json" \
   "$PROJECT_ROOT/tools/build-presentation/specs/example.json"
```

The template files contain `{{SLUG}}` and `{{SLUG_UPPER}}` placeholders that the install step replaces.

### Step 3 — Walk the user through Google Cloud setup

Point the user at the copied `tools/build-presentation/SETUP.md`. It walks them through:

1. Creating a Google Cloud project named `<slug>-deck`
2. Enabling the Slides and Drive APIs
3. Configuring an External OAuth consent screen in Testing mode
4. Creating an OAuth Desktop client ID and downloading `credentials.json`
5. Dropping it into `~/.config/<slug>-deck/credentials.json`

### Step 4 — First run

```bash
cd <project root>
python3.13 -m venv tools/build-presentation/.venv
tools/build-presentation/.venv/bin/pip install --quiet -r tools/build-presentation/requirements.txt
tools/build-presentation/.venv/bin/python tools/build-presentation/build_presentation.py \
  tools/build-presentation/specs/example.json
```

A browser opens; the user approves the consent screen. A token caches at `~/.config/<slug>-deck/token.json`. Future runs are non-interactive.

### Step 5 — Confirm install

Tell the user:

- The Python tool lives at `tools/build-presentation/build_presentation.py`.
- The setup guide lives at `tools/build-presentation/SETUP.md`.
- The slash command lives at `.claude/commands/build-presentation.md` and is available on the next Claude Code session start.
- The example spec lives at `tools/build-presentation/specs/example.json`.
- Future deck generation: invoke the project's `/build-presentation` slash command with a brief.

## Slide-type vocabulary

| Type | Use | Required keys | Optional keys |
|---|---|---|---|
| `title` | Opening slide | `title` | `subtitle` |
| `section` | Section divider | `title` | — |
| `content` | Title + bullets (default) | `title` | `bullets`, `speaker_notes` |
| `content_image` | Title + bullets left + image right | `title` | `bullets`, `image_path`, `speaker_notes` |
| `image` | Full-bleed image + optional title | `image_path` | `title`, `speaker_notes` |
| `two_column` | Title + two parallel bullet columns | `title` | `left_title`, `left`, `right_title`, `right`, `speaker_notes` |
| `quote` | Pulled quote | `text` | `attribution` |

Every content slide should carry `speaker_notes` — 2–4 sentences the presenter reads on the morning of the meeting.

## Authoring guidance for the project Claude

When the project's `/build-presentation` is invoked, the project Claude should:

1. **Read the brief** in `$ARGUMENTS`. Identify audience, duration, topics, decision asks.
2. **Pull project context.** Always check the project's main deliverable document, any structured framework material (assessments, recommendations), and any rendered charts available for embedding.
3. **Sketch a slide outline first** — numbered list, 1–2 lines per slide. Confirm with the user before generating JSON.
4. **Write the spec** to `tools/build-presentation/specs/<audience>-<YYYY-MM-DD>.json`.
5. **Run the build script.** The last stdout line is the deck URL.
6. **Report back.** Deck URL, slide count, what was embedded, what to tweak before the meeting, the iteration loop ("edit spec, re-run").

## Security posture

- **No credentials are stored in this skill or in any project copy.** OAuth client secrets are downloaded by the user from Google Cloud Console into `~/.config/<slug>-deck/`.
- **Each project gets its own Google Cloud project and credentials.** No shared state between projects.
- **OAuth scope is `drive.file`** — narrow scope; the tool can only see and modify files it created itself. It cannot read the user's wider Drive.
- **Tokens are cached locally only** at `~/.config/<slug>-deck/token.json`. They are not transmitted to this skill or to any third party.

## Iteration loop

Decks are cheap to regenerate. The model is **edit the spec JSON, re-run the script**. Do not manually edit the live deck — those edits are lost on the next regeneration.

To archive previous decks rather than accumulate them in a folder, add `target_folder_id` and `archive_folder_id` to the spec (long IDs from the folder URLs). The script moves any existing presentations from `target_folder_id` to `archive_folder_id` before landing the new deck.

