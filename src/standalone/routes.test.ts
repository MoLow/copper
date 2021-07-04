import * as sinon from 'sinon';
import { fastify, FastifyInstance } from 'fastify';
import { expect } from 'chai';
import { sessionManager } from './sessionManager';
import { registerRoutes } from './routes';

describe('standalone routes', () => {
    let fastifyInstance: FastifyInstance;
    beforeEach(async () => {
        fastifyInstance = fastify();
        await fastifyInstance.register(registerRoutes);
        await fastifyInstance.ready();
    });

    afterEach(async () => {
        await fastifyInstance.close();
    });

    it('should return server status', async () => {
        const response = await fastifyInstance.inject({ method: 'GET', url: '/status' });
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.equal(JSON.stringify({ ready: true, message: 'Copper Is Ready' }));
    });

    it('should list sessions', async () => {
        const stub = sinon.stub(sessionManager, 'listSessions').returns([{ id: '1' }, { id: '2' }] as any);
        const response = await fastifyInstance.inject({ method: 'GET', url: '/sessions' });
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.equal(JSON.stringify({ status: 0, value: [{ id: '1' }, { id: '2' }] }));
        expect(stub).to.have.been.calledOnce;
        stub.restore();
    });

    it('should create a session', async () => {
        const stub = sinon.stub(sessionManager, 'createSession').resolves({ id: '1' } as any);
        const response = await fastifyInstance.inject({ method: 'POST', url: '/session' });
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.equal(
            JSON.stringify({
                status: 0,
                value: {
                    id: '1',
                    webSocketDebuggerUrl: 'ws://localhost:80/ws/1',
                    'goog:chromeOptions': { debuggerAddress: 'localhost:80/ws/1' },
                },
                sessionId: '1',
            }),
        );
        expect(stub).to.have.been.calledOnce;
        stub.restore();
    });

    it('should get session info', async () => {
        const stub = sinon.stub(sessionManager, 'getSession').returns({ id: '1' } as any);
        const response = await fastifyInstance.inject({ method: 'GET', url: '/session/1' });
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.equal(JSON.stringify({ status: 0, value: { id: '1' }, sessionId: '1' }));
        expect(stub).to.have.been.calledOnce;
        stub.restore();
    });

    it('should remove a session', async () => {
        const stub = sinon.stub(sessionManager, 'removeSession').resolves({ id: '1' } as any);
        const response = await fastifyInstance.inject({ method: 'DELETE', url: '/session/1' });
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.equal(JSON.stringify({ status: 0, value: null, sessionId: null, state: 'success' }));
        expect(stub).to.have.been.calledOnce;
        stub.restore();
    });
});
