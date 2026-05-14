# Encuestas de intoxicaciones en pequeños animales

## Inicio rápido para desarrolladores

> Requisitos previos: [Python 3.8+](https://www.python.org/downloads/) y [Node.js LTS](https://nodejs.org/) instalados en el sistema.

```powershell
# 1. Clonar el repositorio
git clone https://github.com/juliansaratsola-dev/intoxicacion_perros_gatos.git
cd intoxicacion_perros_gatos

# 2. Ejecutar el script de setup (instala todo automáticamente)
.\setup.bat
```

El script `setup.bat`:
- Verifica que Python y Node.js estén instalados
- Crea el entorno virtual `.venv` e instala las dependencias Python
- Instala las dependencias del frontend React (`npm install`)
- Crea `config.json` a partir de `config.example.json` si no existe
- Crea las carpetas necesarias (`instance/`, `instance/exports/`)

**Después del setup, correr en dos terminales:**

```powershell
# Terminal 1 — Backend Flask
.venv\Scripts\activate
python app.py
```

```powershell
# Terminal 2 — Frontend React (dev con hot-reload)
cd frontend
npm start
```

| URL | Descripción |
|-----|-------------|
| http://localhost:3000 | UI React (desarrollo) |
| http://127.0.0.1:5000 | API Flask |
| http://127.0.0.1:5000/results/main_encuesta?admin_token=TU_TOKEN | Panel de resultados |

---

## Descarga rápida para estudiantes (sin instalar nada)

Ve a la sección **[Releases](../../releases)** del repositorio en GitHub y descarga `EncuestasVet-Windows.zip` de la última versión.

> No necesitas instalar Python ni ningún programa adicional.

---

## Distribución portátil para Windows (sin instalar Python)

Para distribuir la app a estudiantes que no tienen Python instalado, genera un ejecutable `.exe`:

**Paso 1 — Compilar (solo una vez, en tu máquina):**
```powershell
# Crear entorno virtual e instalar dependencias (si aún no lo hiciste)
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Compilar el ejecutable (tarda ~2-3 min la primera vez)
.\build_exe.bat
```

**Paso 2 — Empaquetar en ZIP para distribuir:**
```powershell
.\package.bat
```
Esto genera `EncuestasVet-Windows.zip`. Distribuye ese ZIP a los estudiantes.

**Paso 3 — Los estudiantes solo necesitan:**
1. Descomprimir el ZIP
2. Editar `config.json` con su `ADMIN_TOKEN`
3. Doble clic en `EncuestasVet.exe` → el navegador se abre solo

> Ver `LEEME.txt` para instrucciones detalladas destinadas a los estudiantes.

**Token de administrador:**  
Edita `config.json` y cambia `"ADMIN_TOKEN"` por un valor propio antes de compilar/distribuir.  
También se puede pasar vía variable de entorno `ADMIN_TOKEN` (tiene prioridad sobre `config.json`).

---


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

# Encuesta de Intoxicaciones en Pequeños Animales

Este proyecto tiene como objetivo desarrollar una aplicación web para la creación y gestión de encuestas sobre intoxicaciones en pequeños animales. A continuación, se describen los pasos para rediseñar la aplicación con un enfoque más moderno y escalable.

## Pasos para el rediseño

### 1. Crear una API RESTful para el backend
- Usar un framework como Flask-RESTful o FastAPI.
- Crear endpoints para manejar encuestas y respuestas:
  - `GET /surveys`: Devuelve una lista de encuestas disponibles.
  - `GET /surveys/<id>`: Devuelve los datos de una encuesta específica en formato JSON.
  - `POST /surveys/<id>/responses`: Recibe y almacena las respuestas de una encuesta.

### 2. Configurar un frontend moderno
- Usar un framework como React, Vue o Angular para crear una interfaz de usuario interactiva.
- Diseñar componentes reutilizables para preguntas, secciones y validaciones.

### 3. Implementar una base de datos escalable
- Usar PostgreSQL o MongoDB para manejar datos más complejos.
- Crear tablas o colecciones para encuestas, preguntas y respuestas.

### 4. Implementar lógica de condicionales
- Mover la lógica de condicionales al backend para mayor control y seguridad.
- Enviar las reglas de condicionales al frontend para aplicarlas dinámicamente.

### 5. Implementar pruebas
- Crear pruebas unitarias y de integración para el backend y el frontend.
- Usar herramientas como `pytest` para el backend y `Jest` o `Cypress` para el frontend.

### 6. Desplegar la aplicación
- Usar contenedores Docker para empaquetar la aplicación.
- Desplegar en un servicio en la nube como AWS, Google Cloud o Heroku.

---

## Paso 1: Crear una API RESTful para el backend

En este paso, configuraremos una API RESTful para manejar las encuestas y las respuestas. Usaremos Flask-RESTful para este propósito.

### Tareas:
1. Instalar Flask-RESTful:
   ```bash
   pip install flask-restful
   ```

2. Crear un archivo `api.py` para definir los endpoints de la API.

3. Implementar los siguientes endpoints:
   - `GET /surveys`
   - `GET /surveys/<id>`
   - `POST /surveys/<id>/responses`

4. Probar los endpoints con herramientas como Postman o cURL.

---

¿Listo para comenzar con el primer paso?
