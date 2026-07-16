#!/bin/bash
set -e

echo "Waiting for Airflow database to be ready..."
airflow db check-migrations

echo "Creating default admin user..."
airflow users create \
  --username admin \
  --firstname Admin \
  --lastname User \
  --role Admin \
  --email admin@example.com \
  --password admin || echo "User already exists"

echo "Initialization complete!"
