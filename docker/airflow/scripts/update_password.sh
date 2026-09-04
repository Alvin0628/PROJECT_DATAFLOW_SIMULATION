#!/bin/bash
# Script untuk update password admin user di Airflow yang sudah berjalan
# Usage: docker compose exec airflow-webserver bash /docker/airflow/scripts/update_password.sh <username> <password>

set -e

USERNAME="${1:-admin}"
PASSWORD="${2:-airflow}"

echo "=========================================="
echo "Updating Airflow User Password"
echo "=========================================="
echo "Username: $USERNAME"
echo "Password: $PASSWORD"
echo ""

python3 << EOF
import sys
from airflow.models import User
from airflow.utils.db import get_sqlalchemy_engine
from sqlalchemy.orm import Session

engine = get_sqlalchemy_engine()
session = Session(bind=engine)

try:
    user = session.query(User).filter(User.username == "$USERNAME").first()
    
    if not user:
        print(f"✗ User '$USERNAME' not found!")
        print("")
        print("Available users:")
        users = session.query(User).all()
        for u in users:
            print(f"  - {u.username}")
        sys.exit(1)
    
    # Update password
    user.password = "$PASSWORD"
    session.commit()
    print(f"✓ Successfully updated password for user: $USERNAME")
    print(f"✓ New password: $PASSWORD")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")
    sys.exit(1)
finally:
    session.close()

print("=========================================="
EOF
