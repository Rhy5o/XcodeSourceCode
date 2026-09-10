import { useEffect, useState } from 'react';
import { api, getToken, getUser } from '../lib/api';

function formatTimestamp(dateString) {
    return new Date(dateString).toLocaleString();
}

export default function CommentSection({ carId, carOwnerId, comments, onCommentsChange }) {
    const [text, setText] = useState('');
    const [posting, setPosting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState('');

    // Read only inside useEffect (client-only) so the first client render
    // matches server-rendered (logged-out) markup — reading localStorage
    // directly in the render body differs between SSR and the client and
    // causes a hydration mismatch, not just a "logged out on first paint"
    // flash. Safe today because this component's only caller currently
    // mounts it behind its own loading gate, but that's a fragile thing to
    // rely on for a reusable component.
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    useEffect(() => {
        setCurrentUser(getUser());
        setIsLoggedIn(!!getToken());
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!text.trim()) return;
        setPosting(true);
        setError('');
        try {
            await api.addComment(carId, text.trim());
            setText('');
            const res = await api.getComments(carId);
            onCommentsChange(res.comments);
        } catch (err) {
            setError(err.message);
        } finally {
            setPosting(false);
        }
    }

    async function handleDelete(commentId) {
        setDeletingId(commentId);
        setError('');
        try {
            await api.deleteComment(carId, commentId);
            const res = await api.getComments(carId);
            onCommentsChange(res.comments);
        } catch (err) {
            setError(err.message);
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div>
            {comments.length === 0 ? (
                <p className="text-sm text-gray-500">No comments yet.</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {comments.map((comment) => {
                        const canDelete =
                            currentUser && (currentUser.id === comment.user_id || currentUser.id === carOwnerId);
                        return (
                            <div key={comment.id} className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span className="text-sm font-semibold text-gray-200">
                                            {comment.username}
                                        </span>
                                        <span className="ml-2 text-xs text-gray-500">
                                            {formatTimestamp(comment.created_at)}
                                        </span>
                                    </div>
                                    {canDelete && (
                                        <button
                                            onClick={() => handleDelete(comment.id)}
                                            disabled={deletingId === comment.id}
                                            className="text-xs font-semibold text-red-400 hover:text-red-300 disabled:opacity-50"
                                        >
                                            {deletingId === comment.id ? 'Removing...' : 'Delete'}
                                        </button>
                                    )}
                                </div>
                                <p className="mt-1 text-sm text-gray-300">{comment.comment_text}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {isLoggedIn ? (
                <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
                    <input
                        className="flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-red-500 focus:outline-none"
                        placeholder="Add a comment..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={posting || !text.trim()}
                        className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {posting ? 'Posting...' : 'Post'}
                    </button>
                </form>
            ) : (
                <p className="mt-3 text-sm text-gray-500">Log in to leave a comment.</p>
            )}
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
    );
}
