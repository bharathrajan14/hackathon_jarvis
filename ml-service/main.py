from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from model import model_instance

app = FastAPI(title="Proto Jarvis ML Anomaly Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnomalyRequest(BaseModel):
    userId: Optional[str] = None
    network: Optional[str] = 'office'
    location: Optional[str] = 'office'
    deviceTrust: Optional[str] = 'trusted'
    resourceSensitivity: Optional[str] = 'low'
    timeOfDay: Optional[str] = 'normal'
    hour: Optional[int] = None
    dayOfWeek: Optional[int] = None

@app.get("/health")
def health():
    return {"status": "ok", "service": "ml-anomaly-service"}

@app.post("/anomaly-score")
def get_anomaly_score(req: AnomalyRequest):
    try:
        data = req.dict()
        result = model_instance.predict(data)
        return {
            "anomalyScore": result["anomalyScore"],
            "isAnomaly": result["isAnomaly"],
            "rawScore": result["rawScore"],
            "explanation": "Behavioral anomaly detected" if result["isAnomaly"] else "Consistent with baseline behavior"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
