# EduRAG-DAM — Cheatsheet

---

## REQUISITOS PREVIOS

Antes de hacer nada, necesitas tener instalado:

- **Python 3.12+** → https://www.python.org/downloads/
- **Node.js 18+** → https://nodejs.org/
- Una **API Key de Gemini** (Google AI Studio, free tier)

---

## 1. INSTALACIÓN (solo la primera vez)

### 1.1 Clonar el repositorio

```powershell
git clone <url-del-repo>
Set-Location EduRAG-DAM
```

### 1.2 Crear el entorno virtual de Python

Crea un entorno aislado para que las dependencias no afecten al resto del sistema.

```powershell
Set-Location backend
python -m venv .venv
```

### 1.3 Activar el entorno virtual

Activa el entorno para que los comandos `pip` y `python` usen el venv local.

```powershell
.\.venv\Scripts\Activate.ps1
```

> Si PowerShell bloquea la ejecución de scripts, ejecuta primero:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### 1.4 Instalar las dependencias de Python

Instala todas las librerías necesarias (FastAPI, ChromaDB, Gemini SDK, etc.).

```powershell
pip install -r requirements.txt
```

### 1.5 Crear el archivo de configuración

Crea el archivo `.env` dentro de `backend/` con tu API Key de Gemini. Sin este archivo el backend no arranca.

```powershell
# Crea el archivo backend/.env con este contenido:
GEMINI_API_KEY=tu_api_key_aqui
CORPUS_ID=edurag_apuntes
APP_PORT=8000
APP_HOST=0.0.0.0
LOG_LEVEL=info
```

### 1.6 Instalar las dependencias del frontend

Instala los paquetes de Node.js (React, Vite, Tailwind, etc.).

```powershell
Set-Location ..\frontend
npm install
```

---

## 2. ARRANCAR LA APLICACIÓN

Necesitas **dos terminales abiertas** al mismo tiempo: una para el backend y otra para el frontend.

### Terminal 1 — Backend (API FastAPI)

Arranca el servidor Python que expone la API de chat en `http://localhost:8000`.

```powershell
$python = "c:\Users\daceh\DAM2\TFG\EduRAG-DAM\backend\.venv\Scripts\python.exe"
Set-Location "c:\Users\daceh\DAM2\TFG\EduRAG-DAM\backend"
& $python -m uvicorn app.main:app --reload --port 8000
```

El flag `--reload` hace que el servidor se reinicie automáticamente al guardar cambios en el código.

### Terminal 2 — Frontend (React + Vite)

Arranca el servidor de desarrollo del frontend en `http://localhost:5173`.

```powershell
Set-Location "c:\Users\daceh\DAM2\TFG\EduRAG-DAM\frontend"
npm run dev
```

### Verificar que todo funciona

- Frontend: abre http://localhost:5173 en el navegador
- Backend (health check): abre http://localhost:8000 — debe devolver `{"status":"ok"}`

---

## 3. AÑADIR NUEVOS PDFs

### 3.1 Copiar el PDF a la carpeta de datos

Los PDFs tienen que estar en `docs/dataset/`. El script los detecta automáticamente por extensión `.pdf` o `.PDF`.

```
EduRAG-DAM/
└── docs/
    └── dataset/
        ├── UD1_PSP_Procesos.pdf          ← ya indexado
        ├── UD2_PSP_Hilos.pdf             ← ya indexado
        ├── UD3_Programacion_en_red.pdf   ← ya indexado
        └── tu_nuevo_documento.pdf        ← copia aquí el nuevo
```

### 3.2 Ejecutar el script de indexado

Extrae el texto del PDF, lo trocea en fragmentos de ~1500 caracteres, genera embeddings con Gemini y los guarda en ChromaDB. Los PDFs que ya existen en la base vectorial se saltan automáticamente (no se duplican).

```powershell
$python = "c:\Users\daceh\DAM2\TFG\EduRAG-DAM\backend\.venv\Scripts\python.exe"
Set-Location "c:\Users\daceh\DAM2\TFG\EduRAG-DAM"
& $python backend/scripts/upload_to_gemini.py
```

El script muestra un resumen al final con cuántos fragmentos se indexaron por archivo:

```
[OK]   tu_nuevo_documento.pdf : 12 fragmentos
[SKIP] UD1_PSP_Procesos.pdf   : ya existía
```

### 3.3 (Opcional) Borrar todo y reindexar desde cero

Usa `--reset` si quieres limpiar la base vectorial completa y volver a indexar todos los PDFs. Útil si cambiaste algún PDF o quieres empezar limpio.

```powershell
& $python backend/scripts/upload_to_gemini.py --reset
```

---

## RESUMEN RÁPIDO

| Acción | Comando |
|---|---|
| Instalar dependencias Python | `pip install -r requirements.txt` |
| Instalar dependencias frontend | `npm install` (desde `frontend/`) |
| Arrancar backend | `uvicorn app.main:app --reload --port 8000` |
| Arrancar frontend | `npm run dev` (desde `frontend/`) |
| Indexar PDFs nuevos | `python backend/scripts/upload_to_gemini.py` |
| Borrar ChromaDB y reindexar | `python backend/scripts/upload_to_gemini.py --reset` |
| Borrar ChromaDB manualmente | `Remove-Item -Recurse -Force backend\data\chroma_db` |
