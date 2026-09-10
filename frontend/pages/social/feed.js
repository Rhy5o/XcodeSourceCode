import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import { api, getToken } from '../../lib/api';

export default function SocialFeed() {
    const router = useRouter();
    const [feed, setFeed] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!getToken()) {
            router.replace('/login');
            return;
        }
        api.getFollowingFeed()
            .then((res) => setFeed(res.feed))
            .catch((err) => setError(err.message));
    }, [router]);

    return (
        <div>
            <Navbar />
            <div className="mx-auto max-w-2xl px-4 py-8 text-gray-100">
                <h1 className="text-2xl font-bold">Following</h1>
                <p className="mt-1 text-sm text-gray-400">Leaderboard of the people you follow, this season.</p>

                {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

                {feed && feed.length === 0 && (
                    <p className="mt-6 text-sm text-gray-500">
                        You&apos;re not following anyone yet. Visit a profile and hit Follow.
                    </p>
                )}

                <div className="mt-6 flex flex-col gap-2">
                    {feed?.map((entry) => (
                        <button
                            key={entry.user_id}
                            onClick={() => router.push(`/users/${entry.user_id}`)}
                            className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-900 p-4 text-left transition hover:border-gray-500"
                        >
                            <div>
                                <p className="font-semibold text-gray-100">
                                    #{entry.rank} {entry.username}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                    {entry.lastMatch
                                        ? entry.lastMatch.draw
                                            ? `Last race: draw vs ${entry.lastMatch.opponentCar}`
                                            : entry.lastMatch.won
                                              ? `Last race: won vs ${entry.lastMatch.opponentCar}`
                                              : `Last race: lost vs ${entry.lastMatch.opponentCar}`
                                        : 'No races yet'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-gray-100">{entry.total_xp} XP</p>
                                <p className="text-xs text-gray-500">
                                    {entry.wins}W / {entry.losses}L
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
