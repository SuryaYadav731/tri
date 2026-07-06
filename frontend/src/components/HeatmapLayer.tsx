import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import 'leaflet.heat';
import L from 'leaflet';

interface HeatmapLayerProps {
    points: [number, number, number][]; // lat, lon, intensity
}

export const HeatmapLayer = ({ points }: HeatmapLayerProps) => {
    const map = useMap();

    useEffect(() => {
        if (!points || points.length === 0) return;

        // Leaflet.heat requires the global L to have heatLayer
        const heatLayer = (L as any).heatLayer(points, {
            radius: 40,
            blur: 25,
            maxZoom: 10,
            max: 1.0,
            gradient: {
                0.1: 'green',
                0.4: 'yellow',
                0.7: 'orange',
                1.0: 'red'
            }
        }).addTo(map);

        return () => {
            map.removeLayer(heatLayer);
        };
    }, [map, points]);

    return null;
};
