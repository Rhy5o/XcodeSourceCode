import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import CarCard from '../components/CarCard';
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

        Promise.all([api.getCars(), api.getMyMatches()])
            .then(([carsRes, matchesRes]) => {
                setCars(carsRes.cars);
                setMatches(matchesRes.matches);
            })
            .catch((err) => setError(err.message));
    }, [router]);

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

                <section>
                    <h2>Your garage</h2>
                    {cars.length === 0 ? (
                        <p className="muted">No cars yet. Head to the Garage to add one.</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                            {cars.map((car) => (
                                <CarCard key={car.id} car={car} />
                            ))}
                        </div>
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
