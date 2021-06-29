module.exports = {
    extension: ['ts', 'tsx'],
    spec: ['tests/**.test.ts', 'src/**.test.ts'],
    loader: 'ts-node/esm',
    timeout: '30000',
};