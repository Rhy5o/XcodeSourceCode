import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import CarCard from '../components/CarCard';
import { api } from '../lib/api';

export default function Show() {
    const [cars, setCars] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        api.getPublicCars()
            .then((res) => setCars(res.cars))
            .catch((err) => setError(err.message));
    }, []);

    return (
        <div>
            <Navbar />
            <div className="page stack">
                <h1>Car Show</h1>
                <p className="muted">The latest cars added by the community.</p>
                {error && <p className="error-text">{error}</p>}
                {cars.length === 0 && !error && <p className="muted">No cars have been shown off yet.</p>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                    {cars.map((car) => (
                        <div key={car.id} className="stack">
                            <CarCard car={car} />
                            <span className="muted" style={{ fontSize: 13 }}>
                                Owned by {car.username}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
