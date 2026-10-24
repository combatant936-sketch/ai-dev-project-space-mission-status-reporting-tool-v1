from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, dashboard, missions, reports, users

app = FastAPI(title="Space Mission Status Reporting Tool")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(missions.router)
app.include_router(reports.router)
app.include_router(dashboard.router)
app.include_router(users.router)






@app.get("/health")
def health_check():
    return {"status": "ok"}

