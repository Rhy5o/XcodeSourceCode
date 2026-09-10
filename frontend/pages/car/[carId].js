import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { api, getToken } from '../../lib/api';

function Stat({ label, value }) {
    return (
        <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-100">{value}</dd>
        </div>
    );
}

export default function CarDetail() {
    const router = useRouter();
    const { carId } = router.query;

    const [car, setCar] = useState(null);
    const [mods, setMods] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [activating, setActivating] = useState(false);

    useEffect(() => {
        if (!getToken()) {
            router.replace('/login');
            return;
        }
        if (!carId) return;

        setLoading(true);
        setError('');
        api.getCarDetail(carId)
            .then((res) => {
                setCar(res.car);
                setMods(res.mods || []);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [carId, router]);

    async function handleActivate() {
        setActivating(true);
        setError('');
        try {
            const { car: updated } = await api.activateCar(carId);
            setCar(updated);
        } catch (err) {
            setError(err.message);
        } finally {
            setActivating(false);
        }
    }

    return (
        <div>
            <Navbar />
            <div className="mx-auto max-w-2xl px-4 py-8 text-gray-100">
                <Link href="/garage" className="text-sm text-gray-400 transition hover:text-gray-200">
                    ← Back to Garage
                </Link>

                {loading && (
                    <div className="flex justify-center py-16">
                        <div
                            className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-red-500"
                            role="status"
                            aria-label="Loading car"
                        />
                    </div>
                )}

                {!loading && error && (
                    <p className="mt-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-400">{error}</p>
                )}

                {!loading && car && (
                    <div className="mt-6">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h1 className="text-2xl font-bold">
                                    {car.make} {car.model}
                                </h1>
                                <p className="text-sm text-gray-400">{car.reg_plate}</p>
                            </div>
                            {car.is_active && (
                                <span className="whitespace-nowrap rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                                    At The Show
                                </span>
                            )}
                        </div>

                        <dl className="mt-6 grid grid-cols-2 gap-5 rounded-xl border border-gray-700 bg-gray-900 p-5 sm:grid-cols-3">
                            <Stat label="BHP" value={car.bhp} />
                            <Stat label="0-60" value={`${car.zero_to_sixty}s`} />
                            <Stat label="Weight" value={`${car.weight_kg}kg`} />
                            <Stat label="Engine" value={car.engine_size || '—'} />
                            <Stat label="Fuel" value={car.fuel_type || '—'} />
                            <Stat label="Top Speed" value={car.top_speed_mph ? `${car.top_speed_mph}mph` : '—'} />
                        </dl>

                        {!car.is_active && (
                            <button
                                onClick={handleActivate}
                                disabled={activating}
                                className="mt-4 w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                            >
                                {activating ? 'Taking to the show...' : 'Take to the Show'}
                            </button>
                        )}

                        <div className="mt-8 rounded-xl border border-dashed border-gray-700 p-5 text-center text-sm text-gray-500">
                            Mods coming in Stage 4 — {mods.length > 0 ? `${mods.length} mod(s) already applied` : 'no mods yet'}.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
