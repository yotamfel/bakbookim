"""Entrypoint invoked once a day by Railway's cron trigger (see SETUP_GUIDE.md)."""

from app.db import SessionLocal
from app.services.snapshot import run_daily_job


def main() -> None:
    db = SessionLocal()
    try:
        run_daily_job(db)
        print("Daily snapshot job completed.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
