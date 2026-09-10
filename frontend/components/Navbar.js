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
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: '1px solid var(--border)'
            }}
        >
            <Link href="/dashboard" style={{ fontWeight: 800, fontSize: 18 }}>
                🏁 GridWars
            </Link>
            <div style={{ display: 'flex', gap: 20 }}>
                {links.map((link) => (
                    <Link key={link.href} href={link.href}>
                        {link.label}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
