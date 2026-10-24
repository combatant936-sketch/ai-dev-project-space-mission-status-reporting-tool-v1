from fastapi import FastAPI
from app.routers import auth, dashboard, missions, reports

app = FastAPI(title="Space Mission Status Reporting Tool")

app.include_router(auth.router)
app.include_router(missions.router)
app.include_router(reports.router)
app.include_router(dashboard.router)





@app.get("/health")
def health_check():
    return {"status": "ok"}

