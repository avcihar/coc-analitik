"""
Root Entrypoint for the FastAPI Server
======================================
Allows starting the server with either:
  - `uvicorn main:app --reload`
  - `uvicorn api_server.main:app --reload`
  - `python main.py`
"""

import os
from pathlib import Path
from dotenv import load_dotenv
import uvicorn

# Explicitly load .env from project root before initializing FastAPI app
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env", override=False)

from api_server.config import log_startup_token
from api_server.main import app, create_app

__all__ = ["app", "create_app"]

if __name__ == "__main__":
    log_startup_token()
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("api_server.main:app", host=host, port=port, reload=False)

