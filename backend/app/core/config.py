from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[3]
BACKEND_DIR = ROOT_DIR / "backend"
DATA_DIR = BACKEND_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
OUTPUTS_DIR = DATA_DIR / "outputs"
REPORTS_DIR = DATA_DIR / "reports"
LOGS_DIR = DATA_DIR / "logs"
DB_PATH = DATA_DIR / "dpi_dashboard.db"
ENGINE_PATH = ROOT_DIR / "dpi_engine.exe"


def ensure_directories() -> None:
    for path in (DATA_DIR, UPLOADS_DIR, OUTPUTS_DIR, REPORTS_DIR, LOGS_DIR):
        path.mkdir(parents=True, exist_ok=True)
