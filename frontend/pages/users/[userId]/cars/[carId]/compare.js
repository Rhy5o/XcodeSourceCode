import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../../../../../components/Navbar';
import { api } from '../../../../../lib/api';

const ROWS = [
    { key: 'bhp', label: 'BHP', suffix: '' },
    { key: 'zero_to_sixty', label: '0-60', suffix: 's', lowerIsBetter: true },
    { key: 'weight_kg', label: 'Weight', suffix: 'kg', lowerIsBetter: true },
    { key: 'handling_score', label: 'Handling', suffix: '' },
    { key: 'grip_score', label: 'Grip', suffix: '' }
];

function diffColor(value) {
    if (value > 0) return 'text-emerald-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-500';
}

export default function CompareCars() {
    const router = useRouter();
    const { userId, carId, myCarId } = router.query;

    const [comparison, setComparison] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!carId || !myCarId) return;
        setLoading(true);
        setError('');
        api.compareStats(myCarId, carId)
            .then(setComparison)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [carId, myCarId]);

    if (loading) {
        return (
            <div>
                <Navbar />
                <div className="flex justify-center py-16">
                    <div
                        className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-red-500"
                        role="status"
                        aria-label="Loading comparison"
                    />
                </div>
            </div>
        );
    }

    if (error || !comparison) {
        return (
            <div>
                <Navbar />
                <div className="mx-auto max-w-2xl px-4 py-8">
                    <p className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-400">
                        {error || 'Could not load comparison'}
                    </p>
                </div>
            </div>
        );
    }

    const mine = comparison.car1.car;
    const theirs = comparison.car2.car;
    const myStats = comparison.car1.finalStats;
    const theirStats = comparison.car2.finalStats;

    return (
        <div>
            <Navbar />
            <div className="mx-auto max-w-2xl px-4 py-8 text-gray-100">
                <Link href={`/users/${userId}/garage`} className="text-sm text-gray-400 transition hover:text-gray-200">
                    ← Go back to their garage
                </Link>

                <h1 className="mt-4 text-2xl font-bold">Compare</h1>
                <p className="mt-1 text-sm text-gray-400">
                    {mine.make} {mine.model} vs {theirs.make} {theirs.model}
                </p>

                <div className="mt-6 overflow-x-auto rounded-xl border border-gray-700 bg-gray-900">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-800 text-left text-gray-400">
                                <th className="px-4 py-3">Stat</th>
                                <th className="px-4 py-3">
                                    Your car
                                    <div className="text-xs font-normal text-gray-500">
                                        {mine.make} {mine.model}
                                    </div>
                                </th>
                                <th className="px-4 py-3">
                                    Their car
                                    <div className="text-xs font-normal text-gray-500">
                                        {theirs.make} {theirs.model}
                                    </div>
                                </th>
                                <th className="px-4 py-3">Difference</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ROWS.map((row) => {
                                const diffValue = comparison.diff[row.key];
                                const sign = diffValue > 0 ? '+' : '';
                                return (
                                    <tr key={row.key} className="border-b border-gray-800 last:border-0">
                                        <td className="px-4 py-3 text-gray-300">{row.label}</td>
                                        <td className="px-4 py-3 text-gray-100">
                                            {myStats[row.key]}
                                            {row.suffix}
                                        </td>
                                        <td className="px-4 py-3 text-gray-100">
                                            {theirStats[row.key]}
                                            {row.suffix}
                                        </td>
                                        <td className={`px-4 py-3 font-semibold ${diffColor(diffValue)}`}>
                                            {sign}
                                            {diffValue}
                                            {row.suffix}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                    Green difference = your car is ahead on that stat (lower is better for 0-60 and weight).
                </p>
            </div>
        </div>
    );
}
