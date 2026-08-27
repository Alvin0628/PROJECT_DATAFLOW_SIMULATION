# FROM apache/airflow:2.9.0

# # ========================================
# # Install Linux Packages
# # ========================================
# USER root

# RUN apt-get update && apt-get install -y \
#     build-essential \
#     gcc \
#     && rm -rf /var/lib/apt/lists/*

# # ========================================
# # Install Docker CLI + Compose Plugin
# # ========================================
# RUN apt-get update && apt-get install -y \
#     ca-certificates \
#     curl \
#     gnupg \
#     && install -m 0755 -d /etc/apt/keyrings \
#     && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
#     && chmod a+r /etc/apt/keyrings/docker.asc \
#     && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list \
#     && apt-get update \
#     && apt-get install -y docker-ce-cli docker-compose-plugin \
#     && rm -rf /var/lib/apt/lists/*

# # ========================================
# # Docker Socket Group Permission
# # ========================================
# # PENTING (fix dari versi sebelumnya): kalau DOCKER_GID = 0, itu GID grup
# # "root" -- SUDAH PASTI ada di base image manapun. `groupadd -g 0 ...` akan
# # GAGAL karena bentrok. Versi lama Dockerfile ini cuma nge-skip errornya
# # (`|| true`) lalu asal pasang angka mentah ke `usermod -aG`, yang tidak
# # reliable. Logic di bawah ini mendeteksi kalau GID sudah dipakai grup lain
# # (termasuk "root"), dan pakai NAMA grup yang sudah ada, bukan bikin baru.
# ARG DOCKER_GID=999
# RUN EXISTING_GROUP=$(getent group ${DOCKER_GID} | cut -d: -f1); \
#     if [ -z "$EXISTING_GROUP" ]; then \
#         groupadd -g ${DOCKER_GID} docker_host_group; \
#         usermod -aG docker_host_group airflow; \
#     else \
#         usermod -aG "$EXISTING_GROUP" airflow; \
#     fi

# # ========================================
# # Install Python Packages
# # ========================================
# USER airflow

# COPY docker/airflow/requirements-airflow.txt .

# RUN pip install --no-cache-dir -r requirements-airflow.txt

# # ========================================
# # Default User
# # ========================================
# USER airflow

FROM apache/airflow:2.9.0

# ========================================
# Install Linux Packages
# ========================================
USER root

RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# ========================================
# Install Docker CLI + Compose Plugin
# ========================================
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

# ========================================
# Docker Socket Group Permission
# ========================================
# PENTING (fix errexit+pipefail): base image apache/airflow menjalankan
# RUN dengan `set -e -o pipefail`. Kalau grup dengan GID ini belum ada di
# /etc/group image (kasus normal untuk GID custom dari host), `getent`
# akan exit code 2 -- dan karena pipefail, itu "menular" ke seluruh
# pipeline `getent | cut`, memicu errexit MENGHENTIKAN BUILD sebelum
# sempat sampai ke pengecekan `if [ -z ... ]` di bawah.
#
# `|| true` di akhir pipeline (BUKAN cuma di cut) menangkap kegagalan
# seluruh pipeline itu supaya errexit tidak terpicu, dan EXISTING_GROUP
# jadi string kosong -- baru bisa dicek dengan benar oleh `if` berikutnya.
ARG DOCKER_GID=999
RUN EXISTING_GROUP=$(getent group ${DOCKER_GID} | cut -d: -f1 || true); \
    if [ -z "$EXISTING_GROUP" ]; then \
        groupadd -g ${DOCKER_GID} docker_host_group; \
        usermod -aG docker_host_group airflow; \
    else \
        usermod -aG "$EXISTING_GROUP" airflow; \
    fi

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