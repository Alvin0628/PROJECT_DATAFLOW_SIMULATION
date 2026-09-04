FROM apache/airflow:2.9.0

# Install linux packages
USER root

RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install docker compose & plugin
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# DOCKER SOCKET GROUP PERMISSION (DooD)
# Airflow needs access to the host Docker Socket for Docker-outside-of-Docker.
# The host GID may not exist in the Airflow image, so `getent` can fail.
# `|| true` prevents this from stopping the build.

ARG DOCKER_GID=999
RUN EXISTING_GROUP=$(getent group ${DOCKER_GID} | cut -d: -f1 || true); \
    if [ -z "$EXISTING_GROUP" ]; then \
        groupadd -g ${DOCKER_GID} docker_host_group; \
        usermod -aG docker_host_group airflow; \
    else \
        usermod -aG "$EXISTING_GROUP" airflow; \
    fi

# Install python packages
USER airflow

COPY docker/airflow/requirements-airflow.txt .

RUN pip install --no-cache-dir -r requirements-airflow.txt

# Default user
USER airflow