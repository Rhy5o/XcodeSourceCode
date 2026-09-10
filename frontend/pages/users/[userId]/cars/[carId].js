import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../../../../components/Navbar';
import ModList from '../../../../components/ModList';
import CommentSection from '../../../../components/CommentSection';
import { api, getToken } from '../../../../lib/api';

function Stat({ label, value }) {
    return (
        <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-100">{value}</dd>
        </div>
    );
}

export default function OtherUserCarDetail() {
    const router = useRouter();
    const { userId, carId } = router.query;

    const [car, setCar] = useState(null);
    const [mods, setMods] = useState([]);
    const [finalStats, setFinalStats] = useState(null);
    const [catalog, setCatalog] = useState(null);
    const [comments, setComments] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const [myCars, setMyCars] = useState([]);
    const [selectedMyCarId, setSelectedMyCarId] = useState('');

    useEffect(() => {
        if (!carId) return;
        setLoading(true);
        setError('');
        Promise.all([api.getCarWithMods(carId), api.getModCatalog(), api.getComments(carId)])
            .then(([carRes, catalogRes, commentsRes]) => {
                setCar(carRes.car);
                setMods(carRes.mods);
                setFinalStats(carRes.finalStats);
                setCatalog(catalogRes.catalog);
                setComments(commentsRes.comments);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));

        if (getToken()) {
            api.getGarage()
                .then((res) => setMyCars(res.cars))
                .catch(() => {});
        }
    }, [carId]);

    function handleCompare() {
        if (!selectedMyCarId) return;
        router.push(`/users/${userId}/cars/${carId}/compare?myCarId=${selectedMyCarId}`);
    }

    if (loading) {
        return (
            <div>
                <Navbar />
                <div className="flex justify-center py-16">
                    <div
                        className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-red-500"
                        role="status"
                        aria-label="Loading car"
                    />
                </div>
            </div>
        );
    }

    if (error || !car) {
        return (
            <div>
                <Navbar />
                <div className="mx-auto max-w-2xl px-4 py-8">
                    <p className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-400">
                        {error || 'Car not found'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Navbar />
            <div className="mx-auto max-w-2xl px-4 py-8 text-gray-100">
                <Link href={`/users/${userId}/garage`} className="text-sm text-gray-400 transition hover:text-gray-200">
                    ← Back to garage
                </Link>

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
                        <Stat label="BHP" value={finalStats.bhp} />
                        <Stat label="0-60" value={`${finalStats.zero_to_sixty}s`} />
                        <Stat label="Weight" value={`${finalStats.weight_kg}kg`} />
                        <Stat label="Handling" value={finalStats.handling_score} />
                        <Stat label="Grip" value={finalStats.grip_score} />
                        <Stat label="Engine" value={car.engine_size || '—'} />
                    </dl>

                    {getToken() && myCars.length > 0 && (
                        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-gray-700 bg-gray-900 p-4 sm:flex-row sm:items-center">
                            <select
                                value={selectedMyCarId}
                                onChange={(e) => setSelectedMyCarId(e.target.value)}
                                className="flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 focus:border-red-500 focus:outline-none"
                            >
                                <option value="">Select your car...</option>
                                {myCars.map((mc) => (
                                    <option key={mc.id} value={mc.id}>
                                        {mc.make} {mc.model} ({mc.reg_plate})
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={handleCompare}
                                disabled={!selectedMyCarId}
                                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Compare with my car
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-8">
                    <h2 className="text-lg font-semibold">Mods</h2>
                    <div className="mt-2">{catalog && <ModList mods={mods} catalog={catalog} />}</div>
                </div>

                <div className="mt-8">
                    <h2 className="text-lg font-semibold">Comments</h2>
                    <div className="mt-2">
                        <CommentSection
                            carId={carId}
                            carOwnerId={car.user_id}
                            comments={comments}
                            onCommentsChange={setComments}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
