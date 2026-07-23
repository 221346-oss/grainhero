FROM python:3.11-slim

WORKDIR /code

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Download large model .pkl files (kept out of git; hosted as Lovable assets)
RUN xargs -n2 -a MODEL_URLS.txt sh -c 'curl -fsSL "$0" -o "$1"' && ls -lh *.pkl

ENV PORT=7860
EXPOSE 7860

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]