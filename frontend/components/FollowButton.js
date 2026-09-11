import { useState } from 'react';
import { api } from '../lib/api';

export default function FollowButton({ userId, initialFollowing, onChange }) {
    const [following, setFollowing] = useState(!!initialFollowing);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function toggle() {
        setBusy(true);
        setError('');
        try {
            if (following) {
                await api.unfollowUser(userId);
                setFollowing(false);
                onChange && onChange(false);
            } else {
                await api.followUser(userId);
                setFollowing(true);
                onChange && onChange(true);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div>
            <button
                onClick={toggle}
                disabled={busy}
                className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    following
                        ? 'border border-gray-700 text-gray-100 hover:border-red-500 hover:text-red-400'
                        : 'bg-red-500 text-white hover:bg-red-400'
                }`}
            >
                {busy ? '...' : following ? 'Unfollow' : 'Follow'}
            </button>
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
    );
}
