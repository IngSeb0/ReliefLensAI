FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ARG NEXT_PUBLIC_API_BASE_URL=/api
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ARG NEXT_PUBLIC_BACKEND_URL=/api
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM node:20-bookworm-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=7860 \
    NEXT_PUBLIC_API_URL=/api \
    NEXT_PUBLIC_API_BASE_URL=/api \
    NEXT_PUBLIC_BACKEND_URL=/api

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip nginx ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN python3 -m pip install --break-system-packages -r /app/backend/requirements.txt

COPY backend/ /app/backend/
COPY --from=frontend-builder /app/frontend /app/frontend
COPY nginx.space.conf /etc/nginx/conf.d/default.conf
COPY scripts/start_hf_space.sh /usr/local/bin/start_hf_space.sh

RUN chmod +x /usr/local/bin/start_hf_space.sh \
    && rm -f /etc/nginx/sites-enabled/default \
    && mkdir -p /var/cache/nginx /var/run /app/backend/data

EXPOSE 7860

CMD ["/usr/local/bin/start_hf_space.sh"]
