import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import ModList from '../../components/ModList';
import ModUploadForm from '../../components/ModUploadForm';
import { api, getToken } from '../../lib/api';

function Stat({ label, value, boosted = false }) {
    return (
        <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
            <dd className={`mt-1 text-lg font-semibold ${boosted ? 'text-emerald-400' : 'text-gray-100'}`}>{value}</dd>
        </div>
    );
}

export default function CarDetail() {
    const router = useRouter();
    const { carId } = router.query;

    const [car, setCar] = useState(null);
    const [mods, setMods] = useState([]);
    const [finalStats, setFinalStats] = useState(null);
    const [catalog, setCatalog] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [activating, setActivating] = useState(false);
    const [deletingModId, setDeletingModId] = useState(null);

    const loadCar = useCallback(() => {
        if (!carId) return Promise.resolve();
        return api.getCarWithMods(carId).then((res) => {
            setCar(res.car);
            setMods(res.mods || []);
            setFinalStats(res.finalStats || null);
        });
    }, [carId]);

    useEffect(() => {
        if (!getToken()) {
            router.replace('/login');
            return;
        }
        if (!carId) return;

        setLoading(true);
        setError('');
        Promise.all([loadCar(), api.getModCatalog().then((res) => setCatalog(res.catalog))])
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [carId, router, loadCar]);

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

    async function handleAddMod({ modType, description, file }) {
        await api.addMod(carId, modType, description, file);
        await loadCar();
    }

    async function handleDeleteMod(modId) {
        setDeletingModId(modId);
        setError('');
        try {
            await api.deleteMod(modId);
            await loadCar();
        } catch (err) {
            setError(err.message);
        } finally {
            setDeletingModId(null);
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
                    <div className="mt-6 flex flex-col gap-8">
                        <div>
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

                            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                {finalStats ? 'Final stats (base + mods)' : 'Stats'}
                            </p>
                            <dl className="mt-2 grid grid-cols-2 gap-5 rounded-xl border border-gray-700 bg-gray-900 p-5 sm:grid-cols-3">
                                <Stat label="BHP" value={finalStats ? finalStats.bhp : car.bhp} boosted={finalStats && finalStats.bhp !== car.bhp} />
                                <Stat
                                    label="0-60"
                                    value={`${finalStats ? finalStats.zero_to_sixty : car.zero_to_sixty}s`}
                                    boosted={finalStats && finalStats.zero_to_sixty !== Number(car.zero_to_sixty)}
                                />
                                <Stat label="Weight" value={`${car.weight_kg}kg`} />
                                <Stat
                                    label="Handling"
                                    value={finalStats ? finalStats.handling_score : car.handling_score}
                                    boosted={finalStats && finalStats.handling_score !== car.handling_score}
                                />
                                <Stat
                                    label="Grip"
                                    value={finalStats ? finalStats.grip_score : car.grip_score}
                                    boosted={finalStats && finalStats.grip_score !== car.grip_score}
                                />
                                <Stat label="Engine" value={car.engine_size || '—'} />
                                <Stat label="Fuel" value={car.fuel_type || '—'} />
                                <Stat label="Top Speed" value={car.top_speed_mph ? `${car.top_speed_mph}mph` : '—'} />
                            </dl>
                            {finalStats && (
                                <p className="mt-2 text-xs text-gray-500">
                                    Base BHP {car.bhp} · 0-60 {car.zero_to_sixty}s · Handling {car.handling_score} · Grip{' '}
                                    {car.grip_score} (green values above include mod bonuses)
                                </p>
                            )}

                            {!car.is_active && (
                                <button
                                    onClick={handleActivate}
                                    disabled={activating}
                                    className="mt-4 w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                >
                                    {activating ? 'Taking to the show...' : 'Take to the Show'}
                                </button>
                            )}
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold">Mods</h2>
                            <div className="mt-3">
                                {catalog && (
                                    <ModList
                                        mods={mods}
                                        catalog={catalog}
                                        canDelete
                                        onDelete={handleDeleteMod}
                                        deletingModId={deletingModId}
                                    />
                                )}
                            </div>

                            {catalog && (
                                <div className="mt-4">
                                    <ModUploadForm catalog={catalog} onSubmit={handleAddMod} />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
