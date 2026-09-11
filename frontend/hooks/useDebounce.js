import { useEffect, useState } from 'react';

// Returns `value`, but only updates after `delayMs` has passed without it
// changing again — used to turn "search as you type" into a debounced
// network request instead of firing one per keystroke.
export function useDebouncedValue(value, delayMs = 350) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(id);
    }, [value, delayMs]);

    return debounced;
}
