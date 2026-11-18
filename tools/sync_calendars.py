#!/usr/bin/env python3
"""Sync booked dates from Airbnb calendar (iCal) links into data/availability.json.

Only the booked date ranges are kept. Guest details in Airbnb's files (reservation
links, phone digits) are never written anywhere, and the private calendar links are
never committed.

Where the links come from (first one found):
  1. CALENDAR_URLS environment variable (JSON: {"property-id": "https://...ics?t=..."})
     -> used by the GitHub Action, stored as a repository secret
  2. .calendars.json in the repository root (git-ignored), for running by hand

Run:  python3 tools/sync_calendars.py
"""
import datetime as dt
import json
import os
import re
import sys
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "availability.json"


def load_links():
    raw = os.environ.get("CALENDAR_URLS")
    if raw:
        return json.loads(raw)
    local = ROOT / ".calendars.json"
    if local.exists():
        return json.loads(local.read_text())
    sys.exit("No calendar links: set CALENDAR_URLS or create .calendars.json")


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (calendar sync)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def parse_date(value):
    value = value.strip()[:8]
    return dt.date(int(value[:4]), int(value[4:6]), int(value[6:8]))


def booked_ranges(ics):
    """Return [[start, end), ...] night ranges from VEVENT DTSTART/DTEND (end is the checkout day)."""
    text = re.sub(r"\r?\n[ \t]", "", ics)  # unfold folded lines
    ranges = []
    for block in re.findall(r"BEGIN:VEVENT(.*?)END:VEVENT", text, re.S):
        s = re.search(r"^DTSTART[^:]*:(\d{8})", block, re.M)
        e = re.search(r"^DTEND[^:]*:(\d{8})", block, re.M)
        if not s:
            continue
        start = parse_date(s.group(1))
        end = parse_date(e.group(1)) if e else start + dt.timedelta(days=1)
        if end > start:
            ranges.append([start, end])
    return ranges


def merge(ranges, today):
    ranges = sorted([r for r in ranges if r[1] > today])
    merged = []
    for s, e in ranges:
        if merged and s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return [[s.isoformat(), e.isoformat()] for s, e in merged]


def main():
    links = load_links()
    today = dt.datetime.now(ZoneInfo("America/Denver")).date()  # the homes are in Denver
    previous = json.loads(OUT.read_text()) if OUT.exists() else {"properties": {}}
    result = {"source": "Airbnb calendar", "updated": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(), "properties": {}}
    failures = []
    for pid, url in links.items():
        try:
            result["properties"][pid] = merge(booked_ranges(fetch(url)), today)
            print(f"{pid}: {len(result['properties'][pid])} booked range(s)")
        except Exception as exc:  # keep the last good data rather than showing a home as free
            failures.append(pid)
            result["properties"][pid] = previous.get("properties", {}).get(pid, [])
            print(f"{pid}: FAILED ({exc.__class__.__name__}); kept previous dates", file=sys.stderr)
    if previous.get("properties") == result["properties"]:
        print("No change in booked dates.")
        return 1 if failures else 0
    OUT.write_text(json.dumps(result, indent=2) + "\n")
    print(f"Wrote {OUT.relative_to(ROOT)}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
