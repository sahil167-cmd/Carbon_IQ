"""
Carbon OS — ML Service (FastAPI)
Phase 10: Model Selection & Real-Time Forecasting Pipeline (Enterprise v3).

Service boundary: reached from core-api ONLY via POST /train and POST /predict.
NEVER touches auth, documents, or compliance data directly.
"""
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
import os
import logging
import traceback
import numpy as np
import pandas as pd

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("ml-service")

app = FastAPI(title="Carbon OS — ML Service", version="1.0.0")

DATABASE_URL = os.getenv("DATABASE_URL") or "postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev"


# =============================================================================
# Health
# =============================================================================

@app.get("/health")
async def health():
    return {
        "success": True,
        "data": {
            "status": "ok",
            "timestamp": datetime.utcnow().isoformat(),
            "service": "ml-service",
            "version": "2.0.0",
        }
    }


# =============================================================================
# Train Models
# =============================================================================

class TrainRequest(BaseModel):
    organization_id: str
    database_url: Optional[str] = None


class TrainResponse(BaseModel):
    success: bool
    model_type: str = ""
    version: int = 1
    promoted: bool = False
    mae: Optional[float] = None
    rmse: Optional[float] = None
    wape: Optional[float] = None
    smape: Optional[float] = None
    bias: Optional[float] = None
    r2: Optional[float] = None
    feature_importance: Optional[Dict[str, float]] = None
    training_samples: int = 0
    validation_samples: int = 0
    duration_ms: int = 0
    artifact_path: Optional[str] = None
    error: Optional[str] = None


@app.post("/train")
async def train(request: TrainRequest):
    """
    Train a forecasting model for the given organization.
    Runs Candidate Model Tournament with chronological holdout validation.
    """
    try:
        from feature_engineering import build_monthly_aggregates, engineer_features, get_feature_columns
        from model_trainer import evaluate_and_select_best_model, save_model_artifact

        db_url = request.database_url or os.getenv("DATABASE_URL") or "postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev"
        org_id = request.organization_id
        logger.info(f"[ML Service] Training requested for org={org_id}")

        # 1. Build monthly aggregates from DB
        df, diagnostics = build_monthly_aggregates(db_url, org_id)
        if df.empty:
            return TrainResponse(success=False, error="No emissions history found for this organization")

        # 2. Feature engineering
        df = engineer_features(df)
        feature_cols = get_feature_columns()

        # 3. Model Tournament Pipeline
        model, model_type, metrics, eligibility = evaluate_and_select_best_model(df, feature_cols)
        if not eligibility["eligible"]:
            return TrainResponse(success=False, error=eligibility["reason"])

        # 4. Save model artifact
        version = 1
        artifact_path = save_model_artifact(model, org_id, version)

        logger.info(f"[ML Service] Best model selected: {model_type} | WAPE={metrics.get('wape')} | MAE={metrics.get('mae')} | RMSE={metrics.get('rmse')}")

        return TrainResponse(
            success=True,
            model_type=model_type,
            version=version,
            promoted=True,
            mae=metrics.get("mae"),
            rmse=metrics.get("rmse"),
            wape=metrics.get("wape"),
            smape=metrics.get("smape"),
            bias=metrics.get("bias"),
            r2=metrics.get("r2"),
            feature_importance=metrics.get("feature_importance"),
            training_samples=metrics.get("training_observations", 0),
            validation_samples=metrics.get("validation_observations", 0),
            duration_ms=metrics.get("duration_ms", 0),
            artifact_path=artifact_path,
        )

    except Exception as e:
        logger.error(f"[ML Service] Training failed: {traceback.format_exc()}")
        return TrainResponse(success=False, error=str(e))


# =============================================================================
# Predict — Generate forecasts using a trained model
# =============================================================================

class PredictRequest(BaseModel):
    organization_id: str
    database_url: Optional[str] = None
    artifact_path: Optional[str] = None
    horizon_months: int = 6


class PredictionItem(BaseModel):
    predicted_month: str
    predicted_co2e: float
    lower_bound_80: Optional[float] = None
    upper_bound_80: Optional[float] = None
    lower_bound_95: Optional[float] = None
    upper_bound_95: Optional[float] = None
    scope_breakdown: Optional[Dict[str, float]] = None
    scenarios: Optional[Dict[str, float]] = None
    confidence_score: float
    confidence_label: str
    trend_direction: str
    is_sanity_checked: bool


class PredictResponse(BaseModel):
    success: bool
    status: str = "SUCCESS"
    organization_id: str = ""
    predictions: List[PredictionItem] = []
    model_type: str = ""
    current_month_actual: Optional[float] = None
    feature_importance: Optional[Dict[str, float]] = None
    mae: Optional[float] = None
    rmse: Optional[float] = None
    wape: Optional[float] = None
    smape: Optional[float] = None
    bias: Optional[float] = None
    r2: Optional[float] = None
    eligibility: Optional[Dict[str, Any]] = None
    data_diagnostics: Optional[Dict[str, Any]] = None
    sanity_report: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@app.post("/predict")
async def predict(request: PredictRequest):
    """
    Generate emission forecasts for the next N months.
    - Evaluates model eligibility gate (N >= 3)
    - Runs Walk-Forward Model Tournament on the fly
    - Reconciles Scope 1 + Scope 2 + Scope 3 = Total
    - Returns empirical 80% & 95% Confidence Intervals & diagnostics
    """
    try:
        from feature_engineering import build_monthly_aggregates, engineer_features, get_feature_columns
        from model_trainer import evaluate_and_select_best_model
        from model_predictor import predict_next_periods

        db_url = request.database_url or os.getenv("DATABASE_URL") or "postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev"
        org_id = request.organization_id

        # 1. Build canonical monthly time-series & data diagnostics
        df, diagnostics = build_monthly_aggregates(db_url, org_id)
        if df.empty:
            return PredictResponse(
                success=False,
                status="INSUFFICIENT_DATA",
                organization_id=org_id,
                error="No verified emissions history available for this organization.",
                data_diagnostics=diagnostics,
                eligibility={
                    "eligible": False,
                    "observations_count": 0,
                    "min_required": 1,
                    "reason": "No approved emissions records in database.",
                    "tier": "INSUFFICIENT_DATA"
                }
            )

        df = engineer_features(df)
        feature_cols = get_feature_columns()

        # 2. Model Eligibility Gate & Tournament Selection
        model, model_type, metrics, eligibility = evaluate_and_select_best_model(df, feature_cols)

        if not eligibility["eligible"]:
            current_actual = float(df.iloc[-1]["total_co2e"]) if not df.empty else 0.0
            return PredictResponse(
                success=False,
                status="INSUFFICIENT_DATA",
                organization_id=org_id,
                current_month_actual=current_actual,
                eligibility=eligibility,
                data_diagnostics=diagnostics,
                error=eligibility["reason"],
            )

        # 3. Generate Predictions & Sanity Check
        raw_predictions, sanity_report = predict_next_periods(model, df, feature_cols, request.horizon_months)
        predictions = [PredictionItem(**p) for p in raw_predictions]

        current_actual = float(df.iloc[-1]["total_co2e"]) if not df.empty else None
        feat_imp = metrics.get("feature_importance", {"activity_level": 1.0})
        pred_summary = [f"{p.predicted_month[:7]}: {p.predicted_co2e:,.1f} kg" for p in predictions]
        logger.info(
            f"[FORECAST] organization={org_id} verified_records={diagnostics.get('total_emission_records', len(df))} "
            f"reporting_periods={len(df)} historical_start={diagnostics.get('coverage_start')} "
            f"historical_end={diagnostics.get('coverage_end')} target=monthly_total_co2e "
            f"candidate_models={metrics.get('evaluated_candidates', [model_type])} "
            f"selected_model={model_type} forecast_horizon={request.horizon_months} "
            f"generated_forecast={pred_summary}"
        )

        return PredictResponse(
            success=True,
            status="SUCCESS",
            organization_id=org_id,
            predictions=predictions,
            model_type=model_type,
            current_month_actual=current_actual,
            feature_importance=feat_imp,
            mae=metrics.get("mae"),
            rmse=metrics.get("rmse"),
            wape=metrics.get("wape"),
            smape=metrics.get("smape"),
            bias=metrics.get("bias"),
            r2=metrics.get("r2"),
            eligibility=eligibility,
            data_diagnostics=diagnostics,
            sanity_report=sanity_report,
        )

    except Exception as e:
        logger.error(f"[ML Service] Prediction failed: {traceback.format_exc()}")
        return PredictResponse(success=False, status="UNAVAILABLE", organization_id=request.organization_id, error="The forecast engine encountered an issue generating projections.")


@app.post("/forecast/canonical")
@app.post("/api/v1/forecast/canonical")
async def get_canonical_forecast_endpoint(request: PredictRequest):
    """
    Direct Canonical Forecast Schema Endpoint.
    Single source of truth for dashboard and RAG intelligence.
    """
    try:
        from model_predictor import get_canonical_forecast
        db_url = request.database_url or os.getenv("DATABASE_URL")
        return get_canonical_forecast(request.organization_id, db_url, request.horizon_months)
    except Exception as e:
        logger.error(f"[Canonical Forecast] Endpoint failed: {traceback.format_exc()}")
        return {
            "status": "unavailable",
            "organization_id": request.organization_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "history": [],
            "forecast": [],
            "model": {"name": "Unavailable", "mode": "UNAVAILABLE", "history_periods": 0, "reliability": "None"},
            "drivers": [],
            "diagnostics": {
                "anomalies_detected": [],
                "scope_reconciliation_passed": False,
                "driver_reconciliation_passed": False,
                "data_quality": "error",
                "error_code": "ENDPOINT_ERROR",
                "user_message": "The forecast service is currently unreachable.",
            },
        }


# =============================================================================
# CarbonIQ Copilot / RAG Assistant (LangGraph Pipeline)
# =============================================================================

class RagQueryRequest(BaseModel):
    message: str
    organization_id: str
    user_id: str = "default_user"
    database_url: Optional[str] = None
    mistral_api_key: Optional[str] = None
    conversation_history: List[Dict[str, str]] = []


class RagQueryResponse(BaseModel):
    success: bool
    answer: str = ""
    citations: List[Dict[str, Any]] = []
    query_type: str = "GENERAL"
    intent: Optional[Dict[str, Any]] = None
    evidence_pack: Optional[Dict[str, Any]] = None
    debug_trace: Optional[Dict[str, Any]] = None
    execution_trace: List[str] = []
    error: Optional[str] = None


@app.post("/rag/query")
async def rag_query(request: RagQueryRequest):
    """
    Execute cyclic LangGraph RAG with grounded mathematical audit guards.
    """
    try:
        from rag_graph.graph import execute_rag_pipeline

        db_url = request.database_url or os.getenv("DATABASE_URL") or "postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev"
        api_key = request.mistral_api_key or os.getenv("MISTRAL_API_KEY") or os.getenv("LLM_API_KEY") or ""

        result = execute_rag_pipeline(
            message=request.message,
            organization_id=request.organization_id,
            user_id=request.user_id,
            database_url=db_url,
            mistral_api_key=api_key,
            history=request.conversation_history,
        )

        return RagQueryResponse(
            success=True,
            answer=result["answer"],
            citations=result["citations"],
            query_type=result["query_type"],
            intent=result.get("intent"),
            evidence_pack=result.get("evidence_pack"),
            debug_trace=result.get("debug_trace"),
            execution_trace=result["execution_trace"],
        )

    except Exception as e:
        logger.error(f"[LangGraph RAG] Execution failed: {traceback.format_exc()}")
        return RagQueryResponse(success=False, error=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
