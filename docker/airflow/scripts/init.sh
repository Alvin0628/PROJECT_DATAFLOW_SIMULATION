#!/bin/bash
set -e

echo "=========================================="
echo "Airflow Initialization Script"
echo "=========================================="

# Step 1: Run database migrations
echo ""
echo "[1/3] Running database migrations..."
airflow db migrate

# Step 2: Create admin user dengan password dari env
echo ""
echo "[2/3] Creating admin user..."
airflow users create \
  --username "${_AIRFLOW_WWW_USER_USERNAME:-admin}" \
  --firstname "Admin" \
  --lastname "User" \
  --role "Admin" \
  --email "admin@example.com" \
  --password "${_AIRFLOW_WWW_USER_PASSWORD:-airflow}" 2>&1 || echo "User already exists or error occurred"

# Step 3: Update password jika user sudah ada
echo ""
echo "[3/3] Ensuring admin user has correct password..."
python3 << 'EOF'
import sys
from airflow.models import User
from sqlalchemy.orm import Session
from airflow.utils.db import get_sqlalchemy_engine

engine = get_sqlalchemy_engine()
session = Session(bind=engine)

username = sys.argv[1] if len(sys.argv) > 1 else "admin"
password = sys.argv[2] if len(sys.argv) > 2 else "airflow"

try:
    user = session.query(User).filter(User.username == username).first()
    if user:
        user.password = password
        session.commit()
        print(f"✓ Updated password for user: {username}")
    else:
        print(f"✗ User {username} not found")
except Exception as e:
    print(f"✗ Error updating password: {str(e)}")
finally:
    session.close()
EOF

echo ""
echo "=========================================="
echo "✓ Initialization Complete!"
echo "=========================================="
echo ""
echo "Login credentials:"
echo "  Username: ${_AIRFLOW_WWW_USER_USERNAME:-admin}"
echo "  Password: ${_AIRFLOW_WWW_USER_PASSWORD:-airflow}"
echo ""
