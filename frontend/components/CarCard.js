import StatBar from './StatBar';

export default function CarCard({ car }) {
    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ margin: 0 }}>
                    {car.make} {car.model}
                </h3>
                <span className="muted">{car.reg_plate}</span>
            </div>
            <div style={{ marginTop: 12 }}>
                <StatBar label="BHP" value={car.bhp} max={1200} />
                <StatBar label="Top Speed (mph)" value={car.top_speed_mph} max={220} />
                <StatBar label="Handling" value={car.handling_score} max={100} />
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                0-60: {car.zero_to_sixty}s · {car.weight_kg}kg
            </p>
        </div>
    );
}
