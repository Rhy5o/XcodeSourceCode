import ModCard from './ModCard';

const STAT_LABELS = { bhp: 'BHP', handling: 'Handling', acceleration: 'Acceleration', grip: 'Grip' };

export default function ModList({ mods, catalog, canDelete = false, onDelete, deletingModId }) {
    if (mods.length === 0) {
        return <p className="text-sm text-gray-500">No mods installed yet.</p>;
    }

    const totals = {};
    for (const mod of mods) {
        const entry = catalog && catalog[mod.mod_type];
        if (entry && entry.statKey) {
            totals[entry.statKey] = (totals[entry.statKey] || 0) + entry.bonusPercent;
        }
    }
    const totalEntries = Object.entries(totals).filter(([, pct]) => pct !== 0);

    return (
        <div className="flex flex-col gap-3">
            {totalEntries.length > 0 && (
                <div className="flex flex-wrap gap-2 text-sm">
                    {totalEntries.map(([statKey, pct]) => (
                        <span
                            key={statKey}
                            className="rounded-full bg-gray-800 px-3 py-1 font-medium text-gray-200"
                        >
                            Total {STAT_LABELS[statKey] || statKey} bonus: +{pct}%
                        </span>
                    ))}
                </div>
            )}

            {mods.map((mod) => (
                <ModCard
                    key={mod.id}
                    mod={mod}
                    catalogEntry={catalog && catalog[mod.mod_type]}
                    canDelete={canDelete}
                    onDelete={onDelete}
                    deleting={deletingModId === mod.id}
                />
            ))}
        </div>
    );
}
