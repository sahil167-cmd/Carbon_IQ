"""
Unit tests for model_trainer module.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
import numpy as np
import pytest
from feature_engineering import engineer_features, get_feature_columns
from model_trainer import (
    time_based_split,
    train_xgboost,
    train_baseline,
    compute_mape,
    compute_rmse,
    should_promote,
    save_model_artifact,
    load_model_artifact,
)


def _make_training_df(months: int = 12) -> pd.DataFrame:
    """Create a sample engineered DataFrame for training tests."""
    dates = pd.date_range("2025-01-01", periods=months, freq="MS")
    np.random.seed(42)
    base = 10000
    # Create trending data with seasonality
    trend = np.linspace(base * 0.9, base * 1.1, months)
    seasonality = 500 * np.sin(2 * np.pi * np.arange(months) / 12)
    noise = np.random.normal(0, 300, months)

    data = {
        "month": dates,
        "scope1": trend * 0.3 + noise * 0.3,
        "scope2": trend * 0.4 + noise * 0.4,
        "scope3": trend * 0.3 + noise * 0.3,
        "total_co2e": trend + seasonality + noise,
        "doc_count": np.random.randint(3, 15, months).astype(float),
        "avg_activity_value": np.random.uniform(1000, 5000, months),
        "transport_records": np.random.randint(1, 5, months).astype(float),
        "fuel_records": np.random.randint(1, 5, months).astype(float),
        "elec_records": np.random.randint(1, 5, months).astype(float),
    }
    df = pd.DataFrame(data)
    return engineer_features(df)


class TestTimeBasedSplit:
    def test_split_preserves_chronological_order(self):
        df = _make_training_df(12)
        train, val = time_based_split(df)
        assert train["month"].max() < val["month"].min()

    def test_split_sizes(self):
        df = _make_training_df(12)
        train, val = time_based_split(df, val_months=2)
        assert len(val) == 2
        assert len(train) == 10

    def test_split_with_small_data(self):
        df = _make_training_df(3)
        train, val = time_based_split(df, val_months=2)
        assert len(train) >= 1
        assert len(val) >= 1


class TestTrainXGBoost:
    def test_returns_model_and_metrics(self):
        df = _make_training_df(12)
        feature_cols = get_feature_columns()
        model, metrics = train_xgboost(df, feature_cols)
        assert model is not None
        assert "mape" in metrics
        assert "rmse" in metrics
        assert "feature_importance" in metrics
        assert metrics["training_samples"] > 0

    def test_mape_is_reasonable(self):
        df = _make_training_df(18)
        feature_cols = get_feature_columns()
        _, metrics = train_xgboost(df, feature_cols)
        # MAPE should be < 100% for trending data with some noise
        assert metrics["mape"] < 1.0

    def test_feature_importance_has_entries(self):
        df = _make_training_df(12)
        feature_cols = get_feature_columns()
        _, metrics = train_xgboost(df, feature_cols)
        assert len(metrics["feature_importance"]) > 0


class TestTrainBaseline:
    def test_returns_model_and_metrics(self):
        df = _make_training_df(4)
        model, metrics = train_baseline(df)
        assert model is not None
        assert "mape" in metrics
        assert "rmse" in metrics

    def test_works_with_minimal_data(self):
        df = _make_training_df(2)
        model, metrics = train_baseline(df)
        assert model is not None


class TestMetrics:
    def test_mape_zero_actuals(self):
        y_true = np.array([0, 0, 0])
        y_pred = np.array([1, 2, 3])
        mape = compute_mape(y_true, y_pred)
        assert mape == 0.0  # Should handle gracefully

    def test_mape_perfect_predictions(self):
        y_true = np.array([100, 200, 300])
        y_pred = np.array([100, 200, 300])
        mape = compute_mape(y_true, y_pred)
        assert mape == 0.0

    def test_rmse_perfect_predictions(self):
        y_true = np.array([100, 200, 300])
        y_pred = np.array([100, 200, 300])
        rmse = compute_rmse(y_true, y_pred)
        assert rmse == 0.0

    def test_rmse_positive(self):
        y_true = np.array([100, 200, 300])
        y_pred = np.array([110, 210, 310])
        rmse = compute_rmse(y_true, y_pred)
        assert rmse > 0


class TestPromotionGate:
    def test_first_model_always_promoted(self):
        assert should_promote(0.15, None) is True

    def test_better_model_promoted(self):
        assert should_promote(0.10, 0.20) is True

    def test_worse_model_not_promoted(self):
        assert should_promote(0.25, 0.20) is False

    def test_marginally_better_not_promoted(self):
        # 0.19 is only ~5% better than 0.20, threshold requires > 5%
        assert should_promote(0.19, 0.20) is False


class TestModelArtifacts:
    def test_save_and_load(self, tmp_path):
        from sklearn.linear_model import LinearRegression
        model = LinearRegression()
        model.fit([[1], [2], [3]], [1, 2, 3])

        filepath = os.path.join(str(tmp_path), "test_model.joblib")
        import joblib
        joblib.dump(model, filepath)
        loaded = load_model_artifact(filepath)
        assert loaded is not None
        pred = loaded.predict([[4]])
        assert abs(pred[0] - 4.0) < 0.1

    def test_load_nonexistent_raises(self):
        with pytest.raises(FileNotFoundError):
            load_model_artifact("/nonexistent/path.joblib")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
