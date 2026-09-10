import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api, setToken, setUser } from '../lib/api';

export default function Login() {
    const router = useRouter();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    function update(field) {
        return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { token, user } = await api.login(form);
            setToken(token);
            setUser(user);
            router.push('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="page" style={{ maxWidth: 420 }}>
            <h1>Log in</h1>
            <form className="stack card" onSubmit={handleSubmit}>
                <input className="input" type="email" placeholder="Email" value={form.email} onChange={update('email')} required />
                <input
                    className="input"
                    type="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={update('password')}
                    required
                />
                {error && <p className="error-text">{error}</p>}
                <button className="button" type="submit" disabled={loading}>
                    {loading ? 'Logging in...' : 'Log in'}
                </button>
            </form>
            <p className="muted" style={{ marginTop: 12 }}>
                No account yet? <Link href="/signup">Sign up</Link>
            </p>
        </div>
    );
}
