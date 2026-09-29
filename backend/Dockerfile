FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip==26.2 && pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd --create-home app && mkdir -p /app/uploads && chown -R app:app /app
USER app
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
