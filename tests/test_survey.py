import sqlite3
import json
from app import app, init_db, DB_PATH


def test_survey_submit_and_db():
    # Ensure DB exists
    init_db()
    client = app.test_client()

    # GET survey page
    r = client.get('/survey/thesis_survey')
    assert r.status_code == 200

    # Submit a minimal valid payload
    payload = {
        "species": "Perro",
        "vomiting": "NO",
        "diarrhea": "NO",
        "convulsions": "NO",
        "respiratory_distress": "NO",
        "went_to_vet": "NO",
        "first_aid_given": "NO",
        "respondent_anonymous": "SI",
        "substance_known": "NO",
        "exposure_route": "Oral",
        "outcome": "Desconocido",
        "allow_contact": "NO",
        "consent_data_use": "SI"
    }

    rv = client.post('/submit/thesis_survey', json=payload)
    if rv.status_code != 200:
        print('DEBUG RESPONSE:', rv.status_code, rv.get_json())
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get('status') == 'ok'

    # Verify DB entry exists
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('SELECT COUNT(*) FROM responses WHERE survey_id = ?', ('thesis_survey',))
    cnt = cur.fetchone()[0]
    conn.close()
    assert cnt >= 1
