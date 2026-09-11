import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import CarGrid from '../components/CarGrid';
import RetryBanner from '../components/RetryBanner';
import { api, getToken } from '../lib/api';

export default function Garage() {
    const router = useRouter();
    const [cars, setCars] = useState(null); // null = still loading
    const [error, setError] = useState('');
    const [activatingCarId, setActivatingCarId] = useState(null);
    const [isUserOnline, setIsUserOnline] = useState(false);

    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [regPlate, setRegPlate] = useState('');
    const [registering, setRegistering] = useState(false);
    const [registerError, setRegisterError] = useState('');

    useEffect(() => {
        if (!getToken()) {
            router.replace('/login');
            return;
        }
        loadGarage();
        api.getShowStatus()
            .then((res) => setIsUserOnline(res.isUserOnline))
            .catch(() => {});
    }, [router]);

    function loadGarage() {
        setError('');
        api.getGarage()
            .then((res) => setCars(res.cars))
            .catch((err) => setError(err.message));
    }

    async function handleActivate(carId) {
        setActivatingCarId(carId);
        setError('');
        try {
            await api.activateCar(carId);
            setCars((prev) => prev.map((c) => ({ ...c, is_active: c.id === carId })));
        } catch (err) {
            setError(err.message);
        } finally {
            setActivatingCarId(null);
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        setRegisterError('');
        setRegistering(true);
        try {
            const { car } = await api.registerCar(regPlate);
            setCars((prev) => (prev ? [car, ...prev] : [car]));
            setRegPlate('');
            setShowRegisterForm(false);
        } catch (err) {
            setRegisterError(err.message);
        } finally {
            setRegistering(false);
        }
    }

    return (
        <div>
            <Navbar />
            <div className="mx-auto max-w-5xl px-4 py-8 text-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-bold">Garage</h1>
                    <div className="flex gap-2">
                        <Link
                            href="/show"
                            className="inline-flex min-h-[44px] items-center rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:border-gray-500"
                        >
                            Go to Show
                        </Link>
                        <button
                            onClick={() => setShowRegisterForm((s) => !s)}
                            className="min-h-[44px] rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
                        >
                            Register New Car
                        </button>
                    </div>
                </div>

                {isUserOnline && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        You&apos;re online — your active car is racing at the show.
                    </div>
                )}

                {showRegisterForm && (
                    <form
                        onSubmit={handleRegister}
                        className="mt-4 flex flex-col gap-2 rounded-xl border border-gray-700 bg-gray-900 p-4 sm:flex-row sm:items-center"
                    >
                        <label className="sr-only" htmlFor="reg-plate-input">
                            UK reg plate
                        </label>
                        <input
                            id="reg-plate-input"
                            className="min-h-[44px] flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-red-500 focus:outline-none"
                            placeholder="UK reg plate e.g. AB12 CDE"
                            aria-label="UK reg plate"
                            value={regPlate}
                            onChange={(e) => setRegPlate(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            disabled={registering}
                            className="min-h-[44px] rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {registering ? 'Looking up DVLA...' : 'Register'}
                        </button>
                    </form>
                )}
                {registerError && <p className="mt-2 text-sm text-red-400">{registerError}</p>}

                <div className="mt-6">
                    {error && <RetryBanner message={error} onRetry={loadGarage} />}

                    {cars === null && !error && (
                        <div className="flex justify-center py-16">
                            <div
                                className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-red-500"
                                role="status"
                                aria-label="Loading garage"
                            />
                        </div>
                    )}

                    {cars !== null && cars.length === 0 && (
                        <div className="rounded-xl border border-gray-700 bg-gray-900 p-8 text-center">
                            <p className="text-gray-300">No cars registered yet.</p>
                            <button
                                onClick={() => setShowRegisterForm(true)}
                                className="mt-3 text-sm font-semibold text-red-400 hover:underline"
                            >
                                Register your first car
                            </button>
                        </div>
                    )}

                    {cars && cars.length > 0 && (
                        <CarGrid cars={cars} onActivate={handleActivate} activatingCarId={activatingCarId} />
                    )}
                </div>
            </div>
        </div>
    );
}
