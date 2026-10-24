from fastapi import FastAPI

app = FastAPI(title="Space Mission Status Reporting Tool")


@app.get("/health")
def health_check():
    return {"status": "ok"}
