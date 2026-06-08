"""Build a content-driven Google Slides deck from a structured slide spec.

Accepts a JSON spec describing each slide — title, bullets, speaker notes,
optional image — and produces a brand-new Slides deck with text rendered in
IBM Plex Sans Light.

Slide types supported:
- title         — title slide (large title, optional subtitle)
- section       — section divider (large centred text)
- content       — title + bullets
- content_image — title + bullets + image to the right
- image         — title + full-bleed image below
- two_column    — title + two columns of bullets
- quote         — large pulled quote with attribution

Auth: OAuth Desktop client credentials live at ~/.config/{{SLUG}}-deck/
(override with ${{SLUG_UPPER}}_DECK_CONFIG_DIR). See SETUP.md for one-time
Google Cloud Console setup.

Installed by the skillsmills build-presentation skill.
"""

from __future__ import annotations

import argparse
import json
import os
import struct
import sys
import time
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

SCOPES = [
    "https://www.googleapis.com/auth/presentations",
    "https://www.googleapis.com/auth/drive.file",
]

CONFIG_DIR = Path(
    os.environ.get("{{SLUG_UPPER}}_DECK_CONFIG_DIR", str(Path.home() / ".config" / "{{SLUG}}-deck"))
)
CREDENTIALS_FILE = CONFIG_DIR / "credentials.json"
TOKEN_FILE = CONFIG_DIR / "token.json"

SLIDE_W_EMU = 9144000
SLIDE_H_EMU = 5143500

PLEX = "IBM Plex Sans"


def authenticate() -> Credentials:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS_FILE.exists():
                sys.exit(
                    f"Missing OAuth client secret at {CREDENTIALS_FILE}. "
                    "See tools/build-presentation/SETUP.md."
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN_FILE.write_text(creds.to_json())
    return creds


def png_dimensions(path: Path) -> tuple[int, int]:
    with open(path, "rb") as f:
        f.seek(16)
        w, h = struct.unpack(">II", f.read(8))
    return w, h


def fit_aspect(image_path: str, box_w: int, box_h: int, box_x: int, box_y: int) -> dict:
    iw, ih = png_dimensions(Path(image_path))
    image_aspect = iw / ih
    box_aspect = box_w / box_h
    if image_aspect > box_aspect:
        w = box_w
        h = int(box_w / image_aspect)
    else:
        h = box_h
        w = int(box_h * image_aspect)
    tx = box_x + (box_w - w) // 2
    ty = box_y + (box_h - h) // 2
    return {"w": w, "h": h, "tx": tx, "ty": ty}


def upload_image(drive, png: Path) -> str:
    metadata = {"name": png.name}
    media = MediaFileUpload(str(png), mimetype="image/png", resumable=False)
    file = drive.files().create(body=metadata, media_body=media, fields="id").execute()
    file_id = file["id"]
    drive.permissions().create(
        fileId=file_id,
        body={"type": "anyone", "role": "reader"},
        fields="id",
    ).execute()
    return f"https://drive.google.com/uc?export=download&id={file_id}"


def text_style(font_size: int, weight: int = 300) -> dict:
    return {
        "fontFamily": PLEX,
        "weightedFontFamily": {"fontFamily": PLEX, "weight": weight},
        "fontSize": {"magnitude": font_size, "unit": "PT"},
        "foregroundColor": {
            "opaqueColor": {"rgbColor": {"red": 0.13, "green": 0.13, "blue": 0.13}}
        },
    }


def make_textbox(slide_id: str, obj_id: str, x: int, y: int, w: int, h: int) -> list[dict]:
    return [
        {
            "createShape": {
                "objectId": obj_id,
                "shapeType": "TEXT_BOX",
                "elementProperties": {
                    "pageObjectId": slide_id,
                    "size": {
                        "width": {"magnitude": w, "unit": "EMU"},
                        "height": {"magnitude": h, "unit": "EMU"},
                    },
                    "transform": {
                        "scaleX": 1, "scaleY": 1,
                        "translateX": x, "translateY": y, "unit": "EMU",
                    },
                },
            }
        }
    ]


def insert_styled_text(obj_id: str, text: str, font_size: int, weight: int = 300) -> list[dict]:
    return [
        {"insertText": {"objectId": obj_id, "text": text}},
        {
            "updateTextStyle": {
                "objectId": obj_id,
                "style": text_style(font_size, weight),
                "textRange": {"type": "ALL"},
                "fields": "fontFamily,weightedFontFamily,fontSize,foregroundColor",
            }
        },
    ]


def insert_bullets(obj_id: str, bullets: list[str], font_size: int = 16) -> list[dict]:
    text = "\n".join(bullets)
    requests: list[dict] = [
        {"insertText": {"objectId": obj_id, "text": text}},
        {
            "updateTextStyle": {
                "objectId": obj_id,
                "style": text_style(font_size, 300),
                "textRange": {"type": "ALL"},
                "fields": "fontFamily,weightedFontFamily,fontSize,foregroundColor",
            }
        },
        {
            "createParagraphBullets": {
                "objectId": obj_id,
                "textRange": {"type": "ALL"},
                "bulletPreset": "BULLET_DISC_CIRCLE_SQUARE",
            }
        },
    ]
    return requests


def add_speaker_notes(slides, pres_id: str, slide_id: str, notes: str) -> None:
    if not notes:
        return
    pres = slides.presentations().get(presentationId=pres_id).execute()
    notes_id = None
    for s in pres["slides"]:
        if s["objectId"] == slide_id:
            notes_id = s["slideProperties"]["notesPage"]["notesProperties"]["speakerNotesObjectId"]
            break
    if not notes_id:
        return
    slides.presentations().batchUpdate(
        presentationId=pres_id,
        body={"requests": [
            {"insertText": {"objectId": notes_id, "text": notes}},
        ]},
    ).execute()


def _build_slide_requests(slide: dict, sid: str, drive) -> tuple[list[dict], dict]:
    typ = slide.get("type", "content")
    requests: list[dict] = [
        {"createSlide": {"objectId": sid, "slideLayoutReference": {"predefinedLayout": "BLANK"}}}
    ]
    img_url = None

    if typ == "title":
        title = slide.get("title", "")
        subtitle = slide.get("subtitle", "")
        tid = sid + "_t"
        requests += make_textbox(sid, tid, 600000, 1700000, SLIDE_W_EMU - 1200000, 800000)
        requests += insert_styled_text(tid, title, 36, 400)
        if subtitle:
            stid = sid + "_s"
            requests += make_textbox(sid, stid, 600000, 2700000, SLIDE_W_EMU - 1200000, 700000)
            requests += insert_styled_text(stid, subtitle, 18, 300)

    elif typ == "section":
        title = slide.get("title", "")
        tid = sid + "_t"
        requests += make_textbox(sid, tid, 600000, (SLIDE_H_EMU - 800000) // 2, SLIDE_W_EMU - 1200000, 800000)
        requests += insert_styled_text(tid, title, 32, 400)

    elif typ == "content":
        title = slide.get("title", "")
        bullets = slide.get("bullets", [])
        tid = sid + "_t"
        requests += make_textbox(sid, tid, 500000, 400000, SLIDE_W_EMU - 1000000, 700000)
        requests += insert_styled_text(tid, title, 24, 500)
        if bullets:
            bid = sid + "_b"
            requests += make_textbox(sid, bid, 500000, 1200000, SLIDE_W_EMU - 1000000, SLIDE_H_EMU - 1500000)
            requests += insert_bullets(bid, bullets, 16)

    elif typ == "content_image":
        title = slide.get("title", "")
        bullets = slide.get("bullets", [])
        image_path = slide.get("image_path")
        tid = sid + "_t"
        requests += make_textbox(sid, tid, 500000, 400000, SLIDE_W_EMU - 1000000, 700000)
        requests += insert_styled_text(tid, title, 24, 500)
        if bullets:
            bid = sid + "_b"
            requests += make_textbox(sid, bid, 500000, 1200000, (SLIDE_W_EMU // 2) - 700000, SLIDE_H_EMU - 1500000)
            requests += insert_bullets(bid, bullets, 14)
        if image_path:
            img_url = upload_image(drive, Path(image_path))
            iid = sid + "_i"
            box_w = (SLIDE_W_EMU // 2) - 200000
            box_h = SLIDE_H_EMU - 1500000
            fit = fit_aspect(image_path, box_w, box_h, (SLIDE_W_EMU // 2) + 100000, 1200000)
            requests.append({
                "createImage": {
                    "objectId": iid,
                    "url": img_url,
                    "elementProperties": {
                        "pageObjectId": sid,
                        "size": {
                            "width": {"magnitude": fit["w"], "unit": "EMU"},
                            "height": {"magnitude": fit["h"], "unit": "EMU"},
                        },
                        "transform": {
                            "scaleX": 1, "scaleY": 1,
                            "translateX": fit["tx"],
                            "translateY": fit["ty"],
                            "unit": "EMU",
                        },
                    },
                }
            })

    elif typ == "image":
        title = slide.get("title", "")
        image_path = slide.get("image_path")
        if title:
            tid = sid + "_t"
            requests += make_textbox(sid, tid, 500000, 200000, SLIDE_W_EMU - 1000000, 600000)
            requests += insert_styled_text(tid, title, 20, 500)
        if image_path:
            img_url = upload_image(drive, Path(image_path))
            iid = sid + "_i"
            top_offset = 900000 if title else 200000
            box_w = SLIDE_W_EMU - 800000
            box_h = SLIDE_H_EMU - top_offset - 300000
            fit = fit_aspect(image_path, box_w, box_h, 400000, top_offset)
            requests.append({
                "createImage": {
                    "objectId": iid,
                    "url": img_url,
                    "elementProperties": {
                        "pageObjectId": sid,
                        "size": {
                            "width": {"magnitude": fit["w"], "unit": "EMU"},
                            "height": {"magnitude": fit["h"], "unit": "EMU"},
                        },
                        "transform": {
                            "scaleX": 1, "scaleY": 1,
                            "translateX": fit["tx"],
                            "translateY": fit["ty"],
                            "unit": "EMU",
                        },
                    },
                }
            })

    elif typ == "two_column":
        title = slide.get("title", "")
        left = slide.get("left", [])
        right = slide.get("right", [])
        left_title = slide.get("left_title", "")
        right_title = slide.get("right_title", "")
        tid = sid + "_t"
        requests += make_textbox(sid, tid, 500000, 400000, SLIDE_W_EMU - 1000000, 700000)
        requests += insert_styled_text(tid, title, 24, 500)
        col_w = (SLIDE_W_EMU // 2) - 700000
        if left_title or left:
            lt = sid + "_lt"
            lb = sid + "_lb"
            if left_title:
                requests += make_textbox(sid, lt, 500000, 1200000, col_w, 500000)
                requests += insert_styled_text(lt, left_title, 16, 500)
            requests += make_textbox(sid, lb, 500000, 1700000 if left_title else 1200000, col_w, SLIDE_H_EMU - 2000000)
            requests += insert_bullets(lb, left, 14)
        if right_title or right:
            rt = sid + "_rt"
            rb = sid + "_rb"
            if right_title:
                requests += make_textbox(sid, rt, (SLIDE_W_EMU // 2) + 100000, 1200000, col_w, 500000)
                requests += insert_styled_text(rt, right_title, 16, 500)
            requests += make_textbox(sid, rb, (SLIDE_W_EMU // 2) + 100000, 1700000 if right_title else 1200000, col_w, SLIDE_H_EMU - 2000000)
            requests += insert_bullets(rb, right, 14)

    elif typ == "quote":
        text = slide.get("text", "")
        attribution = slide.get("attribution", "")
        qid = sid + "_q"
        requests += make_textbox(sid, qid, 800000, 1500000, SLIDE_W_EMU - 1600000, 1500000)
        requests += insert_styled_text(qid, '"' + text + '"', 22, 300)
        if attribution:
            aid = sid + "_a"
            requests += make_textbox(sid, aid, 800000, 3300000, SLIDE_W_EMU - 1600000, 500000)
            requests += insert_styled_text(aid, "— " + attribution, 14, 500)

    return requests, {"image_url": img_url}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("spec", help="Path to JSON file with slide spec (object with 'title' + 'slides' array)")
    parser.add_argument("--title", default=None, help="Override deck title")
    args = parser.parse_args()

    spec = json.loads(Path(args.spec).read_text())
    deck_title = args.title or spec.get("title", f"{{SLUG}} presentation — {time.strftime('%Y-%m-%d')}")
    slides_spec = spec.get("slides", [])
    if not slides_spec:
        sys.exit("Spec has no slides.")

    creds = authenticate()
    slides = build("slides", "v1", credentials=creds, cache_discovery=False)
    drive = build("drive", "v3", credentials=creds, cache_discovery=False)

    print(f"Creating deck: {deck_title}", file=sys.stderr)
    pres = slides.presentations().create(body={"title": deck_title}).execute()
    pres_id = pres["presentationId"]
    first_id = pres["slides"][0]["objectId"]
    slides.presentations().batchUpdate(
        presentationId=pres_id,
        body={"requests": [{"deleteObject": {"objectId": first_id}}]},
    ).execute()

    target_folder_id = spec.get("target_folder_id")
    archive_folder_id = spec.get("archive_folder_id")

    if target_folder_id and archive_folder_id:
        q = (
            f"'{target_folder_id}' in parents "
            f"and mimeType = 'application/vnd.google-apps.presentation' "
            f"and trashed = false"
        )
        existing = drive.files().list(q=q, spaces="drive", fields="files(id, name)").execute()
        for f in existing.get("files", []):
            drive.files().update(
                fileId=f["id"],
                addParents=archive_folder_id,
                removeParents=target_folder_id,
                fields="id,parents",
            ).execute()
            print(f"Archived previous deck: {f['name']}", file=sys.stderr)

    if target_folder_id:
        meta = drive.files().get(fileId=pres_id, fields="parents").execute()
        prev = ",".join(meta.get("parents", []))
        drive.files().update(
            fileId=pres_id,
            addParents=target_folder_id,
            removeParents=prev,
            fields="id,parents",
        ).execute()
        print(f"Moved into folder {target_folder_id}", file=sys.stderr)

    for i, slide in enumerate(slides_spec, 1):
        sid = f"slide{i:03d}"
        print(f"  + slide {i} ({slide.get('type', 'content')}): {slide.get('title', slide.get('text', ''))[:60]}", file=sys.stderr)
        requests, _ = _build_slide_requests(slide, sid, drive)
        slides.presentations().batchUpdate(presentationId=pres_id, body={"requests": requests}).execute()
        if slide.get("speaker_notes"):
            add_speaker_notes(slides, pres_id, sid, slide["speaker_notes"])

    deck_url = f"https://docs.google.com/presentation/d/{pres_id}/edit"
    print(deck_url)


if __name__ == "__main__":
    main()
