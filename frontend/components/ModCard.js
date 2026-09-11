import { API_URL } from '../lib/api';

const STAT_LABELS = { bhp: 'BHP', handling: 'Handling', acceleration: 'Acceleration', grip: 'Grip' };

function modTypeLabel(modType) {
    return modType
        .split('_')
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(' ');
}

export default function ModCard({ mod, catalogEntry, canDelete = false, onDelete, deleting = false }) {
    const bonusText =
        catalogEntry && catalogEntry.statKey
            ? `+${catalogEntry.bonusPercent}% ${STAT_LABELS[catalogEntry.statKey] || catalogEntry.statKey}`
            : 'Cosmetic only';

    return (
        <div className="flex gap-3 rounded-xl border border-gray-700 bg-gray-900 p-3">
            {mod.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={`${API_URL}${mod.photo_url}`}
                    alt={`${modTypeLabel(mod.mod_type)} photo`}
                    loading="lazy"
                    className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                />
            ) : (
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gray-800 text-xs text-gray-500">
                    No photo
                </div>
            )}

            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-gray-100">{modTypeLabel(mod.mod_type)}</h4>
                    <span className="whitespace-nowrap rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                        {bonusText}
                    </span>
                </div>
                {mod.description && <p className="mt-1 truncate text-sm text-gray-400">{mod.description}</p>}
            </div>

            {canDelete && (
                <button
                    onClick={() => onDelete && onDelete(mod.id)}
                    disabled={deleting}
                    className="self-start text-xs font-semibold text-red-400 transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {deleting ? 'Removing...' : 'Delete'}
                </button>
            )}
        </div>
    );
}
