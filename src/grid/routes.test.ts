import * as sinon from 'sinon';
import * as http from 'http';
import * as httpProxy from 'http-proxy';
import { fastify, FastifyInstance } from 'fastify';
import { expect } from 'chai';
import { grid } from './grid';
import { registerGridRoutes } from './gridRoutes';
import { registerSessionProxy } from './sessionProxy';
import { registerSessionRoutes } from './sessionRoutes';

describe('grid', () => {
    describe('gridRoutes', () => {
        let fastifyInstance: FastifyInstance;
        beforeEach(async () => {
            fastifyInstance = fastify();
            await fastifyInstance.register(registerGridRoutes);
            await fastifyInstance.ready();
        });

        afterEach(async () => {
            await fastifyInstance.close();
        });

        it('should return server status', async () => {
            const response = await fastifyInstance.inject({ method: 'GET', url: '/status' });
            expect(response.statusCode).to.equal(200);
            expect(response.body).to.equal(JSON.stringify({ ready: true, message: 'Copper Grid Is Ready' }));
        });

        it('should register node on grid', async () => {
            const stub = sinon.stub(grid, 'registerNode').resolves({ id: '1' });
            const response = await fastifyInstance.inject({
                method: 'POST',
                url: '/node',
                payload: { config: { port: 3000 } },
            });
            expect(response.statusCode).to.equal(200);
            expect(response.body).to.equal(JSON.stringify({ status: 0, nodeId: '1' }));
            expect(stub).to.have.been.calledOnce;
            expect(stub).to.have.been.calledWith({ port: 3000, host: 'localhost' });
            stub.restore();
        });

        it('should deregister node on grid', async () => {
            const stub = sinon.stub(grid, 'deregisterNode').resolves({});
            const response = await fastifyInstance.inject({
                method: 'DELETE',
                url: '/node',
                payload: { config: { port: 3000 } },
            });
            expect(response.statusCode).to.equal(200);
            expect(response.body).to.equal(JSON.stringify({ status: 0 }));
            expect(stub).to.have.been.calledOnce;
            expect(stub).to.have.been.calledWith('localhost', 3000);
            stub.restore();
        });

        afterEach(async () => {
            await fastifyInstance.close();
        });
    });

    describe('sessionProxy', () => {
        let fastifyInstance: FastifyInstance;
        let httpProxyStub: sinon.SinonStub;
        let httpProxyWebStub: sinon.SinonStub;
        let getNodeStub: sinon.SinonStub;
        beforeEach(async () => {
            httpProxyWebStub = sinon.stub().callsFake((req: http.IncomingMessage, res: http.ServerResponse) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                let body = '';
                req.on('readable', function () {
                    body += req.read();
                });
                req.on('end', function () {
                    res.end(body);
                });
            });
            httpProxyStub = sinon.stub(httpProxy, 'createProxyServer').returns({ web: httpProxyWebStub } as any);
            getNodeStub = sinon.stub(grid, 'getNode').returns({ id: '1', URL: 'url' } as any);
            fastifyInstance = fastify();
            await fastifyInstance.register(registerSessionProxy);
            await fastifyInstance.ready();
        });

        afterEach(async () => {
            await fastifyInstance.close();
            httpProxyStub.restore();
            getNodeStub.restore();
        });

        it('should proxy session requests', async () => {
            const response = await fastifyInstance.inject({
                method: 'GET',
                url: '/session/1',
            });
            expect(httpProxyWebStub).to.have.been.calledOnce;
            expect(httpProxyWebStub.getCall(0).args[2]).to.eql({ target: 'url' });
            expect(response.statusCode).to.equal(200);
        });

        it('should not parse requests with content-type application/json', async () => {
            const response = await fastifyInstance.inject({
                method: 'POST',
                url: '/session/1/any',
                headers: { 'Content-Type': 'application/json' },
                payload: { foo: 'bar' },
            });
            expect(response.statusCode).to.equal(200);
            expect(response.body).to.equal(JSON.stringify({ foo: 'bar' }));
        });

        it('should not parse requests with content-type text/plain', async () => {
            const response = await fastifyInstance.inject({
                method: 'POST',
                url: '/session/1/any',
                headers: { 'Content-Type': 'text/plain' },
                payload: 'foo',
            });
            expect(response.statusCode).to.equal(200);
            expect(response.body).to.equal('foo');
        });

        afterEach(async () => {
            await fastifyInstance.close();
        });
    });

    describe('sessionRoutes', () => {
        let fastifyInstance: FastifyInstance;
        beforeEach(async () => {
            fastifyInstance = fastify();
            await fastifyInstance.register(registerSessionRoutes);
            await fastifyInstance.ready();
        });

        it('should return server status', async () => {
            const response = await fastifyInstance.inject({ method: 'GET', url: '/status' });
            expect(response.statusCode).to.equal(200);
            expect(response.body).to.equal(JSON.stringify({ ready: true, message: 'Copper Grid Is Ready' }));
        });

        it('should list grid sessions', async () => {
            const stub = sinon.stub(grid, 'listSessions').returns([{ id: '1' }, { id: '2' }] as any);
            const response = await fastifyInstance.inject({ method: 'GET', url: '/sessions' });
            expect(response.statusCode).to.equal(200);
            expect(response.body).to.equal(JSON.stringify({ status: 0, value: [{ id: '1' }, { id: '2' }] }));
            expect(stub).to.have.been.calledOnce;
            stub.restore();
        });

        it('should create a session on the grid', async () => {
            const stub = sinon.stub(grid, 'createSession').resolves({ id: '1' } as any);
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

        it('should remove a session from the grid', async () => {
            const stub = sinon.stub(grid, 'removeSession').resolves({ id: '1' } as any);
            const response = await fastifyInstance.inject({ method: 'DELETE', url: '/session/1' });
            expect(response.statusCode).to.equal(200);
            expect(response.body).to.equal(JSON.stringify({ id: '1' }));
            expect(stub).to.have.been.calledOnce;
            stub.restore();
        });

        afterEach(async () => {
            await fastifyInstance.close();
        });
    });
});
