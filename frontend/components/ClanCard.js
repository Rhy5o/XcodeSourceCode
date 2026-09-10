import { useRouter } from 'next/router';

export default function ClanCard({ clan, isMember, onJoin, onLeave, busy }) {
    const router = useRouter();

    return (
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
            <button onClick={() => router.push(`/clans/${clan.id}`)} className="text-left">
                <h3 className="font-semibold text-gray-100 hover:text-red-400">{clan.name}</h3>
                <p className="text-xs text-gray-400">Led by {clan.leader_username}</p>
            </button>
            {clan.description && <p className="mt-2 text-sm text-gray-400">{clan.description}</p>}

            <div className="mt-3 flex items-center justify-between text-sm text-gray-300">
                <span>
                    {clan.member_count} member{clan.member_count === 1 ? '' : 's'}
                </span>
                <span>{clan.total_xp} XP</span>
            </div>

            {(onJoin || onLeave) && (
                <button
                    onClick={isMember ? onLeave : onJoin}
                    disabled={busy}
                    className={`mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isMember
                            ? 'border border-gray-700 text-gray-100 hover:border-red-500 hover:text-red-400'
                            : 'bg-red-500 text-white hover:bg-red-400'
                    }`}
                >
                    {busy ? '...' : isMember ? 'Leave' : 'Join'}
                </button>
            )}
        </div>
    );
}
