# Use the official Python 3.10 image
FROM python:3.10-slim

# Set the working directory to /app
WORKDIR /app

# Install system dependencies required for LightGBM and other ML libraries
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .
  
# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose port 7860 (HuggingFace Spaces default port)
EXPOSE 7860

# Command to run the FastAPI application via Uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
