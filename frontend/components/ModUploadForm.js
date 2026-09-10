import { useState } from 'react';

const STAT_LABELS = { bhp: 'BHP', handling: 'Handling', acceleration: 'Acceleration', grip: 'Grip' };

function modTypeLabel(modType) {
    return modType
        .split('_')
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(' ');
}

export default function ModUploadForm({ catalog, onSubmit }) {
    const modTypes = Object.keys(catalog || {});
    const [modType, setModType] = useState(modTypes[0] || '');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        if (!modType) return;
        setError('');
        setUploading(true);
        try {
            await onSubmit({ modType, description, file });
            setDescription('');
            setFile(null);
            e.target.reset();
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-gray-700 bg-gray-900 p-4">
            <h3 className="font-semibold text-gray-100">Add a mod</h3>

            <select
                className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 focus:border-red-500 focus:outline-none"
                value={modType}
                onChange={(e) => setModType(e.target.value)}
            >
                {modTypes.map((type) => {
                    const entry = catalog[type];
                    const bonus = entry.statKey ? `+${entry.bonusPercent}% ${STAT_LABELS[entry.statKey]}` : 'cosmetic';
                    return (
                        <option key={type} value={type}>
                            {modTypeLabel(type)} ({bonus})
                        </option>
                    );
                })}
            </select>

            <input
                className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-red-500 focus:outline-none"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
            />

            <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setFile(e.target.files[0] || null)}
                className="text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-200 hover:file:bg-gray-700"
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
                type="submit"
                disabled={uploading || !modType}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {uploading ? 'Uploading...' : 'Add Mod'}
            </button>
        </form>
    );
}
