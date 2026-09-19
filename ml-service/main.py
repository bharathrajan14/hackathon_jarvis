from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any, Dict
from model import model_instance

app = FastAPI(title="AdaptiveGuard AI Anomaly Engine", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnomalyRequest(BaseModel):
    userId: Optional[str] = None
    network: Optional[str] = 'corporate'
    location: Optional[str] = 'office'
    deviceTrust: Optional[str] = 'trusted'
    device: Optional[str] = 'trusted'
    resourceSensitivity: Optional[str] = 'LOW'
    action: Optional[str] = 'VIEW'
    timeOfDay: Optional[str] = 'normal'
    hour: Optional[int] = None
    request_frequency: Optional[float] = None
    failed_request_count: Optional[float] = None
    resource_access_frequency: Optional[float] = None
    download_frequency: Optional[float] = None
    export_frequency: Optional[float] = None
    restricted_website_attempts: Optional[float] = None
    session_age: Optional[float] = None
    newDevice: Optional[bool] = None

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "adaptiveguard-ai-anomaly-engine",
        "model": "IsolationForest-12Feature"
    }

@app.post("/anomaly-score")
def get_anomaly_score(req: Dict[str, Any]):
    try:
        result = model_instance.predict(req)
        score = result["anomalyScore"]
        
        if score >= 70:
            level = "CRITICAL"
            explanation = "Critical behavioral anomaly: multiple risk indicators elevated"
        elif score >= 50:
            level = "HIGH"
            explanation = "High behavioral anomaly detected: deviation from baseline pattern"
        elif score >= 30:
            level = "ELEVATED"
            explanation = "Elevated behavior score: minor telemetry variance"
        else:
            level = "NORMAL"
            explanation = "Consistent with baseline enterprise behavior"

        return {
            "anomalyScore": score,
            "isAnomaly": result["isAnomaly"],
            "rawScore": result["rawScore"],
            "level": level,
            "explanation": explanation,
            "features": result.get("features", {})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
