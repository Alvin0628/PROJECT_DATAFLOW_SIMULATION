#!/usr/bin/env python3
import sys
from airflow.models import User
from airflow.utils.db import get_sqlalchemy_engine
from sqlalchemy.orm import Session

engine = get_sqlalchemy_engine()
session = Session(bind=engine)

try:
    user = session.query(User).filter(User.username == "admin").first()
    if user:
        user.password = "AF720HDA"
        session.commit()
        print("✓ Password updated successfully!")
        print("✓ Login with: admin / AF720HDA")
    else:
        print("✗ Admin user not found")
        sys.exit(1)
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)
finally:
    session.close()
