import { Component } from 'react';

// A random errorId (not crypto.randomUUID() — this needs to run in every
// browser Next.js supports, including ones without the Web Crypto UUID API)
// so a user can quote one short string when reporting a crash, without the
// full stack trace ever reaching the UI.
function generateErrorId() {
    return `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, errorId: null };
    }

    static getDerivedStateFromError() {
        return { hasError: true, errorId: generateErrorId() };
    }

    componentDidCatch(error, info) {
        // eslint-disable-next-line no-console
        console.error(`[error-boundary] ${this.state.errorId}`, error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, errorId: null });
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center text-gray-100">
                <h1 className="text-xl font-bold">Something went wrong</h1>
                <p className="text-sm text-gray-400">
                    An unexpected error occurred. You can try again, or report the error below if it keeps happening.
                </p>
                <p className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-gray-500">
                    Error ID: {this.state.errorId}
                </p>
                <button
                    onClick={this.handleReset}
                    className="min-h-[44px] rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
                >
                    Try again
                </button>
            </div>
        );
    }
}
