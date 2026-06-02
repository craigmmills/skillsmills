---
name: seed-four-layers
description: Coach a new project into the four-layer pattern (SoT, Framework, Studio, Output) through a guided interview, then scaffold a short manifest plus per-layer READMEs into the current working directory. Use when the user wants to start a new knowledge project, scaffold a new repo around the four-layer architecture, says things like "seed a new project", "set up the four layers", "scaffold SoT/framework/studio/output", "lay down the project shape", or invokes /seed-four-layers. Operates on the current working directory. Refuses to overwrite an existing CLAUDE.md. Does NOT restructure existing projects — that is a separate skill (not yet built).
---

# Seed Four Layers

Coach the user into shaping their project around four layers, then write a small set of seed files. The manifest is short on purpose; per-layer detail grows as the project takes form.

## The four layers

1. **SoT (Source of Truth, `00-sot/`)** — raw authoritative material. Low LLM involvement. If an agent researches from the web, promoted results live here and are treated as canon thereafter.
2. **Framework — the alignment layer (`10-framework/`)** — SoT restructured to match how the project's collaborators think about the work. Task-specific by design. The shape (ADRs, beats, sessions, outlines, entities, fragments…) depends on who's collaborating and what's in their heads.
3. **Studio (`20-studio/`)** — skills, scripts, and CLI tools that converse with SoT and Framework to produce outputs. Curated, not vendored. Skills usually live in `~/.claude/skills/`; the README names which ones earn their keep for *this* project.
4. **Output (`30-output/`)** — the artefacts the project produces.

**Edits flow inward.** Never edit `30-output/` to fix a fact. Fix `00-sot/`, then re-derive.

## When to use

- User is in an empty or near-empty directory and wants to start a new project with this pattern.
- User asks for "the four layers", "the studio pattern", "seed a project".

**Do NOT use when:**
- A `CLAUDE.md` already exists at cwd. Refuse and tell the user.
- User wants to restructure an *existing* project. That is a separate skill (`restructure-four-layers`, not yet built).

## Procedure

### Step 0 — Preflight

1. Run `ls` on cwd. Surface existing files/dirs to the user transparently.
2. Check for `CLAUDE.md`. If present: stop. Tell the user this skill won't overwrite — they should move/rename the existing manifest first, or wait for the restructure skill.
3. Confirm: "Ready to scaffold the four layers into `<cwd>`?"

### Step 1 — Project, Success, Collaborators

Ask **one question at a time**. Use grill-style follow-ups when answers are vague — don't move on until each is concrete enough to write into the manifest.

a. **"Tell me about this project — what is it, what work does it support?"**
b. **"What does success look like? Concretely, what's in front of you when it's done?"**
c. **"Who are the collaborators? How do they think about this work?"**

These three answers feed every layer below. Record them carefully.

### Step 2 — SoT

a. **"What raw material feeds this project — sources, documents, data, transcripts, prior work?"**
b. One follow-up if unclear (surface concrete examples).

Record what counts as SoT for this project, what the sources are, and whether provenance/frontmatter is needed (often yes for shared/multi-collaborator work; often no for solo work).

### Step 3 — Framework (the alignment layer)

The most important step. Do **not** ask "what shape should your framework take?" — that's too abstract.

Instead, **reason from the project + collaborators + success criteria**, then propose 2–4 framework shapes that match how the collaborators think. Examples below are illustrative — derive a fresh proposal each time from the actual interview answers.

a. **Propose:**

> Given that your project is [X], your collaborators think in [Y], and success is [Z], here are framework shapes worth considering:
> - **[Option 1]** — because it captures [their unit of thought]
> - **[Option 2]** — because [reason]
> - **[Option 3]** — because [reason]
>
> Which resonate? Combine, swap, or invent your own.

Reference shapes by domain (illustrative only):
- Infrastructure/architecture → ADRs, system-design narrative, data-flow diagrams
- Report/article → outlines, fragments, beat-by-beat structure
- Presentation → beat cards (hook/payload/transition), storyboard
- Workshop → session plans, activity cards, participant outcomes
- Codebase → module design notes, ADRs
- Research → entity sheets, case studies, literature notes
- Fundraising → entity sheets, case studies, proposals-in-progress

b. After user picks/refines, restate clearly:

> So `10-framework/README.md` will say: the unit of work is [X]; each one captures [fields]; filenames follow [convention]. Right?

### Step 4 — Output

Often partly answered by Step 1b's "what does success look like." Just confirm.

a. **"So outputs are [X, Y, Z]. Anything else the project produces?"**

### Step 5 — Studio

a. Scan available skills:
   - List `~/.claude/skills/` — these are system-available and trigger directly when invoked.
   - Optionally surface skills from `~/.agents/skills/` or `~/Projects/*/.claude/skills/` that are NOT yet symlinked into `~/.claude/skills/`.

b. Propose a curated subset for this project. For each skill, one sentence on **why it fits given this project's domain + framework + outputs**. Be selective — 5–8 skills, not 20.

c. Per skill, ask the user to approve / reject / "tell me more".

d. For approved skills *not* already symlinked into `~/.claude/skills/`:
   - Show the exact symlink command verbatim:
     ```
     ln -s <absolute-source-path> ~/.claude/skills/<name>
     ```
   - Ask permission **per skill**. Never batch-symlink.
   - On confirm, create the symlink.

### Step 6 — Summary + Write

a. List everything about to be created:
   ```
   CLAUDE.md
   00-sot/README.md
   10-framework/README.md
   20-studio/README.md
   30-output/README.md
   ```
   Plus any symlinks to `~/.claude/skills/`.

b. Confirm. On y: write everything. On n: ask what to change.

## File templates

These are scaffolds. Adapt every section from the interview — never paste a template verbatim without filling in project-specific content.

### CLAUDE.md (the short manifest)

```markdown
# <Project name>

<One-sentence project description from Step 1a.>

## The four layers

1. **`00-sot/`** — Source of Truth. <One sentence on what SoT means for this project.>
2. **`10-framework/`** — Alignment layer. Restructures SoT into the shape the collaborators think in. <One sentence naming that shape.>
3. **`20-studio/`** — Skills and scripts. See `20-studio/README.md` for the curated list.
4. **`30-output/`** — Artefacts this project produces. <One sentence on what those are.>

## Rules

- **Edits flow inward.** Never edit `30-output/` to fix a fact. Fix `00-sot/`, then re-derive.
- **Layer READMEs carry the local rules.** When working inside a layer, read its README first.
- **LLM-free at the bottom.** `00-sot/` does not contain LLM-generated content unless it has been explicitly promoted and marked.

## Collaborators

<From Step 1c. Who they are, how they think. This anchors the framework shape — if it changes, revisit `10-framework/README.md`.>
```

### 00-sot/README.md

```markdown
# Source of Truth

Raw authoritative material for this project. Low LLM involvement.

## What lives here

<From Step 2 — concrete list of sources / kinds of material.>

## Rules

- Treat content here as authoritative. Don't edit casually.
- Record provenance for anything brought in from external systems.
- LLM-generated content does not land here unless explicitly promoted and marked.
```

### 10-framework/README.md

```markdown
# Framework — the alignment layer

This layer restructures SoT into a form that matches how this project's collaborators think.

## Collaborators

<From Step 1c. Who they are, how they think about the work.>

## Unit of work

<From Step 3b. The repeating thing — e.g. "a decision", "a beat", "a session", "a chapter", "an entity".>

Each unit captures: <fields from Step 3b>

Filename convention: <from Step 3b>

## Why this shape

<One paragraph: why this restructuring fits the collaborators' mental model and the project's outcome.>
```

### 20-studio/README.md

```markdown
# Studio

Skills, scripts, and tools that earn their keep for this project.

Most skills live system-wide in `~/.claude/skills/` and are curated below — not vendored into this repo. Project-specific skills (if any) live in `.claude/skills/`.

## Curated skills

<From Step 5 — list each approved skill with one-line "why it fits here".>

## Project-specific skills

<Empty for now. As the project grows, skills written specifically for this project live in `.claude/skills/`.>
```

### 30-output/README.md

```markdown
# Output

Artefacts this project produces.

## What lives here

<From Step 4 — concrete list of outputs.>

## Rules

- Outputs are derived from `00-sot/` via `10-framework/`. Don't edit them to fix facts; fix the layer below and re-derive.
- Keep versions / dates for significant outputs.
```

## Notes for the LLM running this skill

- **Be conversational.** One question at a time. Grill-style follow-ups when answers are vague — but cap at ~3 follow-ups per layer to avoid spiralling.
- **Reason fresh in Step 3.** The reference shapes are illustrative, not a fixed library. Propose what actually fits this project's collaborators and success criteria.
- **Don't write any files until Step 6 confirmation.**
- **Per-skill consent for symlinks.** Never batch-symlink. Show the exact `ln -s` command before each one.
- **If the user pauses mid-interview**, save partial answers to memory as a "project in progress" so they can resume later.
