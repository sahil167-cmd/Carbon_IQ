"""
Unit tests for feature_engineering module.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
import numpy as np
import pytest
from feature_engineering import engineer_features, outlier_dampening, get_feature_columns


def _make_sample_df(months: int = 12) -> pd.DataFrame:
    """Create a sample monthly aggregates DataFrame for testing."""
    dates = pd.date_range("2025-01-01", periods=months, freq="MS")
    np.random.seed(42)
    base = 10000
    data = {
        "month": dates,
        "scope1": [base * 0.3 + np.random.normal(0, 500) for _ in range(months)],
        "scope2": [base * 0.4 + np.random.normal(0, 600) for _ in range(months)],
        "scope3": [base * 0.3 + np.random.normal(0, 400) for _ in range(months)],
        "total_co2e": [base + np.random.normal(0, 1000) for _ in range(months)],
        "doc_count": [np.random.randint(3, 15) for _ in range(months)],
        "avg_activity_value": [np.random.uniform(1000, 5000) for _ in range(months)],
        "transport_records": [np.random.randint(1, 5) for _ in range(months)],
        "fuel_records": [np.random.randint(1, 5) for _ in range(months)],
        "elec_records": [np.random.randint(1, 5) for _ in range(months)],
    }
    return pd.DataFrame(data)


class TestEngineerFeatures:
    def test_adds_lag_features(self):
        df = _make_sample_df(12)
        result = engineer_features(df)
        assert "lag_1m" in result.columns
        assert "lag_3m" in result.columns
        assert "lag_6m" in result.columns

    def test_adds_seasonality(self):
        df = _make_sample_df(12)
        result = engineer_features(df)
        assert "month_sin" in result.columns
        assert "month_cos" in result.columns
        assert "quarter" in result.columns

    def test_adds_scope_ratios(self):
        df = _make_sample_df(12)
        result = engineer_features(df)
        assert "scope1_ratio" in result.columns
        assert "scope2_ratio" in result.columns
        assert "scope3_ratio" in result.columns
        # Ratios should roughly sum to 1
        for _, row in result.iterrows():
            ratio_sum = row["scope1_ratio"] + row["scope2_ratio"] + row["scope3_ratio"]
            assert 0.5 < ratio_sum < 1.5  # Generous bounds

    def test_adds_transport_mix(self):
        df = _make_sample_df(12)
        result = engineer_features(df)
        assert "transport_mix" in result.columns
        assert "fuel_mix" in result.columns
        assert "elec_mix" in result.columns

    def test_adds_trend_slope(self):
        df = _make_sample_df(12)
        result = engineer_features(df)
        assert "trend_slope" in result.columns

    def test_no_nans_in_output(self):
        df = _make_sample_df(12)
        result = engineer_features(df)
        assert result.isnull().sum().sum() == 0, "Output should have no NaN values"

    def test_empty_df_returns_empty(self):
        df = pd.DataFrame()
        result = engineer_features(df)
        assert result.empty

    def test_single_row_returns_as_is(self):
        df = _make_sample_df(1)
        result = engineer_features(df)
        assert len(result) == 1

    def test_feature_columns_list(self):
        cols = get_feature_columns()
        assert len(cols) > 10
        assert "lag_1m" in cols
        assert "month_sin" in cols
        assert "scope1_ratio" in cols


class TestOutlierDampening:
    def test_clips_extreme_values(self):
        df = _make_sample_df(12)
        # Inject a massive outlier
        df.loc[5, "total_co2e"] = 999999
        result = outlier_dampening(df, "total_co2e")
        assert result.loc[5, "total_co2e"] < 999999

    def test_does_not_clip_normal_values(self):
        df = _make_sample_df(12)
        original_values = df["total_co2e"].copy()
        result = outlier_dampening(df, "total_co2e")
        # Most values should be unchanged
        unchanged = (result["total_co2e"] == original_values).sum()
        assert unchanged >= 10  # At least 10 of 12 values unchanged

    def test_empty_df_returns_empty(self):
        df = pd.DataFrame()
        result = outlier_dampening(df, "total_co2e")
        assert result.empty

    def test_no_negative_values(self):
        df = _make_sample_df(12)
        result = outlier_dampening(df, "total_co2e")
        assert (result["total_co2e"] >= 0).all()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
