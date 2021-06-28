module.exports = {
    extension: ['ts', 'tsx'],
    spec: ['tests/**.ts', 'src/**.ts'],
    loader: 'ts-node/esm',
    timeout: '30000',
};