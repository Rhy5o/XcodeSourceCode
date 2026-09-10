import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Signup from '../pages/signup';

const push = jest.fn();

jest.mock('next/router', () => ({
    useRouter: () => ({ push })
}));

beforeEach(() => {
    push.mockClear();
    window.localStorage.clear();
    global.fetch = jest.fn();
});

async function fillForm(user) {
    await user.type(screen.getByPlaceholderText('Username'), 'racer99');
    await user.type(screen.getByPlaceholderText('Email'), 'racer99@example.com');
    await user.type(screen.getByPlaceholderText('Password (min 8 chars)'), 'supersecret');
    await user.type(screen.getByPlaceholderText('UK reg plate e.g. AB12 CDE'), 'AB12CDE');
}

test('renders the signup form fields', () => {
    render(<Signup />);

    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password (min 8 chars)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('UK reg plate e.g. AB12 CDE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
});

test('submits the form, stores the JWT, and redirects to the dashboard', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
            token: 'fake.jwt.token',
            user: { id: 'user-1', username: 'racer99', email: 'racer99@example.com', reg_plate: 'AB12CDE' }
        })
    });

    render(<Signup />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/signup',
        expect.objectContaining({ method: 'POST' })
    );
    const [, options] = global.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
        username: 'racer99',
        email: 'racer99@example.com',
        password: 'supersecret',
        regPlate: 'AB12CDE'
    });

    expect(window.localStorage.getItem('token')).toBe('fake.jwt.token');
    expect(push).toHaveBeenCalledWith('/dashboard');
});

test('shows an error and does not redirect when signup fails', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValueOnce({
        ok: false,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: 'Username, email or registration plate already in use' })
    });

    render(<Signup />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByText('Username, email or registration plate already in use')).toBeInTheDocument();
    expect(window.localStorage.getItem('token')).toBeNull();
    expect(push).not.toHaveBeenCalled();
});
