import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, r'c:\Users\Sahil Borhade\Desktop\Carbon_IQ\apps\ml-service')

from feature_engineering import build_monthly_aggregates, engineer_features, get_feature_columns
from model_predictor import predict_next_periods

def test_forecast():
    db_url = os.getenv('DATABASE_URL')
    org_id = 'cmssknvps000119nwrhreznyy'
    df, diag = build_monthly_aggregates(db_url, org_id)
    print('Monthly observations:', len(df))
    print(df[['month', 'total_co2e', 'scope1', 'scope2', 'scope3']])

    df = engineer_features(df)
    preds, sanity = predict_next_periods(features_df=df, horizon=6)
    print('\nForecast Predictions:')
    for p in preds:
        print(f"Period: {p['period']} | Predicted: {p['predicted_co2e']:,.2f} kgCO2e ({p['predicted_tonnes']} t) | Lower80: {p['lower_80_kg']} | Upper80: {p['upper_80_kg']} | Trend: {p['trend_direction']}")

    # Verify that predictions are not flat
    pred_vals = [p['predicted_co2e'] for p in preds]
    print('\nPredicted values across horizon:', pred_vals)
    unique_vals = set(pred_vals)
    if len(unique_vals) > 1:
        print('[PASS] Predictions are dynamically evolving across Sep, Oct, Nov!')
    else:
        print('[FAIL] Predictions are still flat!')

if __name__ == '__main__':
    test_forecast()
