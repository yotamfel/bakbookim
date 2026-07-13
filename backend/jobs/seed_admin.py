"""One-off CLI to create/reset an admin user. Usage: python -m jobs.seed_admin <username> <password>"""

import sys

from app.db import SessionLocal
from app.models import AdminUser
from app.services.auth import hash_password


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: python -m jobs.seed_admin <username> <password>")
        sys.exit(1)

    username, password = sys.argv[1], sys.argv[2]
    db = SessionLocal()
    try:
        existing = db.query(AdminUser).filter(AdminUser.username == username).first()
        if existing:
            existing.password_hash = hash_password(password)
            print(f"Updated password for admin user '{username}'")
        else:
            db.add(AdminUser(username=username, password_hash=hash_password(password)))
            print(f"Created admin user '{username}'")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
