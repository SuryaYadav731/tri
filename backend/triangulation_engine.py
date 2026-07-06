import numpy as np
from scipy.optimize import least_squares
from models import DFStationReport
from geographiclib.geodesic import Geodesic
import time

# Time tolerance for correlation in seconds
TIME_TOLERANCE = 3.0
# Freq tolerance in MHz (10 kHz = 0.01 MHz)
FREQ_TOLERANCE = 0.01

def group_reports_by_frequency(reports):
    """Group reports into distinct emitters based on frequency proximity and time."""
    groups = []
    current_time = time.time()
    for report in reports:
        if report.timestamp is not None and (current_time - report.timestamp) > TIME_TOLERANCE:
            continue
            
        placed = False
        for group in groups:
            avg_freq = sum(r.freq for r in group) / len(group)
            
            if abs(report.freq - avg_freq) <= FREQ_TOLERANCE:
                group.append(report)
                placed = True
                break
        if not placed:
            groups.append([report])
    return groups

def compute_confidence(mse, gdop, avg_power, avg_snr, time_diff):
    # Base confidence from MSE (angular error)
    conf = max(0.0, 100.0 - (mse * 2.0))
    
    # Geometry penalty
    if gdop > 5.0:
        conf -= (gdop - 5.0) * 2.0
        
    # Power & SNR bonus/penalty
    if avg_power > -50: conf += 5
    elif avg_power < -100: conf -= 10
    
    if avg_snr > 20: conf += 5
    elif avg_snr < 5: conf -= 10
    
    # Time sync penalty
    if time_diff > 1.0:
        conf -= (time_diff * 5.0)
        
    return max(0.0, min(100.0, conf))

def least_squares_intersection(reports):
    """
    Calculate the best intersection point using least squares.
    Minimizes the sum of squared angular errors using True Bearing.
    """
    if len(reports) < 3:
        return None
        
    def angular_error(target, reports):
        t_lat, t_lon = target
        errors = []
        geod = Geodesic.WGS84
        for r in reports:
            g = geod.Inverse(r.lat, r.lon, t_lat, t_lon)
            azi = g['azi1']
            if azi < 0: azi += 360
            
            # Use true_bearing instead of raw DOA
            tb = r.true_bearing if r.true_bearing is not None else r.doa
            diff = abs(azi - tb)
            if diff > 180:
                diff = 360 - diff
            errors.append(diff)
        return errors

    guess_lat = sum(r.lat for r in reports) / len(reports)
    guess_lon = sum(r.lon for r in reports) / len(reports)
    
    geod = Geodesic.WGS84
    tb0 = reports[0].true_bearing if reports[0].true_bearing is not None else reports[0].doa
    g = geod.Direct(reports[0].lat, reports[0].lon, tb0, 10000)
    guess = [g['lat2'], g['lon2']]
    
    result = least_squares(angular_error, guess, args=(reports,), method='lm')
    
    if result.success:
        t_lat, t_lon = result.x
        mse = np.mean(result.fun**2)
        error_radius = max(50.0, mse * 50.0) # Estimated CEP in meters
        
        angles = [r.true_bearing if r.true_bearing is not None else r.doa for r in reports]
        max_angle_diff = max(angles) - min(angles)
        if max_angle_diff > 180: max_angle_diff = 360 - max_angle_diff
        
        gdop = 1.0 / (np.sin(np.radians(max_angle_diff)) + 0.1)
        
        avg_power = sum(r.signal_power or -100 for r in reports) / len(reports)
        avg_snr = sum(r.snr or 0 for r in reports) / len(reports)
        
        timestamps = [r.timestamp or time.time() for r in reports]
        time_diff = max(timestamps) - min(timestamps)
        
        confidence = compute_confidence(mse, gdop, avg_power, avg_snr, time_diff)
        
        distances = {}
        bearings = {}
        for r in reports:
            g_dist = geod.Inverse(r.lat, r.lon, t_lat, t_lon)
            distances[r.system_id] = g_dist['s12'] / 1000.0 # km
            brg = g_dist['azi1']
            if brg < 0: brg += 360
            bearings[r.system_id] = brg

        return {
            "lat": t_lat,
            "lon": t_lon,
            "confidence": confidence,
            "error_radius": error_radius,
            "ellipse_a": error_radius * 1.5,
            "ellipse_b": error_radius * 0.5,
            "ellipse_angle": max_angle_diff / 2.0,
            "gdop": float(gdop),
            "geometry_score": min(100.0, max(0.0, 100.0 - (gdop * 10))),
            "intersection_angle": float(max_angle_diff),
            "estimated_accuracy": max(1.0, 100.0 - (error_radius / 100.0)),
            "distances": distances,
            "bearings": bearings
        }
    return None

class KalmanTracker:
    def __init__(self, lat, lon):
        self.lat = lat
        self.lon = lon
        self.v_lat = 0.0
        self.v_lon = 0.0
        self.last_update = time.time()
        self.history = []

    def update(self, new_lat, new_lon, dt):
        alpha = 0.4
        beta = 0.1
        
        pred_lat = self.lat + self.v_lat * dt
        pred_lon = self.lon + self.v_lon * dt
        
        res_lat = new_lat - pred_lat
        res_lon = new_lon - pred_lon
        
        self.lat = pred_lat + alpha * res_lat
        self.lon = pred_lon + alpha * res_lon
        
        if dt > 0:
            self.v_lat = self.v_lat + (beta * res_lat) / dt
            self.v_lon = self.v_lon + (beta * res_lon) / dt
            
        self.history.append((self.lat, self.lon))
        if len(self.history) > 100:
            self.history.pop(0)
            
        return self.lat, self.lon

trackers = {}

def apply_kalman_filter(track_id, current_lat, current_lon, dt):
    if track_id not in trackers:
        trackers[track_id] = KalmanTracker(current_lat, current_lon)
        return current_lat, current_lon
    
    return trackers[track_id].update(current_lat, current_lon, dt)

def classify_threat(freq_mhz: float, power: float, confidence: float, speed: float) -> str:
    """Classify the Threat Level based on RF characteristics."""
    if confidence > 90 and speed > 50:
        return "CRITICAL"
        
    if power > -40:
        return "HIGH"
        
    if confidence > 80 and (136 <= freq_mhz <= 174 or 400 <= freq_mhz <= 470):
        return "MEDIUM"
        
    if (2400 <= freq_mhz <= 2483.5) or (5725 <= freq_mhz <= 5850):
        return "MEDIUM"
        
    return "LOW"

