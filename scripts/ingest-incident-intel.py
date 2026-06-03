from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "incident-intel"

ENDPOINTS = [
    {
        "id": "cisa-kev",
        "name": "CISA Known Exploited Vulnerabilities",
        "url": "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
        "file": "cisa-kev.json",
    },
    {
        "id": "github-advisories",
        "name": "GitHub Security Advisories",
        "url": "https://api.github.com/advisories?per_page=100",
        "file": "github-advisories.json",
    },
]


def fetch_json(url: str) -> tuple[object, dict[str, str]]:
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "OutsideHub-IncidentIntel-Ingest/1.0",
        },
    )
    with urlopen(request, timeout=40) as response:
        raw = response.read()
        headers = {key.lower(): value for key, value in response.headers.items()}
        return json.loads(raw.decode("utf-8")), headers


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sources": [],
    }

    failures = 0
    for endpoint in ENDPOINTS:
        started = time.time()
        target = OUT_DIR / endpoint["file"]
        source = {
            "id": endpoint["id"],
            "name": endpoint["name"],
            "url": endpoint["url"],
            "file": endpoint["file"],
            "ok": False,
            "count": 0,
            "elapsedMs": 0,
            "error": "",
        }

        try:
            payload, headers = fetch_json(endpoint["url"])
            if endpoint["id"] == "cisa-kev":
                count = len(payload.get("vulnerabilities", [])) if isinstance(payload, dict) else 0
            elif isinstance(payload, list):
                count = len(payload)
            else:
                count = 0

            target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            source.update(
                {
                    "ok": True,
                    "count": count,
                    "etag": headers.get("etag", ""),
                    "lastModified": headers.get("last-modified", ""),
                }
            )
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
            failures += 1
            source["error"] = str(exc)

        source["elapsedMs"] = round((time.time() - started) * 1000)
        manifest["sources"].append(source)

    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 1 if failures == len(ENDPOINTS) else 0


if __name__ == "__main__":
    sys.exit(main())
