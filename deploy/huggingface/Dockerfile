# Hugging Face Space (Docker SDK) — the full platform with the live backend.
#
# Spaces serve on port 7860 and run as a non-root user, which is the only reason
# this differs from services/api/Dockerfile.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

# Node is needed only to assemble the dashboard from its source modules.
RUN apt-get update && apt-get install -y --no-install-recommends nodejs npm \
    && rm -rf /var/lib/apt/lists/*

COPY services/api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build:web

# Spaces require a non-root user with a writable home.
RUN useradd -m -u 1000 user && chown -R user /app
USER user

ENV HOME=/home/user \
    PORT=7860 \
    DATA_DIR=/app/data \
    NODE_ENV=production \
    CORS_ORIGINS=*

EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--app-dir", "services/api"]
