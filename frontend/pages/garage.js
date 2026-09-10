import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import CarGrid from '../components/CarGrid';
import { api, getToken } from '../lib/api';

export default function Garage() {
    const router = useRouter();
    const [cars, setCars] = useState(null); // null = still loading
    const [error, setError] = useState('');
    const [activatingCarId, setActivatingCarId] = useState(null);

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
                    <button
                        onClick={() => setShowRegisterForm((s) => !s)}
                        className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
                    >
                        Register New Car
                    </button>
                </div>

                {showRegisterForm && (
                    <form
                        onSubmit={handleRegister}
                        className="mt-4 flex flex-col gap-2 rounded-xl border border-gray-700 bg-gray-900 p-4 sm:flex-row sm:items-center"
                    >
                        <input
                            className="flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-red-500 focus:outline-none"
                            placeholder="UK reg plate e.g. AB12 CDE"
                            value={regPlate}
                            onChange={(e) => setRegPlate(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            disabled={registering}
                            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {registering ? 'Looking up DVLA...' : 'Register'}
                        </button>
                    </form>
                )}
                {registerError && <p className="mt-2 text-sm text-red-400">{registerError}</p>}

                <div className="mt-6">
                    {error && (
                        <p className="mb-4 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">{error}</p>
                    )}

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
