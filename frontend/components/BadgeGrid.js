import Badge from './Badge';

export default function BadgeGrid({ badges }) {
    if (!badges || badges.length === 0) {
        return <p className="text-sm text-gray-500">No badges yet.</p>;
    }

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {badges.map((badge) => (
                <Badge key={badge.id} badge={badge} />
            ))}
        </div>
    );
}
