#!/usr/bin/env python3
"""Export survey responses to CSV from the local SQLite DB.

Usage:
  python scripts/export_csv.py --survey thesis_survey --out out.csv
Options:
  --db PATH         Path to SQLite DB (defaults to instance/survey.db)
  --survey ID       Survey id to export
  --out FILE        Output CSV file (defaults to stdout)
  --anonymize       Remove PII fields (`owner_name`, `contact_email`) from output
  --anonymize-all   Remove PII for all rows regardless of respondent choice
  --pseudonymize SALT  Replace PII with SHA256(salt + value)
"""
import sqlite3
import json
import csv
import argparse
import os
import hashlib
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DB = os.path.join(BASE_DIR, 'instance', 'survey.db')


def sha256(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


def load_responses(db_path, survey_id):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('SELECT response_json FROM responses WHERE survey_id = ?', (survey_id,))
    rows = [json.loads(r[0]) for r in cur.fetchall()]
    conn.close()
    return rows


def export_csv(rows, out_file, anonymize=False, anonymize_all=False, pseudonymize_salt=None):
    if not rows:
        print('No rows to export', file=sys.stderr)
        return
    # determine all fields
    fields = set()
    for r in rows:
        fields.update(r.keys())
    fields = list(sorted(fields))

    writer = csv.DictWriter(out_file, fieldnames=fields)
    writer.writeheader()
    for r in rows:
        row = dict(r)
        if anonymize_all or (anonymize and row.get('respondent_anonymous','').upper() == 'SI'):
            row.pop('owner_name', None)
            row.pop('contact_email', None)
            row['allow_contact'] = 'NO'
        elif pseudonymize_salt:
            if 'owner_name' in row and row.get('owner_name'):
                row['owner_name'] = sha256(pseudonymize_salt + row['owner_name'])
            if 'contact_email' in row and row.get('contact_email'):
                row['contact_email'] = sha256(pseudonymize_salt + row['contact_email'])
        writer.writerow(row)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--db', default=DEFAULT_DB)
    p.add_argument('--survey', required=True)
    p.add_argument('--out', default='-')
    p.add_argument('--anonymize', action='store_true')
    p.add_argument('--anonymize-all', action='store_true')
    p.add_argument('--pseudonymize', help='salt string to pseudonymize PII')
    args = p.parse_args()

    rows = load_responses(args.db, args.survey)

    out_f = sys.stdout
    if args.out != '-':
        out_f = open(args.out, 'w', newline='', encoding='utf-8')
    export_csv(rows, out_f, anonymize=args.anonymize, anonymize_all=args.anonymize_all, pseudonymize_salt=args.pseudonymize)
    if args.out != '-':
        out_f.close()


if __name__ == '__main__':
    main()
