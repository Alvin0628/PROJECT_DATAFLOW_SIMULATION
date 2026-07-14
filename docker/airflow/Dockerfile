FROM apache/airflow:3.1.0

USER root

RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

USER airflow

COPY docker/airflow/requirements-airflow.txt .

RUN pip install --no-cache-dir -r requirements-airflow.txt