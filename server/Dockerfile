FROM python:3.11-slim
WORKDIR /app

# Install dependencies first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your python code
COPY . .

EXPOSE 8000