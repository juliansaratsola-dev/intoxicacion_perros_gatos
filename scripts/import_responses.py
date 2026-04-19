#!/usr/bin/env python3
"""Import responses from CSV or JSON to the survey app.

Modes:
- Local (default): imports using Flask test client (no server needed).
- HTTP: if `--http` is provided, POSTs to running server URL (requires `requests`).

Usage:
  python scripts/import_responses.py --survey thesis_survey --file data/sample_real_data.csv
  python scripts/import_responses.py --survey thesis_survey --file data/sample_real_data.csv --http --url http://127.0.0.1:5000

CSV columns should match question `name` fields in the survey JSON.
"""
import argparse
import csv
import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DB = os.path.join(BASE_DIR, 'instance', 'survey.db')


def read_csv(path):
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return [dict(r) for r in reader]


def read_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def post_local(survey_id, rows):
    # Import using Flask test_client so submissions go through validation
    sys.path.insert(0, BASE_DIR)
    from app import app
    client = app.test_client()
    success = 0
    failed = []
    for i, r in enumerate(rows, start=1):
        rv = client.post(f'/submit/{survey_id}', json=r)
        if rv.status_code == 200:
            success += 1
        else:
            try:
                failed.append((i, rv.status_code, rv.get_json()))
            except Exception:
                failed.append((i, rv.status_code, rv.data))
    return success, failed


def post_http(survey_id, rows, url):
    import requests
    success = 0
    failed = []
    for i, r in enumerate(rows, start=1):
        rv = requests.post(f'{url.rstrip("/")}/submit/{survey_id}', json=r)
        if rv.status_code == 200:
            success += 1
        else:
            try:
                failed.append((i, rv.status_code, rv.json()))
            except Exception:
                failed.append((i, rv.status_code, rv.text))
    return success, failed


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--survey', required=True)
    p.add_argument('--file', required=True)
    p.add_argument('--http', action='store_true', help='POST to running server instead of local test client')
    p.add_argument('--url', help='Server base URL for HTTP mode (e.g. http://127.0.0.1:5000)')
    args = p.parse_args()

    path = args.file
    if path.lower().endswith('.csv'):
        rows = read_csv(path)
    else:
        rows = read_json(path)

    print(f'Loaded {len(rows)} rows from {path}')

    if args.http:
        if not args.url:
            print('HTTP mode requires --url', file=sys.stderr); sys.exit(1)
        s, f = post_http(args.survey, rows, args.url)
    else:
        s, f = post_local(args.survey, rows)

    print(f'Success: {s}, Failed: {len(f)}')
    if f:
        print('Failures details:')
        for item in f:
            print(item)


if __name__ == '__main__':
    main()
