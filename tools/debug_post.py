from app import app, init_db
init_db()
client = app.test_client()
payload = {
    "species": "Perro",
    "vomiting": "NO",
    "diarrhea": "NO",
    "convulsions": "NO",
    "respiratory_distress": "NO",
    "went_to_vet": "NO",
    "substance_known": "NO",
    "exposure_route": "Oral",
    "outcome": "Desconocido",
    "allow_contact": "NO",
    "consent_data_use": "SI"
}
rv = client.post('/submit/thesis_survey', json=payload)
print('status', rv.status_code)
try:
    print(rv.get_json())
except Exception:
    print(rv.data)
