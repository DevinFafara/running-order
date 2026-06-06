import { useState, useEffect, useRef, useCallback } from 'react';
import { gpsToMapPosition } from '../utils/gpsToMap';

const INTERVAL_MS = 5 * 60 * 1000;
const GEO_OPTIONS = { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 };

// active: controlled by parent (positionSource === 'gps')
// onPosition: called with { x, y } (clamped) on each GPS fix — toujours appelé
// onPermissionDenied: called when browser refuses access — parent should switch back to manual
// rawPosition: position non clampée { x, y } pour calcul de distance réelle
export function useGPS({ active, onPosition, onPermissionDenied }) {
    const [accuracy, setAccuracy] = useState(null);
    const [inBounds, setInBounds] = useState(null);
    const [rawPosition, setRawPosition] = useState(null);
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
                const pos = gpsToMapPosition(coords.latitude, coords.longitude);
                setInBounds(pos.isInBounds);
                setRawPosition({ x: pos.rawX, y: pos.rawY });
                onPositionRef.current({ x: pos.x, y: pos.y }); // toujours mettre à jour
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
            setInBounds(null);
            setRawPosition(null);
            setError(null);
            return;
        }
        fetchPosition();
        intervalRef.current = setInterval(fetchPosition, INTERVAL_MS);
        return () => clearInterval(intervalRef.current);
    }, [active, fetchPosition]);

    return { accuracy, inBounds, rawPosition, error };
}
