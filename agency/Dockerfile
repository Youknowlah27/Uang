# Zero-cost runtime for your PC (Windows/macOS/Linux with Docker). NOT built in CI — see README "Verified vs not verified".
FROM node:22-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip python3-venv ffmpeg chromium fonts-liberation git ca-certificates && rm -rf /var/lib/apt/lists/*
ENV CHROMIUM_BIN=/usr/bin/chromium PIP_BREAK_SYSTEM_PACKAGES=1
WORKDIR /app
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt
COPY studio/package*.json studio/
RUN cd studio && npm ci
COPY . .
# `claude` CLI (your subscription) is used as the LLM: install it in the image or mount your host login — see README.
CMD ["python3", "-m", "shorts_agency", "daemon"]
