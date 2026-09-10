import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import CarCard from '../components/CarCard';
import { api, getToken } from '../lib/api';

const emptyCarForm = {
    regPlate: '',
    make: '',
    model: '',
    year: '',
    bhp: '',
    topSpeedMph: '',
    zeroToSixty: '',
    weightKg: '',
    handlingScore: 50
};

const emptyModForm = { name: '', category: 'engine', bhpDelta: '', weightDeltaKg: '' };

export default function Garage() {
    const router = useRouter();
    const [cars, setCars] = useState([]);
    const [carForm, setCarForm] = useState(emptyCarForm);
    const [modForm, setModForm] = useState(emptyModForm);
    const [selectedCarId, setSelectedCarId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!getToken()) {
            router.replace('/login');
            return;
        }
        refreshCars();
    }, [router]);

    function refreshCars() {
        api.getCars()
            .then((res) => setCars(res.cars))
            .catch((err) => setError(err.message));
    }

    function updateCarField(field) {
        return (e) => setCarForm((f) => ({ ...f, [field]: e.target.value }));
    }

    function updateModField(field) {
        return (e) => setModForm((f) => ({ ...f, [field]: e.target.value }));
    }

    async function handleAddCar(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.createCar({
                ...carForm,
                year: Number(carForm.year) || undefined,
                bhp: Number(carForm.bhp) || 0,
                topSpeedMph: Number(carForm.topSpeedMph) || 0,
                zeroToSixty: Number(carForm.zeroToSixty) || 0,
                weightKg: Number(carForm.weightKg) || 0,
                handlingScore: Number(carForm.handlingScore) || 50
            });
            setCarForm(emptyCarForm);
            refreshCars();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddMod(e) {
        e.preventDefault();
        if (!selectedCarId) {
            setError('Pick a car to mod first');
            return;
        }
        setError('');
        try {
            await api.addMod(selectedCarId, {
                ...modForm,
                bhpDelta: Number(modForm.bhpDelta) || 0,
                weightDeltaKg: Number(modForm.weightDeltaKg) || 0
            });
            setModForm(emptyModForm);
            refreshCars();
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div>
            <Navbar />
            <div className="page stack">
                <h1>Garage</h1>
                {error && <p className="error-text">{error}</p>}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                    {cars.map((car) => (
                        <CarCard key={car.id} car={car} />
                    ))}
                </div>

                <section className="card stack">
                    <h2 style={{ margin: 0 }}>Add a car</h2>
                    <form className="stack" onSubmit={handleAddCar}>
                        <input className="input" placeholder="UK reg plate" value={carForm.regPlate} onChange={updateCarField('regPlate')} />
                        <input className="input" placeholder="Make" value={carForm.make} onChange={updateCarField('make')} required />
                        <input className="input" placeholder="Model" value={carForm.model} onChange={updateCarField('model')} required />
                        <input className="input" placeholder="Year" type="number" value={carForm.year} onChange={updateCarField('year')} />
                        <input className="input" placeholder="BHP" type="number" value={carForm.bhp} onChange={updateCarField('bhp')} />
                        <input
                            className="input"
                            placeholder="Top speed (mph)"
                            type="number"
                            value={carForm.topSpeedMph}
                            onChange={updateCarField('topSpeedMph')}
                        />
                        <input
                            className="input"
                            placeholder="0-60 (seconds)"
                            type="number"
                            step="0.1"
                            value={carForm.zeroToSixty}
                            onChange={updateCarField('zeroToSixty')}
                        />
                        <input
                            className="input"
                            placeholder="Weight (kg)"
                            type="number"
                            value={carForm.weightKg}
                            onChange={updateCarField('weightKg')}
                        />
                        <button className="button" type="submit" disabled={loading}>
                            {loading ? 'Adding...' : 'Add car'}
                        </button>
                    </form>
                </section>

                <section className="card stack">
                    <h2 style={{ margin: 0 }}>Add a mod</h2>
                    <form className="stack" onSubmit={handleAddMod}>
                        <select className="input" value={selectedCarId} onChange={(e) => setSelectedCarId(e.target.value)}>
                            <option value="">Select a car</option>
                            {cars.map((car) => (
                                <option key={car.id} value={car.id}>
                                    {car.make} {car.model} ({car.reg_plate})
                                </option>
                            ))}
                        </select>
                        <input className="input" placeholder="Mod name e.g. Cold air intake" value={modForm.name} onChange={updateModField('name')} required />
                        <select className="input" value={modForm.category} onChange={updateModField('category')}>
                            <option value="engine">Engine</option>
                            <option value="exhaust">Exhaust</option>
                            <option value="suspension">Suspension</option>
                            <option value="aero">Aero</option>
                            <option value="wheels">Wheels</option>
                        </select>
                        <input className="input" placeholder="BHP change" type="number" value={modForm.bhpDelta} onChange={updateModField('bhpDelta')} />
                        <input
                            className="input"
                            placeholder="Weight change (kg)"
                            type="number"
                            value={modForm.weightDeltaKg}
                            onChange={updateModField('weightDeltaKg')}
                        />
                        <button className="button" type="submit">
                            Add mod
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
}
