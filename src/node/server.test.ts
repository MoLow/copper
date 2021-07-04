import * as sinon from 'sinon';
import * as proxyquire from 'proxyquire';
import { expect } from 'chai';
import { NodeServer as NodeServerType } from './server';
import { nodeConfig } from './config';
import { delay } from '../common/utils';

const fetchStub = sinon.stub();

const { NodeServer } = proxyquire.noCallThru()('./server', { 'node-fetch': { default: fetchStub } }) as {
    NodeServer: typeof NodeServerType;
};

describe('nodeServer', () => {
    let nodeServer: NodeServerType;
    beforeEach(() => {
        nodeConfig.value = {
            registerInterval: 1,
            registerRetries: 2,
            deregisterInterval: 1,
            deregisterRetries: 2,
        };
        nodeServer = new NodeServer({ port: 0 });
    });

    afterEach(() => {
        fetchStub.reset();
        nodeConfig.reset();
    });

    it('should be an instance of NodeServer', () => {
        expect(nodeServer).to.be.an.instanceof(NodeServer);
    });

    it('should register to hub', async () => {
        fetchStub.resolves({});
        await nodeServer.register();
        expect(fetchStub).to.have.been.calledWith(
            `http://${nodeConfig.value.hubHost}:${nodeConfig.value.hubPort}/grid/node`,
            {
                method: 'POST',
                body: JSON.stringify({ config: nodeConfig.value }),
                headers: { 'Content-Type': 'application/json' },
            },
        );
    });

    it('should retry when failed registering to hub', async () => {
        fetchStub.rejects(new Error('error'));
        await nodeServer.register(2);
        await delay(2);
        expect(fetchStub.callCount).to.be.greaterThan(2);
    });

    it('should deregister from hub', async () => {
        fetchStub.resolves({});
        await nodeServer.deregister();
        expect(fetchStub).to.have.been.calledWith(
            `http://${nodeConfig.value.hubHost}:${nodeConfig.value.hubPort}/grid/node`,
            {
                method: 'DELETE',
                body: JSON.stringify({ config: nodeConfig.value }),
                headers: { 'Content-Type': 'application/json' },
            },
        );
    });

    it('should retry when failed deregistering from hub', async () => {
        fetchStub.rejects(new Error('error'));
        await nodeServer.deregister(2);
        await delay(2);
        expect(fetchStub.callCount).to.be.greaterThan(2);
    });
});
