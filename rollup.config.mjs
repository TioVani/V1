import terser from '@rollup/plugin-terser';

const isProduction = process.env.NODE_ENV === 'production';

export default {
    input: 'src/entry.js',
    output: {
        file: 'dist/game-modules.js',
        format: 'iife',
        name: 'GameModules',
        exports: 'named',
        strict: false,
        sourcemap: !isProduction
    },
    plugins: isProduction ? [
        terser({
            compress: {
                drop_console: true,
                drop_debugger: true,
                global_defs: {
                    __DEV__: false
                },
                pure_funcs: ['Logger.info', 'Logger.debug', 'Logger.warn', 'Logger.success']
            },
            format: {
                comments: false
            }
        })
    ] : []
};
