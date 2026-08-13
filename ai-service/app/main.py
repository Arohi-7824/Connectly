from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api.routes.analyze import router as analyze_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-load all models at startup
    print("[AI] Pre-loading models...")
    from app.models.transformer_classifier import _get_classifier as get_toxic
    from app.models.zero_shot_classifier import _get_classifier as get_zero_shot
    get_toxic()
    get_zero_shot()
    print("[AI] All models ready")
    yield


app = FastAPI(
    title="Connectly AI Safety Service",
    version="0.3.0",
    lifespan=lifespan,
)

app.include_router(analyze_router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.3.0"}