export default function MatchCard({ match, currentUserId }) {
    const isUserA = match.user_a_id === currentUserId;
    const opponentCarId = isUserA ? match.car_b_id : match.car_a_id;
    const yourCarId = isUserA ? match.car_a_id : match.car_b_id;
    const won = match.winner_car_id === yourCarId;
    const draw = !match.winner_car_id;

    return (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <div>
                    Stat: <strong>{match.stat_compared}</strong>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                    vs car #{String(opponentCarId).slice(0, 8)}
                </div>
            </div>
            <span
                style={{
                    fontWeight: 700,
                    color: draw ? 'var(--muted)' : won ? 'var(--accent-2)' : 'var(--accent)'
                }}
            >
                {draw ? 'DRAW' : won ? 'WIN' : 'LOSS'}
            </span>
        </div>
    );
}
