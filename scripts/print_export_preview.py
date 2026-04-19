#!/usr/bin/env python3
import sqlite3, json, csv, os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'instance', 'survey.db')
OUT = os.path.join(BASE_DIR, 'exports', 'preview.txt')
os.makedirs(os.path.join(BASE_DIR, 'exports'), exist_ok=True)
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()
cur.execute('SELECT response_json FROM responses WHERE survey_id = ?', ('thesis_survey',))
rows = [json.loads(r[0]) for r in cur.fetchall()]
conn.close()
if not rows:
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('NO ROWS')
    exit(0)

fields = set()
for r in rows:
    fields.update(r.keys())
fields = list(sorted(fields))

with open(OUT, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    count = 0
    for r in rows:
        if str(r.get('respondent_anonymous','')).upper() == 'SI':
            r.pop('owner_name', None); r.pop('contact_email', None); r['allow_contact']='NO'
        writer.writerow(r)
        count += 1
        if count >= 10:
            break

print('wrote preview to', OUT)
