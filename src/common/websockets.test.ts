import * as http from 'http';
import * as sinon from 'sinon';
import * as WebSocket from 'ws';
import * as httpProxy from 'http-proxy';
import { expect } from 'chai';
import fastify, { FastifyInstance } from 'fastify';
import { IWebSocketHandler, registerWebsocket } from './websockets';
import { Socket } from 'net';
import { delay } from './utils';
import { copperConfig } from '../standalone/config';

describe('sessionProxy', () => {
    let fastifyInstance: FastifyInstance;
    let httpProxyStub: sinon.SinonStub;
    let httpProxyWSStub: sinon.SinonStub;
    let proxyEventHandlers: any;
    let port: number;
    let handlerMock: sinon.SinonStubbedInstance<IWebSocketHandler>;
    beforeEach(async () => {
        const wsServer = new WebSocket.Server({ noServer: true });
        proxyEventHandlers = {};
        httpProxyWSStub = sinon.stub().callsFake((req: http.IncomingMessage, socket: Socket, head: any) => {
            wsServer.handleUpgrade(req, socket, head, (socket: WebSocket) => {
                wsServer.emit('connection', socket);
            });
        });
        httpProxyStub = sinon.stub(httpProxy, 'createProxyServer').returns({
            ws: httpProxyWSStub,
            on: sinon.stub().callsFake((name: string, handle: any) => {
                proxyEventHandlers[name] = handle;
            }),
        } as any);
        handlerMock = {
            getWebSocketUrl: sinon.stub().returns('wsUrl'),
            getSession: sinon.stub().returns({ id: 'id' }),
            createSession: sinon.stub().resolves({ id: 'id' }),
        } as any;
        fastifyInstance = fastify();
        registerWebsocket(fastifyInstance, handlerMock, () => ({}));
        await fastifyInstance.listen(0);
        port = (fastifyInstance.server.address() as any).port!;
        await fastifyInstance.ready();
    });

    afterEach(async () => {
        copperConfig.reset();
        httpProxyStub.restore();
        handlerMock.createSession.reset();
        handlerMock.getSession.reset();
        handlerMock.getWebSocketUrl.reset();
        await fastifyInstance.close();
    });

    it('should return a sessions websocket url', async () => {
        const response = await fastifyInstance.inject({
            url: '/ws/id/json/version',
            method: 'GET',
        });
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.equal(JSON.stringify({ id: 'id', webSocketDebuggerUrl: 'ws://localhost:80/ws/id' }));
    });

    it('should proxy websocket connections', async () => {
        const ws = new WebSocket(`ws://localhost:${port}/ws/id`);
        await new Promise<void>((resolve) => ws.once('open', () => resolve()));
        expect(httpProxyWSStub).to.have.been.calledOnce;
        expect(handlerMock.getWebSocketUrl).to.have.been.calledOnce;
        expect(handlerMock.getWebSocketUrl).to.have.been.calledWith('id');
        ws.close();
        await new Promise<void>((resolve) => ws.on('close', () => resolve()));
    });

    it('should create a session if id not passed', async () => {
        const ws = new WebSocket(`ws://localhost:${port}`);
        await new Promise<void>((resolve) => ws.once('open', () => resolve()));
        expect(handlerMock.createSession).to.have.been.calledOnce;
        expect(handlerMock.createSession).to.have.been.calledWith(undefined);
        ws.close();
        await new Promise<void>((resolve) => ws.on('close', () => resolve()));
    });

    it('should use default session options from config', async () => {
        const config = { chromeFlags: ['--headless'] };
        copperConfig.value.defaultSessionOptions = config;
        const ws = new WebSocket(`ws://localhost:${port}`);
        await new Promise<void>((resolve) => ws.once('open', () => resolve()));
        expect(handlerMock.createSession).to.have.been.calledOnce;
        expect(handlerMock.createSession).to.have.been.calledWithMatch({ chromeOptions: config });
        ws.close();
        await new Promise<void>((resolve) => ws.on('close', () => resolve()));
    });

    it('should log and ignore errors', async () => {
        handlerMock.getWebSocketUrl.throws('err');
        const ws = new WebSocket(`ws://localhost:${port}/ws/id`, { timeout: 5 });
        ws.on('error', () => ({}));
        ws.on('unexpected-response', () => ({}));
        await delay(10);
        expect(httpProxyWSStub).not.to.have.been.called;
        expect(ws.readyState).to.equal(ws.CLOSED);
        try {
            ws.close();
        } catch {} //ignore error
    });

    it('should handle proxy error', async () => {
        expect(proxyEventHandlers.error).to.be.a('function');
        expect(() => proxyEventHandlers.error({})).to.not.throw();
    });
});
