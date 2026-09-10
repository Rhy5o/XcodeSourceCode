import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import MatchCard from '../components/MatchCard';
import { api, getToken, getUser, logout } from '../lib/api';

export default function Dashboard() {
    const router = useRouter();
    const [user, setUserState] = useState(null);
    const [cars, setCars] = useState([]);
    const [matches, setMatches] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!getToken()) {
            router.replace('/login');
            return;
        }
        setUserState(getUser());

        Promise.all([api.getGarage(), api.getMyMatches()])
            .then(([carsRes, matchesRes]) => {
                setCars(carsRes.cars);
                setMatches(matchesRes.matches);
            })
            .catch((err) => setError(err.message));
    }, [router]);

    const activeCar = cars.find((car) => car.is_active);

    function handleLogout() {
        logout();
        router.push('/login');
    }

    return (
        <div>
            <Navbar />
            <div className="page stack">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1>Welcome back{user ? `, ${user.username}` : ''}</h1>
                    <button className="button secondary" onClick={handleLogout}>
                        Log out
                    </button>
                </div>

                {error && <p className="error-text">{error}</p>}

                <section className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0 }}>Your garage</h2>
                        <Link href="/garage" className="button secondary">
                            My Garage
                        </Link>
                    </div>
                    {cars.length === 0 ? (
                        <p className="muted" style={{ marginTop: 8 }}>
                            No cars yet. Head to the Garage to register one via your reg plate.
                        </p>
                    ) : (
                        <p className="muted" style={{ marginTop: 8 }}>
                            {cars.length} car{cars.length === 1 ? '' : 's'} registered
                            {activeCar ? (
                                <>
                                    {' '}
                                    · at the show:{' '}
                                    <strong style={{ color: 'var(--text)' }}>
                                        {activeCar.make} {activeCar.model} ({activeCar.reg_plate})
                                    </strong>
                                </>
                            ) : (
                                ' · no car is at the show yet'
                            )}
                        </p>
                    )}
                </section>

                <section>
                    <h2>Recent races</h2>
                    {matches.length === 0 ? (
                        <p className="muted">No races yet — matches run every 5 minutes against other online cars.</p>
                    ) : (
                        <div className="stack">
                            {matches.map((match) => (
                                <MatchCard key={match.id} match={match} currentUserId={user && user.id} />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
