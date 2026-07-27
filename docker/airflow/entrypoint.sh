#!/bin/bash
# Entrypoint script untuk Airflow standalone + init password setup

set -e

# Jika ini first startup, jalankan init
if [ ! -f "/opt/airflow/.initialized" ]; then
    echo ""
    echo "=========================================="
    echo "First startup detected, running initialization..."
    echo "=========================================="
    echo ""
    
    # Migrate database
    echo "[1/2] Running database migrations..."
    airflow db migrate
    
    # Create admin user
    echo ""
    echo "[2/2] Setting up admin user..."
    airflow users create \
      --username "${_AIRFLOW_WWW_USER_USERNAME:-admin}" \
      --firstname "Admin" \
      --lastname "User" \
      --role "Admin" \
      --email "admin@example.com" \
      --password "${_AIRFLOW_WWW_USER_PASSWORD:-airflow}" 2>&1 || true
    
    # Update password untuk memastikan
    python3 << 'PYTHON_EOF'
import sys
import os
from airflow.models import User
from airflow.utils.db import get_sqlalchemy_engine
from sqlalchemy.orm import Session

username = os.getenv("_AIRFLOW_WWW_USER_USERNAME", "admin")
password = os.getenv("_AIRFLOW_WWW_USER_PASSWORD", "airflow")

try:
    engine = get_sqlalchemy_engine()
    session = Session(bind=engine)
    user = session.query(User).filter(User.username == username).first()
    
    if user:
        user.password = password
        session.commit()
        print(f"✓ Admin user ready: {username}")
    else:
        print(f"✗ Failed to create user {username}")
        sys.exit(1)
    
    session.close()
except Exception as e:
    print(f"✗ Error: {str(e)}")
    sys.exit(1)
PYTHON_EOF
    
    # Mark as initialized
    touch /opt/airflow/.initialized
    
    echo ""
    echo "=========================================="
    echo "✓ Initialization complete!"
    echo "=========================================="
    echo ""
    echo "Login with:"
    echo "  Username: ${_AIRFLOW_WWW_USER_USERNAME:-admin}"
    echo "  Password: ${_AIRFLOW_WWW_USER_PASSWORD:-airflow}"
    echo ""
fi

# Jalankan standalone command
exec airflow standalone "$@"
