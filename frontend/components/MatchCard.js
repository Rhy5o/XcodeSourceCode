export default function MatchCard({ match }) {
    const when = new Date(match.timestamp).toLocaleString();

    return (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <div>
                    vs <strong>{match.opponentCar}</strong>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                    {when}
                </div>
            </div>
            <span
                style={{
                    fontWeight: 700,
                    color: match.draw ? 'var(--muted)' : match.won ? 'var(--accent-2)' : 'var(--accent)'
                }}
            >
                {match.draw ? 'DRAW' : match.won ? `WIN +${match.xpEarned} XP` : 'LOSS'}
            </span>
        </div>
    );
}
