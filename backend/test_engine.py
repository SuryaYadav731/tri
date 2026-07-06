import pytest
import math
from triangulation_engine import least_squares_intersection
from models import DFStationReport

def test_true_bearing_intersection():
    # Simulate two stations
    # Station 1 at Origin (0,0) with true bearing 45 degrees
    # Station 2 at (10, 0) with true bearing 315 degrees
    # They should intersect at (5, 5) approximately in flat earth.
    # We'll use Lat/Lon 0,0 and 1,0.
    
    reports = [
        DFStationReport(system_id="S1", lat=0.0, lon=0.0, freq=100.0, doa=45.0, true_bearing=45.0, timestamp=1.0),
        DFStationReport(system_id="S2", lat=0.0, lon=1.0, freq=100.0, doa=315.0, true_bearing=315.0, timestamp=1.0)
    ]
    
    pt, conf, err = least_squares_intersection(reports)
    assert pt is not None
    # Check intersection point. Since the sphere is slightly distorted near the equator,
    # the exact lat/lon intersection of two geodesic lines at 45 and 315 degrees from (0,0) and (0,1)
    # is exactly lon=0.5, lat>0.
    assert math.isclose(pt[1], 0.5, abs_tol=0.05)
    assert pt[0] > 0
    assert conf > 50.0

def test_no_intersection():
    # Divergent lines
    reports = [
        DFStationReport(system_id="S1", lat=0.0, lon=0.0, freq=100.0, doa=270.0, true_bearing=270.0, timestamp=1.0),
        DFStationReport(system_id="S2", lat=0.0, lon=1.0, freq=100.0, doa=90.0, true_bearing=90.0, timestamp=1.0)
    ]
    pt, conf, err = least_squares_intersection(reports)
    if pt is not None:
        assert conf < 50.0

def test_single_report():
    reports = [
        DFStationReport(system_id="S1", lat=0.0, lon=0.0, freq=100.0, doa=45.0, true_bearing=45.0, timestamp=1.0)
    ]
    pt, conf, err = least_squares_intersection(reports)
    assert pt is None
    assert conf == 0.0
