from fastapi import FastAPI
from app.routers import auth, missions

app = FastAPI(title="Space Mission Status Reporting Tool")

app.include_router(auth.router)
app.include_router(missions.router)



@app.get("/health")
def health_check():
    return {"status": "ok"}

