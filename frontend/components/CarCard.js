import { useRouter } from 'next/router';
import { api } from '../lib/api';

function Stat({ label, value }) {
    return (
        <div>
            <dt className="text-gray-500">{label}</dt>
            <dd className="font-medium text-gray-200">{value}</dd>
        </div>
    );
}

export default function CarCard({ car, onActivate, activating = false, linkable = true }) {
    const router = useRouter();

    function handleCardClick() {
        if (linkable) router.push(`/car/${car.id}`);
    }

    function handleActivateClick(e) {
        e.stopPropagation();
        if (onActivate) onActivate(car.id);
    }

    return (
        <div
            onClick={handleCardClick}
            role={linkable ? 'button' : undefined}
            tabIndex={linkable ? 0 : undefined}
            onKeyDown={(e) => linkable && e.key === 'Enter' && handleCardClick()}
            className={`rounded-xl border p-4 transition hover:border-gray-500 hover:shadow-lg ${
                linkable ? 'cursor-pointer' : ''
            } ${car.is_active ? 'border-emerald-500 bg-emerald-950/20' : 'border-gray-700 bg-gray-900'}`}
        >
            {/* SVG car illustration is generated per-request server-side (see
                svgCarRenderer.js) and can't be optimized/resized by next/image
                the way a static asset can. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={api.getCarSvgUrl(car.id, { cacheBust: car.mod_count })}
                alt={`Stylized illustration of the ${car.make} ${car.model}`}
                loading="lazy"
                className="mb-3 aspect-[2/1] w-full rounded-lg bg-gray-950/40 object-contain"
            />

            <div className="flex items-start justify-between gap-2">
                <div>
                    <h3 className="text-lg font-semibold text-gray-100">
                        {car.make} {car.model}
                    </h3>
                    <p className="text-xs text-gray-400">{car.reg_plate}</p>
                </div>
                {car.is_active && (
                    <span className="whitespace-nowrap rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-400">
                        At The Show
                    </span>
                )}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Stat label="BHP" value={car.bhp} />
                <Stat label="0-60" value={`${car.zero_to_sixty}s`} />
                <Stat label="Weight" value={`${car.weight_kg}kg`} />
                <Stat label="Engine" value={car.engine_size || '—'} />
                <Stat label="Fuel" value={car.fuel_type || '—'} />
            </dl>

            {!car.is_active && onActivate && (
                <button
                    onClick={handleActivateClick}
                    disabled={activating}
                    className="mt-4 min-h-[44px] w-full rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {activating ? 'Taking to the show...' : 'Take to the Show'}
                </button>
            )}
        </div>
    );
}
