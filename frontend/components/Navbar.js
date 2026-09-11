import Link from 'next/link';

const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/garage', label: 'Garage' },
    { href: '/show', label: 'Show' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/social/feed', label: 'Following' },
    { href: '/clans', label: 'Clans' }
];

export default function Navbar() {
    return (
        <nav
            aria-label="Main"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                rowGap: 10,
                padding: '16px 24px',
                borderBottom: '1px solid var(--border)'
            }}
        >
            <Link
                href="/dashboard"
                style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, fontWeight: 800, fontSize: 18 }}
            >
                🏁 GridWars
            </Link>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                {links.map((link) => (
                    <Link key={link.href} href={link.href} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>
                        {link.label}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
