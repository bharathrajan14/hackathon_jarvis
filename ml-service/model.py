import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

# Feature list:
# 1. request_frequency (req/min: normal 1-15, spike 40-150)
# 2. failed_request_count (0-2 normal, 5-20 abnormal)
# 3. resource_access_frequency (1-5 normal, 15-40 abnormal)
# 4. download_frequency (0-2 normal, 8-30 abnormal)
# 5. export_frequency (0-1 normal, 5-20 abnormal)
# 6. restricted_website_attempts (0 normal, 1-6 abnormal)
# 7. new_device (0=trusted, 1=new/unknown)
# 8. network_change (0=corporate, 1=public, 2=unknown/vpn)
# 9. location_change (0=office/known, 1=near, 2=far/unusual)
# 10. unusual_time (0=normal 9am-6pm, 1=after-hours, 2=night/critical)
# 11. sensitive_action (0=read/view low, 1=medium, 2=high, 3=critical delete/export)
# 12. session_age (minutes: normal 10-180, abnormal 0 or >480)

class BehavioralAnomalyModel:
    def __init__(self):
        self.model = None
        self._train()

    def _generate_synthetic_behavior(self):
        np.random.seed(42)
        n_normal = 2500
        n_anomalies = 150

        # Normal business activity:
        normal_req_freq = np.random.uniform(1.0, 15.0, size=n_normal)
        normal_failed_req = np.random.choice([0, 1, 2], size=n_normal, p=[0.85, 0.12, 0.03])
        normal_res_freq = np.random.uniform(1.0, 5.0, size=n_normal)
        normal_dl_freq = np.random.choice([0, 1, 2], size=n_normal, p=[0.75, 0.20, 0.05])
        normal_exp_freq = np.random.choice([0, 1], size=n_normal, p=[0.95, 0.05])
        normal_web_att = np.zeros(n_normal)
        normal_device = np.zeros(n_normal)
        normal_network = np.random.choice([0, 1], size=n_normal, p=[0.90, 0.10])
        normal_location = np.random.choice([0, 1], size=n_normal, p=[0.92, 0.08])
        normal_time = np.random.choice([0, 1], size=n_normal, p=[0.88, 0.12])
        normal_sens = np.random.choice([0, 1, 2], size=n_normal, p=[0.60, 0.30, 0.10])
        normal_age = np.random.uniform(10.0, 180.0, size=n_normal)

        normal_df = pd.DataFrame({
            'request_frequency': normal_req_freq,
            'failed_request_count': normal_failed_req,
            'resource_access_frequency': normal_res_freq,
            'download_frequency': normal_dl_freq,
            'export_frequency': normal_exp_freq,
            'restricted_website_attempts': normal_web_att,
            'new_device': normal_device,
            'network_change': normal_network,
            'location_change': normal_location,
            'unusual_time': normal_time,
            'sensitive_action': normal_sens,
            'session_age': normal_age
        })

        # Anomalous activity (attacks, credential stuffing, bulk exfiltration):
        anomaly_req_freq = np.random.uniform(40.0, 150.0, size=n_anomalies)
        anomaly_failed_req = np.random.uniform(4.0, 20.0, size=n_anomalies)
        anomaly_res_freq = np.random.uniform(15.0, 50.0, size=n_anomalies)
        anomaly_dl_freq = np.random.uniform(6.0, 30.0, size=n_anomalies)
        anomaly_exp_freq = np.random.uniform(3.0, 15.0, size=n_anomalies)
        anomaly_web_att = np.random.uniform(1.0, 7.0, size=n_anomalies)
        anomaly_device = np.ones(n_anomalies)
        anomaly_network = np.random.choice([1, 2], size=n_anomalies, p=[0.30, 0.70])
        anomaly_location = np.random.choice([1, 2], size=n_anomalies, p=[0.20, 0.80])
        anomaly_time = np.random.choice([1, 2], size=n_anomalies, p=[0.30, 0.70])
        anomaly_sens = np.random.choice([2, 3], size=n_anomalies, p=[0.40, 0.60])
        anomaly_age = np.random.uniform(1.0, 600.0, size=n_anomalies)

        anomaly_df = pd.DataFrame({
            'request_frequency': anomaly_req_freq,
            'failed_request_count': anomaly_failed_req,
            'resource_access_frequency': anomaly_res_freq,
            'download_frequency': anomaly_dl_freq,
            'export_frequency': anomaly_exp_freq,
            'restricted_website_attempts': anomaly_web_att,
            'new_device': anomaly_device,
            'network_change': anomaly_network,
            'location_change': anomaly_location,
            'unusual_time': anomaly_time,
            'sensitive_action': anomaly_sens,
            'session_age': anomaly_age
        })

        return pd.concat([normal_df, anomaly_df], ignore_index=True)

    def _train(self):
        data = self._generate_synthetic_behavior()
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.06,
            random_state=42
        )
        self.model.fit(data)
        print("[AI Engine] Behavioral Isolation Forest trained on 12 security features.")

    def predict(self, context: dict):
        # Extract features with sensible defaults
        req_freq = float(context.get('request_frequency') or context.get('requestFrequency') or 5.0)
        failed_count = float(context.get('failed_request_count') or context.get('failedRequests') or 0.0)
        res_freq = float(context.get('resource_access_frequency') or context.get('resourceAccessFrequency') or 2.0)
        dl_freq = float(context.get('download_frequency') or context.get('downloadFrequency') or 0.0)
        exp_freq = float(context.get('export_frequency') or context.get('exportFrequency') or 0.0)
        web_att = float(context.get('restricted_website_attempts') or context.get('websiteAttempts') or 0.0)

        # Device
        device_raw = str(context.get('device') or context.get('deviceTrust') or 'trusted').lower()
        new_device = 1.0 if ('unknown' in device_raw or 'untrusted' in device_raw or context.get('newDevice')) else 0.0

        # Network
        net_raw = str(context.get('network') or 'corporate').lower()
        if 'office' in net_raw or 'corp' in net_raw:
            network_change = 0.0
        elif 'public' in net_raw:
            network_change = 1.0
        else:
            network_change = 2.0

        # Location
        loc_raw = str(context.get('location') or 'known').lower()
        if 'office' in loc_raw or 'known' in loc_raw:
            location_change = 0.0
        elif 'near' in loc_raw:
            location_change = 1.0
        else:
            location_change = 2.0

        # Time
        time_raw = str(context.get('timeOfDay') or context.get('time') or 'normal').lower()
        hour = context.get('hour')
        if hour is not None:
            h = int(hour)
            if 9 <= h <= 18:
                unusual_time = 0.0
            elif 6 <= h < 9 or 18 < h <= 22:
                unusual_time = 1.0
            else:
                unusual_time = 2.0
        elif 'night' in time_raw or 'critical' in time_raw or 'unusual' in time_raw:
            unusual_time = 2.0
        elif 'after' in time_raw:
            unusual_time = 1.0
        else:
            unusual_time = 0.0

        # Sensitive action
        act = str(context.get('action') or 'VIEW').upper()
        sens = str(context.get('resourceSensitivity') or context.get('sensitivity') or 'LOW').upper()
        if act in ['DELETE', 'EXPORT'] or sens == 'CRITICAL':
            sensitive_action = 3.0
        elif act in ['DOWNLOAD', 'UPDATE', 'CREATE'] or sens == 'HIGH':
            sensitive_action = 2.0
        elif sens == 'MEDIUM':
            sensitive_action = 1.0
        else:
            sensitive_action = 0.0

        session_age = float(context.get('session_age') or context.get('sessionAge') or 30.0)

        features = np.array([[
            req_freq,
            failed_count,
            res_freq,
            dl_freq,
            exp_freq,
            web_att,
            new_device,
            network_change,
            location_change,
            unusual_time,
            sensitive_action,
            session_age
        ]])

        raw_score = float(self.model.decision_function(features)[0])

        # Baseline decision_function: inliers ~ +0.10 to +0.20, outliers ~ -0.05 to -0.25
        # Map raw_score to 0 - 100 anomaly score
        normalized = (0.15 - raw_score) / 0.32
        anomaly_score = int(np.clip(round(normalized * 100), 0, 100))

        # Explicit heuristic boosts for prominent attack scenarios:
        if web_att >= 1:
            anomaly_score = max(anomaly_score, min(100, 35 + int(web_att * 12)))
        if req_freq >= 40:
            anomaly_score = max(anomaly_score, 75)
        if failed_count >= 5:
            anomaly_score = max(anomaly_score, 80)
        if sensitive_action >= 3 and (new_device or network_change >= 1):
            anomaly_score = max(anomaly_score, 68)

        is_anomaly = anomaly_score >= 50

        return {
            'anomalyScore': anomaly_score,
            'isAnomaly': is_anomaly,
            'rawScore': round(raw_score, 4),
            'features': {
                'requestFrequency': req_freq,
                'failedRequests': failed_count,
                'resourceFrequency': res_freq,
                'downloadFrequency': dl_freq,
                'exportFrequency': exp_freq,
                'websiteAttempts': web_att,
                'newDevice': bool(new_device),
                'networkChange': network_change,
                'locationChange': location_change,
                'unusualTime': unusual_time,
                'sensitiveAction': sensitive_action,
                'sessionAge': session_age
            }
        }

model_instance = BehavioralAnomalyModel()
