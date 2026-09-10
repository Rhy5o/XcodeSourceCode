import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { api } from '../lib/api';

export default function Leaderboard() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        api.getLeaderboard()
            .then((res) => setLeaderboard(res.leaderboard))
            .catch((err) => setError(err.message));
    }, []);

    return (
        <div>
            <Navbar />
            <div className="page stack">
                <h1>Leaderboard</h1>
                {error && <p className="error-text">{error}</p>}
                <div className="card">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Driver</th>
                                <th>Reg plate</th>
                                <th>XP</th>
                                <th>W / L</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.map((row, i) => (
                                <tr key={row.user_id}>
                                    <td>{i + 1}</td>
                                    <td>{row.username}</td>
                                    <td className="muted">{row.reg_plate}</td>
                                    <td>{row.total_xp}</td>
                                    <td>
                                        {row.wins} / {row.losses}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {leaderboard.length === 0 && <p className="muted">No races have finished yet.</p>}
                </div>
            </div>
        </div>
    );
}
