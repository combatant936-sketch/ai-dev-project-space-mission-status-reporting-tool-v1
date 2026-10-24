from fastapi import FastAPI
from app.routers import auth, dashboard, missions, reports, users

app = FastAPI(title="Space Mission Status Reporting Tool")

app.include_router(auth.router)
app.include_router(missions.router)
app.include_router(reports.router)
app.include_router(dashboard.router)
app.include_router(users.router)






@app.get("/health")
def health_check():
    return {"status": "ok"}

