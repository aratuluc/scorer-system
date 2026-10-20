import os
from pathlib import Path
from dotenv import load_dotenv

# Directory references
SERVER_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SERVER_DIR.parent

# Step 1: Detect environment mode (APP_ENV defaults to "development")
app_env = os.getenv("APP_ENV")

# If APP_ENV not in os.environ, check if it is defined in root .env
if not app_env and (PROJECT_ROOT / ".env").is_file():
    load_dotenv(dotenv_path=PROJECT_ROOT / ".env", override=False)
    app_env = os.getenv("APP_ENV")

APP_ENV = (app_env or "development").lower()

# Step 2: Attempt loading env files in precedence order (without overriding existing environment variables)
env_candidates = [
    PROJECT_ROOT / f".env.{APP_ENV}.local",
    PROJECT_ROOT / f".env.{APP_ENV}",
    PROJECT_ROOT / ".env.local",
    PROJECT_ROOT / ".env",
    SERVER_DIR / ".env",
]

for env_path in env_candidates:
    if env_path.is_file():
        load_dotenv(dotenv_path=env_path, override=False)

# Database Configuration
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_DB = os.getenv("POSTGRES_DB", "scorer_db")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "db")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

# Database URL
raw_db_url = os.getenv("DATABASE_URL")
if raw_db_url:
    # Expand shell variables if string has unexpanded ${VAR}
    DATABASE_URL = os.path.expandvars(raw_db_url)
else:
    DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# API & Server Configuration
try:
    API_PORT = int(os.getenv("API_PORT", 8000))
except ValueError:
    API_PORT = 8000

ALLOWED_ORIGINS_RAW = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost:8000,https://predict.arat.dev,https://api.arat.dev",
)
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in ALLOWED_ORIGINS_RAW.split(",")
    if origin.strip()
]

# Admin Authentication
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "")
ADMIN_PWD = os.getenv("ADMIN_PWD", "")

# Optional Notifications
NOTIFICATION_URL = os.getenv("NOTIFICATION_URL")
