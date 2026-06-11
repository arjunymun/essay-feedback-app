FROM python:3.11-slim

WORKDIR /app

COPY services/review-api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/review-api/review_api ./review_api

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["uvicorn", "review_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
