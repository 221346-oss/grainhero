"""
FastAPI wrapper exposed as POST /predict.
Matches the contract in src/lib/ai-inference.functions.ts (callHuggingFaceAPI).
"""
from typing import List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from predict import predict_spoilage

app = FastAPI(title="GrainHero ML", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictIn(BaseModel):
    grain_type: str = "rice"
    temperature: float
    humidity: float
    storage_days: float
    grain_moisture: float
    airflow: float = 0
    dew_point: float = 15
    ambient_light: float = 0
    pest_presence: float = 0
    rainfall: float = 0
    temperature_history: Optional[List[float]] = None
    humidity_history: Optional[List[float]] = None
    moisture_history: Optional[List[float]] = None


@app.get("/")
def root():
    return {"service": "grainhero-ml", "status": "ok",
            "endpoints": ["/predict", "/health"]}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/predict")
def predict(body: PredictIn):
    return predict_spoilage(body.model_dump())