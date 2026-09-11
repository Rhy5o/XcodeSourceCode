import '../styles/globals.css';
import ErrorBoundary from '../utils/errorBoundary';

export default function App({ Component, pageProps }) {
    return (
        <ErrorBoundary>
            <Component {...pageProps} />
        </ErrorBoundary>
    );
}
