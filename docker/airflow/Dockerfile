FROM apache/airflow:3.3.0

# ========================================
# Install Linux Packages
# ========================================
USER root

RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# ========================================
# Install Python Packages
# ========================================
USER airflow

COPY docker/airflow/requirements-airflow.txt .

RUN pip install --no-cache-dir -r requirements-airflow.txt

# ========================================
# Default User
# ========================================
USER airflow