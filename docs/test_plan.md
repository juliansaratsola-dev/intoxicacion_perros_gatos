# Plan de pruebas con datos reales

Objetivo
- Verificar que la encuesta valida, almacena y anonimiza respuestas reales; validar exportaciones CSV y scripts de anonimización.

Requisitos
- Copia local del repositorio.
- Python 3.8+ y dependencias (`pip install -r requirements.txt`).

Datasets
- `data/sample_real_data.csv` — ejemplo con columnas que coinciden con los `name` de la encuesta.
- Si tienes datos en Excel, exporta a CSV con encabezados que sean los `name` del JSON de la encuesta.

Pasos de prueba (modo local, recommended)
1. Arrancar la app localmente:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

2. Importar respuestas vía script (envía POST a `/submit/<survey>`):

```powershell
python scripts/import_responses.py --survey thesis_survey --file data/sample_real_data.csv
```

3. Verificar que las respuestas se insertaron: abrir `http://127.0.0.1:5000/results/thesis_survey?admin_token=<tu_token>` y comprobar.

4. Descargar exportación CSV anónima desde UI o con curl:

```powershell
curl -H "X-Admin-Token: <tu_token>" "http://127.0.0.1:5000/results/thesis_survey/export?anonymize=1" -o out.csv
```

5. Probar `scripts/export_csv.py` y `scripts/anonimize_export.py` para export y operaciones destructivas (usar backup).

Casos de prueba sugeridos
- Fila con `respondent_anonymous=SI` → PII debe eliminarse antes de almacenar.
- Fila con `contact_email` inválido → rechazo del formulario.
- Valores numéricos inválidos (peso/edad) → rechazo del formulario.
- Prueba de `pseudonymize` en exportación → PII reemplazada por hash.

Criterios de aceptación
- Todos los registros válidos se almacenan correctamente.
- Registros inválidos son rechazados con errores claros.
- Exportaciones respetan anonimato/pseudonimización.

Notas
- Para pruebas masivas, ejecuta el script en modo no destructivo (envía POSTs) para validar la lógica de servidor.
- Haz backup del `instance/survey.db` antes de cualquier `--inplace-anonymize`.
