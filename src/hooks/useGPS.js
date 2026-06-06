import { useState, useEffect, useRef, useCallback } from 'react';
import { gpsToMapPosition } from '../utils/gpsToMap';

const INTERVAL_MS = 5 * 60 * 1000;
const GEO_OPTIONS = { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 };

// active: controlled by parent (positionSource === 'gps')
// onPosition: called with { x: 'X%', y: 'Y%' } on each GPS fix
// onPermissionDenied: called when browser refuses access — parent should switch back to manual
export function useGPS({ active, onPosition, onPermissionDenied }) {
    const [accuracy, setAccuracy] = useState(null);
    const [error, setError] = useState(null);
    const intervalRef = useRef(null);
    const onPositionRef = useRef(onPosition);
    const onDeniedRef = useRef(onPermissionDenied);
    onPositionRef.current = onPosition;
    onDeniedRef.current = onPermissionDenied;

    const fetchPosition = useCallback(() => {
        if (!navigator.geolocation) {
            setError('GPS non disponible sur cet appareil');
            onDeniedRef.current?.();
            return;
        }
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                setAccuracy(coords.accuracy);
                setError(null);
                onPositionRef.current(gpsToMapPosition(coords.latitude, coords.longitude));
            },
            (err) => {
                setError(err.message);
                if (err.code === 1) onDeniedRef.current?.(); // PERMISSION_DENIED
            },
            GEO_OPTIONS
        );
    }, []);

    useEffect(() => {
        if (!active) {
            clearInterval(intervalRef.current);
            setAccuracy(null);
            setError(null);
            return;
        }
        fetchPosition();
        intervalRef.current = setInterval(fetchPosition, INTERVAL_MS);
        return () => clearInterval(intervalRef.current);
    }, [active, fetchPosition]);

    return { accuracy, error };
}
