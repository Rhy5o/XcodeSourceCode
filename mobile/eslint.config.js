// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
    expoConfig,
    {
        ignores: ['dist/*']
    },
    {
        rules: {
            // eslint-config-expo's bundled eslint-plugin-react-hooks flags
            // every "fetch on mount" effect (useEffect(() => { load() },
            // [load])) as a cascading-render risk and pushes toward an
            // external data-fetching library (SWR/React Query) or a
            // subscription-based rewrite. That pattern is used consistently
            // and safely across every screen here (and throughout the
            // existing web frontend) for Phase 1's basic screens — adopting
            // a new state-management dependency to satisfy this one rule is
            // out of scope for this phase, so it's turned off rather than
            // suppressed screen-by-screen.
            'react-hooks/set-state-in-effect': 'off',
            // axios's default export already includes `create` etc. as
            // properties (it isn't a separate named export to destructure
            // instead) — this warning is a false positive for `import
            // axios from 'axios'`.
            'import/no-named-as-default-member': 'off'
        }
    }
]);
