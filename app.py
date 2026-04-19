from flask import Flask, render_template, request, jsonify, redirect, url_for, send_file
from flask_cors import CORS
import sqlite3
import json
import re
import os
import csv
import io
from datetime import datetime
from functools import wraps

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SURVEYS_DIR = os.path.join(BASE_DIR, 'surveys')
DB_PATH = os.path.join(BASE_DIR, 'instance', 'survey.db')

app = Flask(__name__)
CORS(app)

# Admin token for protecting results/endpoints. Set via env var `ADMIN_TOKEN`.
ADMIN_TOKEN = os.environ.get('ADMIN_TOKEN', 'changeme')

def require_admin(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        token = request.headers.get('X-Admin-Token') or request.args.get('admin_token')
        if token != ADMIN_TOKEN:
            return jsonify({'status': 'error', 'errors': ['Unauthorized']}), 401
        return f(*args, **kwargs)
    return wrapped

def init_db():
    os.makedirs(os.path.join(BASE_DIR, 'instance'), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            survey_id TEXT,
            response_json TEXT,
            submitted_at TEXT
        )
    ''')
    conn.commit()
    conn.close()

def load_survey(sid):
    path = os.path.join(SURVEYS_DIR, f"{sid}.json")
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

@app.route('/')
def index():
    surveys = []
    if os.path.exists(SURVEYS_DIR):
        for fn in os.listdir(SURVEYS_DIR):
            if fn.endswith('.json'):
                sid = fn[:-5]
                with open(os.path.join(SURVEYS_DIR, fn), 'r', encoding='utf-8') as f:
                    meta = json.load(f)
                surveys.append({'id': sid, 'title': meta.get('title', sid)})
    return render_template('index.html', surveys=surveys)

@app.route('/survey/<sid>')
def survey_view(sid):
    survey = load_survey(sid)
    if survey is None:
        return 'Encuesta no encontrada', 404

    description = (
        "Encuesta de intoxicaciones en Pequeños Animales\n"
        "Objetivos\n"
        "Mediante la presente encuesta se pretende recabar información sobre las principales\n"
        "intoxicaciones observadas en pequeños animales atendidos en clínicas veterinarias del\n"
        "Uruguay. La información proporcionada deberá corresponder a casos registrados en el periodo\n"
        "comprendido entre junio de 2025 y la actualidad.\n"
        "Los datos obtenidos serán utilizados en el marco de un proyecto de investigación CIDEC y de\n"
        "una tesis de grado de la Facultad de Veterinaria (UdelaR). A partir de los resultados relevados,\n"
        "se busca contribuir a la puesta a punto en el Laboratorio de Toxicología en dicha institución,\n"
        "de técnicas analíticas que permitan mejorar el diagnóstico de las intoxicaciones mencionadas.\n"
        "La encuesta está organizada en tres bloques: datos generales, principales tóxicos en\n"
        "veterinaria y consideraciones finales. Las preguntas referidas a los principales tóxicos se\n"
        "agrupan en las siguientes categorías: pesticidas, medicamentos de uso veterinario,\n"
        "medicamentos de uso humano, plantas y miscelanea.\n"
        "Completar esta encuesta le llevará solo unos minutos. Toda información proporcionada es\n"
        "estrictamente confidencial y se utilizará exclusivamente con fines académicos y de\n"
        "investigación."
    )

    return render_template('survey.html', survey=survey, sid=sid, description=description)

@app.route('/submit/<sid>', methods=['POST'])
def submit(sid):
    payload = request.get_json() or request.form.to_dict(flat=False)
    # normalize form-encoded data
    if isinstance(payload, dict) and all(isinstance(v, list) and len(v) == 1 for v in payload.values()):
        data = {k: v[0] for k, v in payload.items()}
    else:
        data = payload

    survey = load_survey(sid)
    if survey is None:
        return jsonify({'status': 'error', 'errors': ['Encuesta no encontrada']}), 404

    # helper to evaluate showIf conditions based on submitted data
    def eval_showif(cond):
        if not isinstance(cond, dict):
            return False
        for key, val in cond.items():
            v = data.get(key)
            if isinstance(v, list):
                if val not in v:
                    return False
            else:
                if v is None or str(v) != str(val):
                    return False
        return True

    errors = []
    # basic validations: required fields (respectando showIf), option validity, simple types
    numeric_fields = {'age_years', 'weight_kg', 'time_since_exposure_hours'}
    email_field = 'contact_email'

    for q in survey.get('questions', []):
        name = q.get('name')
        # skip validation if hidden by showIf
        showif = q.get('showIf')
        visible = True
        if showif:
            visible = eval_showif(showif)
        if not visible:
            continue

        if q.get('required'):
            val = data.get(name)
            if val is None or (isinstance(val, str) and val.strip() == ''):
                errors.append(f'El campo "{name}" es obligatorio')
                continue

        # validate option types
        if q.get('type') in ('radio', 'select') and name in data:
            opt = data.get(name)
            if opt not in q.get('options', []):
                errors.append(f'Valor inválido para "{name}"')

        # validation rules from survey JSON
        v = q.get('validation') or {}
        if v:
            # type:number
            if v.get('type') == 'number' and name in data and data.get(name) not in (None, ''):
                try:
                    valnum = float(str(data.get(name)).replace(',', '.'))
                    if v.get('min') is not None and valnum < float(v.get('min')):
                        errors.append(f'El campo "{name}" es menor que el mínimo {v.get("min")}')
                    if v.get('max') is not None and valnum > float(v.get('max')):
                        errors.append(f'El campo "{name}" es mayor que el máximo {v.get("max")}')
                except Exception:
                    errors.append(f'El campo "{name}" debe ser numérico')

            # pattern
            if v.get('pattern') and name in data and data.get(name):
                try:
                    if not re.match(v.get('pattern'), str(data.get(name))):
                        errors.append(f'El campo "{name}" no cumple el patrón requerido')
                except re.error:
                    pass

            # min/max length
            if v.get('minLength') and name in data and data.get(name):
                if len(str(data.get(name))) < int(v.get('minLength')):
                    errors.append(f'El campo "{name}" debe tener al menos {v.get("minLength")} caracteres')
            if v.get('maxLength') and name in data and data.get(name):
                if len(str(data.get(name))) > int(v.get('maxLength')):
                    errors.append(f'El campo "{name}" debe tener como máximo {v.get("maxLength")} caracteres')

        # fallback checks (kept for backward compatibility)
        if name in numeric_fields and name in data and data.get(name) not in (None, '') and not v.get('type'):
            try:
                float(str(data.get(name)).replace(',', '.'))
            except Exception:
                errors.append(f'El campo "{name}" debe ser numérico')

        # email check (if no pattern provided)
        if name == email_field and data.get(name) and not (v and v.get('pattern')):
            email = data.get(name)
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", str(email)):
                errors.append('Correo electrónico inválido')

    if errors:
        return jsonify({'status': 'error', 'errors': errors}), 400

    # Respect respondent anonymity choice: if respondent selected anonymous, remove PII before storing
    try:
        if str(data.get('respondent_anonymous', '')).upper() == 'SI':
            data.pop('owner_name', None)
            data.pop('contact_email', None)
            # Also ensure allow_contact is set to NO for safety
            data['allow_contact'] = 'NO'
    except Exception:
        pass

    init_db()
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('INSERT INTO responses (survey_id, response_json, submitted_at) VALUES (?, ?, ?)',
                (sid, json.dumps(data, ensure_ascii=False), datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'})

@app.route('/results/<sid>')
@require_admin
def results(sid):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('SELECT id, response_json, submitted_at FROM responses WHERE survey_id = ? ORDER BY id DESC', (sid,))
    rows = cur.fetchall()
    conn.close()
    responses = [{'id': r[0], 'response': json.loads(r[1]), 'submitted_at': r[2]} for r in rows]
    survey = load_survey(sid)
    return render_template('results.html', sid=sid, responses=responses, survey=survey)

@app.route('/results/<sid>/export')
@require_admin
def export_csv(sid):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('SELECT response_json FROM responses WHERE survey_id = ?', (sid,))
    rows = cur.fetchall()
    conn.close()
    if not rows:
        return 'No responses', 404
    # options via query params: ?anonymize=1, ?anonymize_all=1, ?pseudonymize=mysalt
    anonymize = request.args.get('anonymize') in ('1', 'true', 'yes')
    anonymize_all = request.args.get('anonymize_all') in ('1', 'true', 'yes')
    pseudonymize = request.args.get('pseudonymize')

    # collect all responses as dicts
    resp_list = [json.loads(r[0]) for r in rows]
    # determine union of fieldnames
    fieldnames = set()
    for resp in resp_list:
        fieldnames.update(resp.keys())
    fieldnames = list(sorted(fieldnames))

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    def sha256(s):
        return hashlib.sha256(s.encode('utf-8')).hexdigest()

    for resp in resp_list:
        row = dict(resp)
        if anonymize_all or (anonymize and str(row.get('respondent_anonymous','')).upper() == 'SI'):
            row.pop('owner_name', None)
            row.pop('contact_email', None)
            row['allow_contact'] = 'NO'
        elif pseudonymize:
            if 'owner_name' in row and row.get('owner_name'):
                row['owner_name'] = sha256(pseudonymize + str(row['owner_name']))
            if 'contact_email' in row and row.get('contact_email'):
                row['contact_email'] = sha256(pseudonymize + str(row['contact_email']))
        writer.writerow(row)

    output.seek(0)
    return send_file(io.BytesIO(output.getvalue().encode('utf-8')), mimetype='text/csv', as_attachment=True,
                     attachment_filename=f'{sid}_responses.csv')

@app.route('/load_structured_survey', methods=['GET'])
def load_structured_survey():
    structured_survey_path = os.path.join(SURVEYS_DIR, 'structured_survey.json')
    if not os.path.exists(structured_survey_path):
        return jsonify({'status': 'error', 'message': 'Structured survey not found'}), 404

    with open(structured_survey_path, 'r', encoding='utf-8') as f:
        structured_survey = json.load(f)

    return jsonify({'status': 'success', 'survey': structured_survey})

if __name__ == '__main__':
    os.makedirs(SURVEYS_DIR, exist_ok=True)
    init_db()
    app.run(debug=True)
