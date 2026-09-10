import { useRouter } from 'next/router';
import FollowButton from './FollowButton';

export default function UserCardSmall({ userId, username, xp, showFollow = false, initialFollowing = false }) {
    const router = useRouter();

    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-700 bg-gray-900 p-3">
            <button
                onClick={() => router.push(`/users/${userId}`)}
                className="flex items-center gap-3 text-left"
            >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20 text-sm font-bold text-red-400">
                    {username ? username[0].toUpperCase() : '?'}
                </div>
                <div>
                    <p className="font-medium text-gray-100 hover:text-red-400">{username}</p>
                    {xp !== undefined && xp !== null && <p className="text-xs text-gray-500">{xp} XP</p>}
                </div>
            </button>

            {showFollow && <FollowButton userId={userId} initialFollowing={initialFollowing} />}
        </div>
    );
}
