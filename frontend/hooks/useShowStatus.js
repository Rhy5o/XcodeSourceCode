import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

/**
 * Polls GET /api/show/status on an interval (this is also what naturally
 * "re-fetches match results when a new race completes" — the next poll
 * after a cron cycle just picks up the updated lastMatchResult) and keeps
 * a smooth 1-second countdown to the next race, resynced from the server's
 * nextRaceIn on every poll rather than drifting from local decrementing.
 */
export function useShowStatus(pollIntervalMs = 2500) {
    const [status, setStatus] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [secondsLeft, setSecondsLeft] = useState(null);
    const nextRaceAtRef = useRef(null);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await api.getShowStatus();
            setStatus(res);
            nextRaceAtRef.current = Date.now() + res.nextRaceIn * 1000;
            setSecondsLeft(res.nextRaceIn);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const pollId = setInterval(fetchStatus, pollIntervalMs);
        return () => clearInterval(pollId);
    }, [fetchStatus, pollIntervalMs]);

    useEffect(() => {
        const tickId = setInterval(() => {
            if (nextRaceAtRef.current === null) return;
            setSecondsLeft(Math.max(0, Math.round((nextRaceAtRef.current - Date.now()) / 1000)));
        }, 1000);
        return () => clearInterval(tickId);
    }, []);

    async function goOnline() {
        await api.goOnline();
        await fetchStatus();
    }

    async function goOffline() {
        await api.goOffline();
        await fetchStatus();
    }

    return { status, error, loading, secondsLeft, goOnline, goOffline, refetch: fetchStatus };
}
