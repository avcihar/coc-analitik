"""
Celery Application Configuration
================================
Configures the Celery application for the CoC workers.
"""

import os
from celery import Celery

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

app = Celery(
    "coc_workers",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "services.workers.cwl_scout",
        "services.workers.leaderboard"
    ]
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_prefetch_multiplier=1,
    # --- Eski Redis (v5) ile uyumluluk için RESP2 protokolüne zorlama ---
    broker_transport_options={"protocol": 2},
    result_backend_transport_options={"protocol": 2},
)
