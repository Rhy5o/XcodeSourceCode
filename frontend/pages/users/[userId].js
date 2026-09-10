import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import UserStats from '../../components/UserStats';
import BadgeGrid from '../../components/BadgeGrid';
import MatchCard from '../../components/MatchCard';
import { api } from '../../lib/api';

function formatJoinDate(dateString) {
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function UserProfile() {
    const router = useRouter();
    const { userId } = router.query;

    const [profile, setProfile] = useState(null);
    const [badges, setBadges] = useState(null);
    const [matches, setMatches] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        setError('');
        Promise.all([
            api.getUserProfile(userId),
            api.getUserBadges(userId),
            api.getUserMatches(userId, 10)
        ])
            .then(([profileRes, badgesRes, matchesRes]) => {
                setProfile(profileRes);
                setBadges(badgesRes.badges);
                setMatches(matchesRes.matches);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [userId]);

    if (loading) {
        return (
            <div>
                <Navbar />
                <div className="flex justify-center py-16">
                    <div
                        className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-red-500"
                        role="status"
                        aria-label="Loading profile"
                    />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <Navbar />
                <div className="mx-auto max-w-2xl px-4 py-8">
                    <p className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-400">{error}</p>
                </div>
            </div>
        );
    }

    if (!profile) return null;
    const { user, allTime, currentSeason, topCars } = profile;

    return (
        <div>
            <Navbar />
            <div className="mx-auto max-w-3xl px-4 py-8 text-gray-100">
                <div className="rounded-xl border border-gray-700 bg-gray-900 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold">{user.username}</h1>
                            <p className="text-sm text-gray-400">Joined {formatJoinDate(user.created_at)}</p>
                        </div>
                        {currentSeason.rank && (
                            <span className="rounded-full bg-red-500/20 px-3 py-1 text-sm font-semibold text-red-400">
                                #{currentSeason.rank} this season
                            </span>
                        )}
                    </div>
                </div>

                <div className="mt-6">
                    <UserStats
                        title="All-time stats"
                        totalXp={allTime.total_xp}
                        wins={allTime.wins}
                        losses={allTime.losses}
                        winRate={allTime.winRate}
                        rank={null}
                    />
                </div>

                <div className="mt-6">
                    <UserStats
                        title="This season"
                        totalXp={currentSeason.total_xp}
                        wins={currentSeason.wins}
                        losses={currentSeason.losses}
                        winRate={currentSeason.winRate}
                        rank={currentSeason.rank}
                    />
                </div>

                <div className="mt-8">
                    <h2 className="text-lg font-semibold">Badges</h2>
                    <div className="mt-2">
                        <BadgeGrid badges={badges} />
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="text-lg font-semibold">Top cars</h2>
                    {topCars.length === 0 ? (
                        <p className="mt-2 text-sm text-gray-500">No cars yet.</p>
                    ) : (
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {topCars.map((car) => (
                                <div key={car.id} className="rounded-xl border border-gray-700 bg-gray-900 p-3">
                                    <p className="font-semibold text-gray-100">
                                        {car.make} {car.model}
                                    </p>
                                    <p className="text-xs text-gray-400">{car.reg_plate}</p>
                                    <p className="mt-1 text-sm text-emerald-400">
                                        {car.wins} win{car.wins === 1 ? '' : 's'} · {car.xp} XP
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-8">
                    <h2 className="text-lg font-semibold">Recent matches</h2>
                    {matches.length === 0 ? (
                        <p className="mt-2 text-sm text-gray-500">No races yet.</p>
                    ) : (
                        <div className="stack mt-2">
                            {matches.map((match) => (
                                <MatchCard key={match.id} match={match} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
