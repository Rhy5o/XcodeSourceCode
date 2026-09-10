import Link from 'next/link';

export default function Home() {
    return (
        <div className="page stack" style={{ textAlign: 'center', paddingTop: 80 }}>
            <h1 style={{ fontSize: 42 }}>🏁 GridWars</h1>
            <p className="muted">Sign up with your reg plate. Mod your car. Race every 5 minutes.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12 }}>
                <Link href="/signup" className="button">
                    Sign up
                </Link>
                <Link href="/login" className="button secondary">
                    Log in
                </Link>
            </div>
        </div>
    );
}
