import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import ShowStatus from '../components/ShowStatus';
import MatchCard from '../components/MatchCard';
import ModList from '../components/ModList';
import { useShowStatus } from '../hooks/useShowStatus';
import { api, getToken } from '../lib/api';

function Stat({ label, value }) {
    return (
        <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-100">{value}</dd>
        </div>
    );
}

export default function Show() {
    const router = useRouter();
    const { status, error: statusError, loading: statusLoading, secondsLeft, goOnline, goOffline } = useShowStatus();
    const [busy, setBusy] = useState(false);
    const [toggleError, setToggleError] = useState('');

    const [activeCar, setActiveCar] = useState(null);
    const [mods, setMods] = useState([]);
    const [catalog, setCatalog] = useState(null);
    const [matches, setMatches] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        if (!getToken()) {
            router.replace('/login');
            return;
        }

        api.getGarage().then((res) => {
            const car = res.cars.find((c) => c.is_active);
            if (!car) return;
            api.getCarWithMods(car.id).then((detail) => {
                setActiveCar(detail.car);
                setMods(detail.mods);
            });
        });
        api.getModCatalog().then((res) => setCatalog(res.catalog));
        api.getMyMatches().then((res) => setMatches(res.matches.slice(0, 10)));
        api.getLeaderboard().then((res) => setLeaderboard(res.leaderboard.slice(0, 5)));
    }, [router]);

    async function handleGoOnline() {
        setBusy(true);
        setToggleError('');
        try {
            await goOnline();
        } catch (err) {
            setToggleError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function handleGoOffline() {
        setBusy(true);
        setToggleError('');
        try {
            await goOffline();
        } catch (err) {
            setToggleError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div>
            <Navbar />
            <div className="mx-auto max-w-2xl px-4 py-8 text-gray-100">
                <h1 className="text-2xl font-bold">The Show</h1>
                <p className="mt-1 text-sm text-gray-400">
                    Every 5 minutes, online cars are paired up and raced. Winners earn XP.
                </p>

                <div className="mt-4">
                    <ShowStatus
                        status={status}
                        loading={statusLoading}
                        error={statusError}
                        secondsLeft={secondsLeft}
                        onGoOnline={handleGoOnline}
                        onGoOffline={handleGoOffline}
                        busy={busy}
                    />
                    {toggleError && <p className="mt-2 text-sm text-red-400">{toggleError}</p>}
                </div>

                {activeCar && (
                    <div className="mt-8">
                        <h2 className="text-lg font-semibold">Your car at the show</h2>
                        <div className="mt-2 rounded-xl border border-gray-700 bg-gray-900 p-5">
                            <p className="font-semibold text-gray-100">
                                {activeCar.make} {activeCar.model}
                            </p>
                            <p className="text-xs text-gray-400">{activeCar.reg_plate}</p>
                            <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                                <Stat label="BHP" value={activeCar.bhp} />
                                <Stat label="0-60" value={`${activeCar.zero_to_sixty}s`} />
                                <Stat label="Handling" value={activeCar.handling_score} />
                                <Stat label="Grip" value={activeCar.grip_score} />
                            </dl>
                            {catalog && (
                                <div className="mt-4">
                                    <ModList mods={mods} catalog={catalog} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="mt-8">
                    <h2 className="text-lg font-semibold">Match history</h2>
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

                <div className="mt-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Leaderboard</h2>
                        <Link href="/leaderboard" className="text-sm text-gray-400 transition hover:text-gray-200">
                            View full leaderboard →
                        </Link>
                    </div>
                    {leaderboard.length === 0 ? (
                        <p className="mt-2 text-sm text-gray-500">No races have finished yet.</p>
                    ) : (
                        <div className="mt-2 rounded-xl border border-gray-700 bg-gray-900 p-4">
                            {leaderboard.map((row, i) => (
                                <div
                                    key={row.user_id}
                                    className="flex items-center justify-between py-1.5 text-sm text-gray-200"
                                >
                                    <span>
                                        {i + 1}. {row.username}
                                    </span>
                                    <span className="text-gray-400">{row.total_xp} XP</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
