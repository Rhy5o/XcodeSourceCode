import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api, setToken, setUser } from '../lib/api';

export default function Signup() {
    const router = useRouter();
    const [form, setForm] = useState({ username: '', email: '', password: '', regPlate: '' });
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
            const { token, user } = await api.signup(form);
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
            <h1>Sign up</h1>
            <form className="stack card" onSubmit={handleSubmit}>
                <input className="input" placeholder="Username" value={form.username} onChange={update('username')} required />
                <input className="input" type="email" placeholder="Email" value={form.email} onChange={update('email')} required />
                <input
                    className="input"
                    placeholder="Password (min 8 chars)"
                    type="password"
                    value={form.password}
                    onChange={update('password')}
                    required
                />
                <input
                    className="input"
                    placeholder="UK reg plate e.g. AB12 CDE"
                    value={form.regPlate}
                    onChange={update('regPlate')}
                    required
                />
                {error && <p className="error-text">{error}</p>}
                <button className="button" type="submit" disabled={loading}>
                    {loading ? 'Creating account...' : 'Sign up'}
                </button>
            </form>
            <p className="muted" style={{ marginTop: 12 }}>
                Already have an account? <Link href="/login">Log in</Link>
            </p>
        </div>
    );
}
