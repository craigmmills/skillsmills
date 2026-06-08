# build-presentation — first-time setup

Self-contained walkthrough for setting up Google Slides API access for the **{{SLUG}}** project, with credentials dedicated to this project (no shared state with any other).

## Result you're aiming for

- A Google Cloud project named **{{SLUG}}-deck**.
- The Slides and Drive APIs enabled in that project.
- An OAuth Desktop client whose `credentials.json` lives at `~/.config/{{SLUG}}-deck/credentials.json`.
- Your own email allowlisted as a test user on the consent screen.

After that, every run of the build script is non-interactive and prints a Slides URL.

## Step 1 — Create a Google Cloud project

1. Visit https://console.cloud.google.com.
2. Top bar → project picker → **New project**.
3. Name: `{{SLUG}}-deck`. Organisation: leave as "No organisation". Click **Create**.
4. Wait ~10 seconds for it to provision, then make sure it's the active project in the top bar.

## Step 2 — Enable the APIs

1. Left nav → **APIs & Services** → **Library**.
2. Search **Google Slides API** → **Enable**.
3. Back to Library → search **Google Drive API** → **Enable**.

## Step 3 — Configure the OAuth consent screen

1. Left nav → **APIs & Services** → **OAuth consent screen**.
2. **User type**: External → **Create**.
3. **App information**:
   - App name: `{{SLUG}}-deck`
   - User support email: your email
   - Developer contact email: your email
   - All other fields: leave blank.
4. **Scopes**: skip — the script requests scopes at runtime.
5. **Test users**: **+ Add users** → enter your email → **Save and continue**.
6. Leave **Publishing status** as **Testing**.

## Step 4 — Create the OAuth Desktop client

1. Left nav → **APIs & Services** → **Credentials**.
2. **+ Create Credentials** → **OAuth client ID**.
3. Application type: **Desktop app**.
4. Name: `{{SLUG}}-deck-desktop`.
5. Click **Create** → in the modal, click **Download JSON**.

## Step 5 — Drop the credentials into place

```bash
mkdir -p ~/.config/{{SLUG}}-deck
mv ~/Downloads/client_secret_*.json ~/.config/{{SLUG}}-deck/credentials.json
chmod 600 ~/.config/{{SLUG}}-deck/credentials.json
```

## Step 6 — First run (will trigger browser auth)

```bash
cd <project root>
python3.13 -m venv tools/build-presentation/.venv
tools/build-presentation/.venv/bin/pip install --quiet -r tools/build-presentation/requirements.txt
tools/build-presentation/.venv/bin/python tools/build-presentation/build_presentation.py \
  tools/build-presentation/specs/example.json
```

A browser opens. Approve the requested scopes. The token caches at `~/.config/{{SLUG}}-deck/token.json`. Future runs are non-interactive.

## Auth scopes used

- `https://www.googleapis.com/auth/presentations` — read/write presentations
- `https://www.googleapis.com/auth/drive.file` — narrow scope; the tool can only see/edit files it created itself

## Where the deck lands

In your personal Drive root by default. Add `target_folder_id` and optionally `archive_folder_id` (long strings from the folder URLs) to the spec JSON to land the deck inside a specific Drive folder and auto-archive previous decks there.

## Environment variable override

If you want the credentials directory somewhere other than `~/.config/{{SLUG}}-deck/`, set `{{SLUG_UPPER}}_DECK_CONFIG_DIR` to the path you prefer.
