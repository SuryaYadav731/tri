import math
from geographiclib.geodesic import Geodesic

def calculate_bearing_ray(lat, lon, bearing, distance_km=500):
    """Calculates the end point of a bearing ray."""
    geod = Geodesic.WGS84
    g = geod.Direct(lat, lon, bearing, distance_km * 1000)
    return g['lat2'], g['lon2']

def line_intersection(lat1, lon1, brg1, lat2, lon2, brg2):
    """
    Approximation for intersection of two bearing lines using local euclidean mapping.
    Valid for small distances. Returns (lat, lon) or None if no valid forward intersection.
    """
    # Convert bearing to math angle (0 is East, 90 is North)
    a1 = math.radians(90 - brg1)
    a2 = math.radians(90 - brg2)
    
    m1 = math.tan(a1)
    m2 = math.tan(a2)
    
    if abs(m1 - m2) < 1e-6:
        return None # Parallel lines
        
    # Treat lon as x, lat as y
    x1, y1 = lon1, lat1
    x2, y2 = lon2, lat2
    
    c1 = y1 - m1 * x1
    c2 = y2 - m2 * x2
    
    x_int = (c2 - c1) / (m1 - m2)
    y_int = m1 * x_int + c1
    
    # Check forward direction
    dx1, dy1 = x_int - x1, y_int - y1
    dx2, dy2 = x_int - x2, y_int - y2
    
    vx1, vy1 = math.cos(a1), math.sin(a1)
    vx2, vy2 = math.cos(a2), math.sin(a2)
    
    if (dx1 * vx1 + dy1 * vy1) < 0 or (dx2 * vx2 + dy2 * vy2) < 0:
        return None
        
    return y_int, x_int

def calculate_multi_intersection(stations):
    """
    Given a list of station reports, find the best intersection.
    For 3+ stations, calculate pairwise intersections and find the centroid.
    """
    if len(stations) < 2:
        return None
        
    intersections = []
    for i in range(len(stations)):
        for j in range(i + 1, len(stations)):
            s1 = stations[i]
            s2 = stations[j]
            pt = line_intersection(s1.lat, s1.lon, s1.doa, s2.lat, s2.lon, s2.doa)
            if pt:
                intersections.append(pt)
                
    if not intersections:
        return None
        
    # Calculate centroid
    avg_lat = sum(p[0] for p in intersections) / len(intersections)
    avg_lon = sum(p[1] for p in intersections) / len(intersections)
    
    return avg_lat, avg_lon
