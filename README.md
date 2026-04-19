# Encuestas (demo local)

Proyecto mínimo para ejecutar encuestas localmente (desktop-first). Cada encuesta se define como JSON en la carpeta `surveys/`.

Requisitos:
- Python 3.8+

Instalación y ejecución:

```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
python app.py
```

Abrir en el navegador: http://127.0.0.1:5000

Cómo añadir tu encuesta:
- Copia un JSON con la estructura en `surveys/<id>.json` (ver `surveys/sample_survey.json`).
- Usa la propiedad `showIf` en una pregunta para que dependa de respuestas anteriores. Si la condición no se cumple, la pregunta se colapsa.

Autenticación para resultados (administrador):
- Para proteger las rutas de resultados, la app usa un token admin (`X-Admin-Token` en el header o `?admin_token=` en la URL).
- Defina la variable de entorno `ADMIN_TOKEN` antes de ejecutar la app. Por ejemplo (Windows PowerShell):

```powershell
$env:ADMIN_TOKEN = 'mi_token_secreto'
python app.py
```

Luego, para ver resultados use el header `X-Admin-Token: mi_token_secreto`, o añada `?admin_token=mi_token_secreto` a la URL `http://.../results/<survey_id>`.

Anonimato y exportación CSV:
- La encuesta pregunta explícitamente `¿Desea permanecer anónimo?`.
- Si el encuestado elige `SI`, los campos identificables (`owner_name`, `contact_email`) se eliminan antes de almacenarse.
- La exportación disponible en `/results/<id>/export` descarga un CSV con las respuestas tal como están en la base (las respuestas anónimas no contendrán PII).
- La exportación disponible en `/results/<id>/export` descarga un CSV con las respuestas tal como están en la base (las respuestas anónimas no contendrán PII).

HTTP export endpoint:
- También puedes descargar un CSV vía HTTP desde la app usando el token admin en el header `X-Admin-Token` o `?admin_token=` en la URL.
- Endpoint: `/results/<survey_id>/export`.
- Parámetros aceptados: `?anonymize=1` (resp. que eligieron anonimato serán limpiados), `?anonymize_all=1` (limpia todas las filas), `?pseudonymize=mysalt` (hash de PII con salt).

Ejemplo:

```powershell
# Descarga CSV anónimo (resp. que eligieron anonimato serán limpiados)
curl -H "X-Admin-Token: mi_token" "http://127.0.0.1:5000/results/thesis_survey/export?anonymize=1" -o respuestas.csv
```
