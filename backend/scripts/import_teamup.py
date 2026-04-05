#!/usr/bin/env python3
"""
Import events from TeamUp iCal export or CSV into the RunnerEvents database.
Usage: python import_teamup.py <file.ics> [--api-url http://localhost:3001]
"""

import argparse
import json
import re
import sys
from datetime import datetime
import requests

# Try to import icalendar, if not available use basic parsing
try:
    from icalendar import Calendar
    HAS_ICAL = True
except ImportError:
    HAS_ICAL = False


def parse_ics_basic(content):
    """Basic ICS parser without icalendar library."""
    events = []
    lines = content.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    current_event = None

    for line in lines:
        if line == "BEGIN:VEVENT":
            current_event = {}
        elif line == "END:VEVENT" and current_event:
            events.append(current_event)
            current_event = None
        elif current_event:
            if line.startswith("SUMMARY:"):
                current_event["summary"] = line[8:]
            elif line.startswith("DESCRIPTION:"):
                current_event["description"] = line[12:]
            elif line.startswith("LOCATION:"):
                current_event["location"] = line[9:]
            elif line.startswith("DTSTART:"):
                current_event["dtstart"] = line[8:]
            elif line.startswith("DTEND:"):
                current_event["dtend"] = line[6:]
            elif line.startswith("CATEGORIES:"):
                current_event["categories"] = line[11:]

    return events


def parse_ics(content):
    if HAS_ICAL:
        cal = Calendar.from_ical(content)
        events = []
        for comp in cal.walk():
            if comp.name == "VEVENT":
                events.append({
                    "summary": str(comp.get("SUMMARY", "")),
                    "description": str(comp.get("DESCRIPTION", "")),
                    "location": str(comp.get("LOCATION", "")),
                    "dtstart": str(comp.get("DTSTART", "")),
                    "dtend": str(comp.get("DTEND", "")),
                })
        return events
    else:
        return parse_ics_basic(content)


def map_event(ics_event):
    """Map ICS event to our API format."""
    summary = ics_event.get("summary", "Evento")
    description = ics_event.get("description", "")
    location = ics_event.get("location", "")
    dtstart = ics_event.get("dtstart", "")
    dtend = ics_event.get("dtend", "")

    # Parse datetime
    def clean_dt(dt_str):
        if not dt_str or "T" not in dt_str:
            return None
        dt_str = dt_str.replace("Z", "")
        try:
            return datetime.strptime(dt_str, "%Y%m%dT%H%M%S").isoformat()
        except:
            try:
                return datetime.strptime(dt_str[:8], "%Y%m%d").isoformat()
            except:
                return dt_str

    date = clean_dt(dtstart)
    end_date = clean_dt(dtend)

    # Determine type from summary/categories
    summary_lower = summary.lower()
    if "trail" in summary_lower or "trilho" in summary_lower:
        event_type = "trail"
    elif "prova" in summary_lower or "corrida" in summary_lower or "race" in summary_lower:
        event_type = "race"
    elif "treino" in summary_lower or "training" in summary_lower:
        event_type = "training"
    elif "reuni" in summary_lower or "meeting" in summary_lower:
        event_type = "meeting"
    elif "social" in summary_lower or "jantar" in summary_lower:
        event_type = "social"
    else:
        event_type = "urban"

    return {
        "title": summary,
        "description": description,
        "date": date,
        "endDate": end_date,
        "location": location,
        "type": event_type,
        "club": "Alverca Urban Runners",
    }


def import_events(ics_file, api_url):
    with open(ics_file, "r", encoding="utf-8") as f:
        content = f.read()

    events = parse_ics(content)
    print(f"Found {len(events)} events in ICS file")

    imported = 0
    errors = 0
    for ev in events:
        try:
            data = map_event(ev)
            print(f"Importing: {data['title']} ({data['date']})")
            res = requests.post(f"{api_url}/api/events", json=data, timeout=10)
            if res.status_code in (200, 201):
                imported += 1
                print(f"  ✅ OK")
            else:
                errors += 1
                print(f"  ❌ {res.status_code}: {res.text[:200]}")
        except Exception as e:
            errors += 1
            print(f"  ❌ Error: {e}")

    print(f"\nDone! Imported: {imported}, Errors: {errors}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import TeamUp ICS events")
    parser.add_argument("ics_file", help="Path to .ics file")
    parser.add_argument("--api-url", default="http://localhost:3001", help="Backend API URL")
    args = parser.parse_args()

    import_events(args.ics_file, args.api_url)
