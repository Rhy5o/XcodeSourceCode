import CarCard from './CarCard';

export default function CarGrid({ cars, onActivate, activatingCarId, linkable = true }) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car) => (
                <CarCard
                    key={car.id}
                    car={car}
                    onActivate={onActivate}
                    activating={activatingCarId === car.id}
                    linkable={linkable}
                />
            ))}
        </div>
    );
}
