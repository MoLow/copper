module.exports = {
    extension: ['ts', 'tsx'],
    loader: 'ts-node/esm',
    timeout: '30000',
    reporters: ['spec', 'mocha-github-actions-reporter'],
};