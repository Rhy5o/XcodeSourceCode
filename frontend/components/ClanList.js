import { memo } from 'react';
import ClanCard from './ClanCard';

// Memoized for the same reason as LeaderboardTable: the clans list page
// re-renders on search/sort/pagination state that this list doesn't itself
// depend on, so skip re-rendering every ClanCard unless the clan data (or
// which clan the viewer belongs to / is busy joining-leaving) actually changed.
function ClanList({ clans, myClanId, busyClanId, onJoin, onLeave, canManage }) {
    if (clans.length === 0) {
        return <p className="mt-6 text-sm text-gray-500">No clans found.</p>;
    }

    return (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {clans.map((clan) => (
                <ClanCard
                    key={clan.id}
                    clan={clan}
                    isMember={myClanId === clan.id}
                    onJoin={canManage ? () => onJoin(clan.id) : undefined}
                    onLeave={canManage ? () => onLeave(clan.id) : undefined}
                    busy={busyClanId === clan.id}
                />
            ))}
        </div>
    );
}

export default memo(ClanList);
