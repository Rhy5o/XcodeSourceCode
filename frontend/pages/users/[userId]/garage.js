import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import FollowButton from '../../../components/FollowButton';
import { api, getToken, getUser } from '../../../lib/api';

export default function PublicGarage() {
    const router = useRouter();
    const { userId } = router.query;

    const [user, setUser] = useState(null);
    const [cars, setCars] = useState(null);
    const [error, setError] = useState('');
    const [isFollowing, setIsFollowing] = useState(false);

    const viewer = getToken() ? getUser() : null;

    useEffect(() => {
        if (!userId) return;
        setError('');
        api.getUserGarage(userId)
            .then((res) => {
                setUser(res.user);
                setCars(res.cars);
            })
            .catch((err) => setError(err.message));

        if (viewer && viewer.id !== userId) {
            api.getUserProfile(userId)
                .then((res) => setIsFollowing(res.viewerIsFollowing))
                .catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    if (error) {
        return (
            <div>
                <Navbar />
                <div className="mx-auto max-w-4xl px-4 py-8">
                    <p className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Navbar />
            <div className="mx-auto max-w-4xl px-4 py-8 text-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">{user ? `${user.username}'s Garage` : 'Garage'}</h1>
                        {user && (
                            <Link href={`/users/${user.id}`} className="text-sm text-gray-400 hover:text-gray-200">
                                ← Back to profile
                            </Link>
                        )}
                    </div>
                    {viewer && user && viewer.id !== user.id && (
                        <FollowButton userId={user.id} initialFollowing={isFollowing} />
                    )}
                </div>

                {cars === null && (
                    <div className="flex justify-center py-16">
                        <div
                            className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-red-500"
                            role="status"
                            aria-label="Loading garage"
                        />
                    </div>
                )}

                {cars && cars.length === 0 && <p className="mt-6 text-sm text-gray-500">No cars registered yet.</p>}

                {cars && cars.length > 0 && (
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {cars.map((car) => (
                            <button
                                key={car.id}
                                onClick={() => router.push(`/users/${userId}/cars/${car.id}`)}
                                className={`rounded-xl border p-4 text-left transition hover:border-gray-500 ${
                                    car.is_active ? 'border-emerald-500 bg-emerald-950/20' : 'border-gray-700 bg-gray-900'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="font-semibold text-gray-100">
                                            {car.make} {car.model}
                                        </h3>
                                        <p className="text-xs text-gray-400">{car.reg_plate}</p>
                                    </div>
                                    {car.is_active && (
                                        <span className="whitespace-nowrap rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                                            At The Show
                                        </span>
                                    )}
                                </div>
                                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <dt className="text-gray-500">BHP</dt>
                                        <dd className="text-gray-200">{car.bhp}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">0-60</dt>
                                        <dd className="text-gray-200">{car.zero_to_sixty}s</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Mods</dt>
                                        <dd className="text-gray-200">{car.mod_count}</dd>
                                    </div>
                                </dl>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
