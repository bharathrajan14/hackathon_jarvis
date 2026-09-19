import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

NETWORK_MAP = {'office': 0, 'public': 1, 'unknown': 2}
LOCATION_MAP = {'office': 0, 'near': 1, 'far': 2}
DEVICE_TRUST_MAP = {'trusted': 0, 'unknown': 1, 'untrusted': 2}
SENSITIVITY_MAP = {'low': 0, 'medium': 1, 'high': 2}

class AnomalyModel:
    def __init__(self):
        self.model = None
        self._train()

    def _generate_synthetic_logs(self):
        np.random.seed(42)
        n_normal = 1200
        n_anomaly = 60

        # Normal activity: Business hours (9 AM - 6 PM), weekdays, office network, trusted device
        normal_hours = np.random.randint(9, 18, size=n_normal)
        normal_days = np.random.randint(0, 5, size=n_normal)  # Mon-Fri
        normal_network = np.random.choice([0, 1], size=n_normal, p=[0.90, 0.10])
        normal_location = np.random.choice([0, 1], size=n_normal, p=[0.92, 0.08])
        normal_device = np.zeros(n_normal, dtype=int)  # trusted
        normal_sens = np.random.choice([0, 1, 2], size=n_normal, p=[0.60, 0.30, 0.10])

        normal_df = pd.DataFrame({
            'hour': normal_hours,
            'day_of_week': normal_days,
            'network': normal_network,
            'location': normal_location,
            'device_trust': normal_device,
            'sensitivity': normal_sens
        })

        # Anomaly activity: Late night (1 AM - 4 AM), weekend, unknown network, far location, untrusted device
        anomaly_hours = np.random.randint(1, 5, size=n_anomaly)
        anomaly_days = np.random.randint(0, 7, size=n_anomaly)
        anomaly_network = np.random.choice([1, 2], size=n_anomaly, p=[0.20, 0.80])
        anomaly_location = np.random.choice([1, 2], size=n_anomaly, p=[0.15, 0.85])
        anomaly_device = np.random.choice([1, 2], size=n_anomaly, p=[0.40, 0.60])
        anomaly_sens = np.random.choice([1, 2], size=n_anomaly, p=[0.30, 0.70])

        anomaly_df = pd.DataFrame({
            'hour': anomaly_hours,
            'day_of_week': anomaly_days,
            'network': anomaly_network,
            'location': anomaly_location,
            'device_trust': anomaly_device,
            'sensitivity': anomaly_sens
        })

        return pd.concat([normal_df, anomaly_df], ignore_index=True)

    def _train(self):
        data = self._generate_synthetic_logs()
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42
        )
        self.model.fit(data)
        print("[ML Service] Isolation Forest trained successfully on synthetic access logs.")

    def predict(self, context):
        # Extract and encode features
        hour = context.get('hour')
        if hour is None:
            time_of_day = context.get('timeOfDay') or 'normal'
            if time_of_day in ['night', 'after_hours', 'unusual', 'critical']:
                hour = 2  # 2 AM
            else:
                hour = 11  # 11 AM default business hour
        hour = int(hour)

        dow = context.get('dayOfWeek')
        day_of_week = int(dow) if dow is not None else 2  # Wednesday default
        network = NETWORK_MAP.get(str(context.get('network') or 'office').lower(), 2)
        location = LOCATION_MAP.get(str(context.get('location') or 'office').lower(), 2)
        device_trust = DEVICE_TRUST_MAP.get(str(context.get('deviceTrust') or 'trusted').lower(), 1)
        sensitivity = SENSITIVITY_MAP.get(str(context.get('resourceSensitivity') or 'low').lower(), 1)

        features = np.array([[hour, day_of_week, network, location, device_trust, sensitivity]])

        # decision_function yields higher values for inliers (positive), lower for outliers (negative)
        raw_score = float(self.model.decision_function(features)[0])

        # Normalize to 0.0 (completely normal) to 1.0 (highly anomalous)
        # Normal samples have raw_score ~ 0.12 - 0.20 -> anomaly_score ~ 0.0 - 0.10
        # Anomalous samples have raw_score ~ -0.10 to -0.25 -> anomaly_score ~ 0.80 - 1.0
        normalized_score = (0.14 - raw_score) / 0.30
        anomaly_score = float(np.clip(normalized_score, 0.0, 1.0))
        is_anomaly = bool(anomaly_score > 0.5)

        return {
            'anomalyScore': round(anomaly_score, 3),
            'isAnomaly': is_anomaly,
            'rawScore': round(raw_score, 4),
            'features': {
                'hour': hour,
                'network': network,
                'location': location,
                'deviceTrust': device_trust,
                'sensitivity': sensitivity
            }
        }

# Global singleton
model_instance = AnomalyModel()
