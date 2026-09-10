import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { api, getToken, getUser } from '../../lib/api';

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ClanDetail() {
    const router = useRouter();
    const { clanId } = router.query;

    const [clan, setClan] = useState(null);
    const [members, setMembers] = useState([]);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [kickingId, setKickingId] = useState(null);

    const currentUser = getToken() ? getUser() : null;

    const load = useCallback(() => {
        if (!clanId) return;
        setLoading(true);
        setError('');
        Promise.all([api.getClan(clanId), api.getClanLeaderboard(clanId)])
            .then(([clanRes, leaderboardRes]) => {
                setClan(clanRes.clan);
                setStats(clanRes.stats);
                setMembers(leaderboardRes.leaderboard);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [clanId]);

    useEffect(() => {
        load();
    }, [load]);

    const isMember = currentUser && members.some((m) => m.user_id === currentUser.id);
    const isLeader = currentUser && clan && clan.leader_id === currentUser.id;

    async function handleJoin() {
        setBusy(true);
        setError('');
        try {
            await api.joinClan(clanId);
            load();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function handleLeave() {
        setBusy(true);
        setError('');
        try {
            await api.leaveClan(clanId);
            load();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function handleKick(userId) {
        setKickingId(userId);
        setError('');
        try {
            await api.kickClanMember(clanId, userId);
            load();
        } catch (err) {
            setError(err.message);
        } finally {
            setKickingId(null);
        }
    }

    if (loading) {
        return (
            <div>
                <Navbar />
                <div className="flex justify-center py-16">
                    <div
                        className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-red-500"
                        role="status"
                        aria-label="Loading clan"
                    />
                </div>
            </div>
        );
    }

    if (error && !clan) {
        return (
            <div>
                <Navbar />
                <div className="mx-auto max-w-2xl px-4 py-8">
                    <p className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-400">{error}</p>
                </div>
            </div>
        );
    }

    if (!clan) return null;

    return (
        <div>
            <Navbar />
            <div className="mx-auto max-w-2xl px-4 py-8 text-gray-100">
                <Link href="/clans" className="text-sm text-gray-400 transition hover:text-gray-200">
                    ← All Clans
                </Link>

                <div className="mt-4 rounded-xl border border-gray-700 bg-gray-900 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold">{clan.name}</h1>
                            <p className="mt-1 text-sm text-gray-400">
                                Led by {clan.leader_username} · Founded {formatDate(clan.created_at)}
                            </p>
                            {clan.description && <p className="mt-2 text-sm text-gray-300">{clan.description}</p>}
                        </div>

                        {currentUser &&
                            (isMember ? (
                                !isLeader && (
                                    <button
                                        onClick={handleLeave}
                                        disabled={busy}
                                        className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:border-red-500 hover:text-red-400 disabled:opacity-60"
                                    >
                                        {busy ? '...' : 'Leave Clan'}
                                    </button>
                                )
                            ) : (
                                <button
                                    onClick={handleJoin}
                                    disabled={busy}
                                    className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-60"
                                >
                                    {busy ? '...' : 'Join Clan'}
                                </button>
                            ))}
                    </div>
                </div>

                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

                {stats && (
                    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <StatBox label="Members" value={stats.member_count} />
                        <StatBox label="Combined XP" value={stats.total_xp} />
                        <StatBox label="Combined Wins" value={stats.total_wins} />
                        <StatBox label="Avg Rank" value={stats.avgRank ?? '—'} />
                    </div>
                )}

                <div className="mt-8">
                    <h2 className="text-lg font-semibold">Members (by XP)</h2>
                    <div className="mt-2 overflow-x-auto rounded-xl border border-gray-700 bg-gray-900">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-800 text-left text-gray-400">
                                    <th className="px-4 py-3">Driver</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">XP</th>
                                    <th className="px-4 py-3">W / L</th>
                                    {isLeader && <th className="px-4 py-3"></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((member) => (
                                    <tr key={member.user_id} className="border-b border-gray-800 last:border-0">
                                        <td className="px-4 py-3">
                                            <Link href={`/users/${member.user_id}`} className="font-medium text-gray-100 hover:text-red-400">
                                                {member.username}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 capitalize text-gray-400">{member.role}</td>
                                        <td className="px-4 py-3">{member.total_xp ?? 0}</td>
                                        <td className="px-4 py-3">
                                            {member.wins ?? 0} / {member.losses ?? 0}
                                        </td>
                                        {isLeader && (
                                            <td className="px-4 py-3">
                                                {member.role !== 'leader' && (
                                                    <button
                                                        onClick={() => handleKick(member.user_id)}
                                                        disabled={kickingId === member.user_id}
                                                        className="text-xs font-semibold text-red-400 hover:text-red-300 disabled:opacity-50"
                                                    >
                                                        {kickingId === member.user_id ? 'Removing...' : 'Kick'}
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatBox({ label, value }) {
    return (
        <div className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-center">
            <div className="text-xl font-bold text-gray-100">{value}</div>
            <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
        </div>
    );
}
