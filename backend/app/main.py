import os
from pathlib import Path

# Set by the Dockerfile; falls back to a relative path for local dev.
_FRONTEND_DIR = Path(os.getenv("FRONTEND_DIR", str(Path(__file__).resolve().parents[2] / "frontend" / "dist")))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.routers import auth, dashboard, missions, reports, users

app = FastAPI(title="Space Mission Status Reporting Tool")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(missions.router)
app.include_router(reports.router)
app.include_router(dashboard.router)
app.include_router(users.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Serve the compiled React / Vite frontend (only when the build exists).
# All API routes above must be registered first so the catch-all below
# doesn't shadow them.
# ---------------------------------------------------------------------------
if _FRONTEND_DIR.is_dir():
    # Catch-all: serve the real file if it exists (JS/CSS/images),
    # otherwise return index.html so React Router handles the path.
    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str):
        candidate = _FRONTEND_DIR / full_path
        if candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(_FRONTEND_DIR / "index.html"))
