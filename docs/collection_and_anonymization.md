# Recolección de datos y anonimización — Guía rápida

1) Consentimiento y ética
- Incluye en la página de la encuesta un pequeño aviso sobre el uso de datos y la finalidad de la tesis.
- Pregunta explícita: `¿Desea permanecer anónimo?` — si el encuestado selecciona `SI`, el sistema eliminará nombre y correo.

2) Formato y retención
- Guardamos respuestas en SQLite (`instance/survey.db`).
- Exportaciones deben guardarse en archivos CSV para análisis posterior.

3) Buenas prácticas para la recolección
- No pedir información innecesaria. Mantén PII al mínimo.
- Si pides emails para seguimiento, hazlo opcional y explícito.

4) Scripts disponibles
- `scripts/export_csv.py`: exporta respuestas a CSV desde la base de datos. Opciones:
  - `--anonymize`: elimina PII para filas donde el encuestado ya eligió anonimato
  - `--anonymize-all`: elimina PII para todas las filas
  - `--pseudonymize SALT`: reemplaza PII con hash SHA256(salt+value)

- `scripts/anonimize_export.py`: exporta CSV y permite `--inplace-anonymize` (destructivo) para eliminar PII en la base de datos. Requiere `--confirm`.

5) Ejemplos rápidos

Exportar CSV anónimo (resp. que eligieron anonimato serán limpios):

```powershell
python scripts/export_csv.py --survey thesis_survey --out respuestas.csv --anonymize
```

Pseudonimizar emails y nombres durante exportación:

```powershell
python scripts/export_csv.py --survey thesis_survey --out pseud.csv --pseudonymize mi_salt
```

Anonymizar la base de datos en sitio (destructivo — hacer backup):

```powershell
copy instance\survey.db instance\survey.db.bak
python scripts/anonimize_export.py --survey thesis_survey --inplace-anonymize --confirm
```

6) Seguridad
- Mantén el archivo de base de datos y los backups en almacenamiento seguro.
- No compartas exportaciones con PII sin consentimiento.
