#!/usr/bin/env python3
"""Helpers to anonymize or pseudonymize existing DB rows in-place or produce an anonymized export.

WARNING: in-place anonymization is destructive. Always backup DB before running in-place operations.

Usage examples:
  # export anonymized CSV for survey
  python scripts/anonimize_export.py --survey thesis_survey --export-csv out.csv --anonymize

  # pseudonymize PII and export
  python scripts/anonimize_export.py --survey thesis_survey --export-csv out.csv --pseudonymize-salt mysalt

  # destructive in-place anonymization (removes PII fields)
  python scripts/anonimize_export.py --survey thesis_survey --inplace-anonymize --confirm
"""
import sqlite3
import json
import argparse
import os
import hashlib
import csv
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'instance', 'survey.db')


def sha256(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


def load_rows(survey_id, db_path=DB_PATH):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('SELECT id, response_json FROM responses WHERE survey_id = ?', (survey_id,))
    rows = [(r[0], json.loads(r[1])) for r in cur.fetchall()]
    conn.close()
    return rows


def export_csv(rows, out_path, anonymize=False, pseudonymize_salt=None, anonymize_all=False):
    if not rows:
        print('No rows', file=sys.stderr); return
    fields = set()
    for _, r in rows:
        fields.update(r.keys())
    fields = list(sorted(fields))
    with open(out_path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for _, r in rows:
            row = dict(r)
            if anonymize_all or (anonymize and row.get('respondent_anonymous','').upper() == 'SI'):
                row.pop('owner_name', None); row.pop('contact_email', None); row['allow_contact'] = 'NO'
            elif pseudonymize_salt:
                if row.get('owner_name'): row['owner_name'] = sha256(pseudonymize_salt + row['owner_name'])
                if row.get('contact_email'): row['contact_email'] = sha256(pseudonymize_salt + row['contact_email'])
            w.writerow(row)


def inplace_anonymize(rows, db_path=DB_PATH):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    for rid, r in rows:
        if str(r.get('respondent_anonymous','')).upper() == 'SI':
            r.pop('owner_name', None); r.pop('contact_email', None); r['allow_contact'] = 'NO'
            cur.execute('UPDATE responses SET response_json = ? WHERE id = ?', (json.dumps(r, ensure_ascii=False), rid))
    conn.commit(); conn.close()


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--db', default=DB_PATH)
    p.add_argument('--survey', required=True)
    p.add_argument('--export-csv')
    p.add_argument('--anonymize', action='store_true')
    p.add_argument('--anonymize-all', action='store_true')
    p.add_argument('--pseudonymize-salt')
    p.add_argument('--inplace-anonymize', action='store_true')
    p.add_argument('--confirm', action='store_true', help='Confirm destructive inplace anonymization')
    args = p.parse_args()

    rows = load_rows(args.survey, db_path=args.db)
    if args.export_csv:
        export_csv(rows, args.export_csv, anonymize=args.anonymize, pseudonymize_salt=args.pseudonymize_salt, anonymize_all=args.anonymize_all)
        print('Exported to', args.export_csv)

    if args.inplace_anonymize:
        if not args.confirm:
            print('Destructive operation: pass --confirm to proceed', file=sys.stderr); sys.exit(1)
        inplace_anonymize(rows, db_path=args.db)
        print('In-place anonymization completed')


if __name__ == '__main__':
    main()
