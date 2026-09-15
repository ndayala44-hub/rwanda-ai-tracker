FROM python:3.12-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY services/api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/api/app ./app
# The dataset is mounted at runtime, so a data change needs no image rebuild.
ENV DATA_DIR=/app/data

RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser
EXPOSE 4010
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4010"]
