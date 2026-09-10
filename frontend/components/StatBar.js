export default function StatBar({ label, value, max }) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return (
        <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span className="muted">{label}</span>
                <span>{value}</span>
            </div>
            <div style={{ background: '#0d0f14', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div
                    style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: 'var(--accent-2)'
                    }}
                />
            </div>
        </div>
    );
}
