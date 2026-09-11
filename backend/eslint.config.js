const js = require('@eslint/js');

module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                require: 'readonly',
                module: 'writable',
                exports: 'writable',
                process: 'readonly',
                console: 'readonly',
                __dirname: 'readonly',
                Buffer: 'readonly',
                setInterval: 'readonly',
                setTimeout: 'readonly',
                fetch: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
            ]
        }
    },
    {
        ignores: ['node_modules/**', 'uploads/**', 'logs/**']
    }
];
