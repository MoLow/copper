import * as chai from 'chai';
import * as uuid from 'uuid';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as proxyquire from 'proxyquire';
import * as chaiAsPromised from 'chai-as-promised';
import * as chaiShallowDeepEqual from 'chai-shallow-deep-equal';
import { expect } from 'chai';
import type { Grid as GridType, Node as NodeType } from './grid';
import { NoMatchingNode, SessionNotFound } from '../common/errors';
import { copperConfig } from '../standalone/config';
import { delay } from '../common/utils';

chai.use(sinonChai);
chai.use(chaiAsPromised);
chai.use(chaiShallowDeepEqual);

const nodeHost = '127';
const nodePort = '127';
const nodeConfig: any = { hubHost: '', hubPort: 1, nodePolling: 1, port: nodePort, host: nodeHost };

const fetchStub = sinon.stub();

const { Grid, Node } = proxyquire.noCallThru()('./grid', { 'node-fetch': { default: fetchStub } }) as {
    Grid: typeof GridType;
    Node: typeof NodeType;
};

describe('node', () => {
    let node: NodeType;
    let checkIsAliveStub: sinon.SinonStub;
    beforeEach(() => {
        checkIsAliveStub = sinon.stub(Node.prototype, 'checkIsAlive' as any).returns(undefined);
        node = new Node({ ...nodeConfig });
    });

    afterEach(() => {
        copperConfig.reset();
        sinon.restore();
        fetchStub.reset();
    });

    it('should set default urlPrefix', () => {
        copperConfig.value.routesPrefix = 'abcd';
        node = new Node({ ...nodeConfig });
        expect(node.urlPrefix).to.equal('abcd');
    });

    it('should set default maxSession', () => {
        expect(node.freeSlots).to.equal(Number.POSITIVE_INFINITY);
    });

    it('should set default maxSession when set to number smaller than 1', () => {
        node = new Node({ ...nodeConfig, maxSession: -1 });
        expect(node.freeSlots).to.equal(Number.POSITIVE_INFINITY);
    });

    it('should set default nodePolling', () => {
        node = new Node({ ...nodeConfig, nodePolling: undefined });
        expect((node as any).config.nodePolling).to.equal(10000);
    });

    it('should calculate a node id using its host and port', () => {
        expect(Node.getId(nodeConfig)).to.equal(`${nodeHost}:${nodePort}`);
        expect(node.id).to.equal(`${nodeHost}:${nodePort}`);
    });

    it('should calculate node urls', () => {
        expect(node.URL).to.equal(`http://${nodeHost}:${nodePort}`);
        expect(node.webSocketURL).to.equal(`ws://${nodeHost}:${nodePort}`);
    });

    describe('sessions', () => {
        it('should register session', () => {
            expect(node.getSessions().length).to.equal(0);
            node.registerSession('1');
            expect(node.getSessions().length).to.equal(1);
        });
        it('should deregister session', () => {
            expect(node.getSessions().length).to.equal(0);
            node.registerSession('1');
            expect(node.getSessions().length).to.equal(1);
            node.deregisterSession('1');
            expect(node.getSessions().length).to.equal(0);
        });
        it('should count node free slots', () => {
            expect(node.freeSlots).to.equal(Number.POSITIVE_INFINITY);
            node.registerSession('1');
            expect(node.freeSlots).to.equal(Number.POSITIVE_INFINITY - 1);
            node.deregisterSession('1');
            expect(node.freeSlots).to.equal(Number.POSITIVE_INFINITY);
        });
    });

    describe('checkIsAlive', () => {
        let processNextTickStub: sinon.SinonStub;
        beforeEach(() => {
            checkIsAliveStub.restore();
            sinon.restore();
            processNextTickStub = sinon.stub(process, 'nextTick').callsFake((cb: any) => cb());
            node = new Node({ ...nodeConfig, nodePolling: 1 });
        });
        afterEach(() => {
            processNextTickStub.restore();
        });
        it('should mark node is alive', async () => {
            fetchStub.returns(undefined);
            node = new Node(nodeConfig);
            await delay(1); //wait for nextTick
            expect(fetchStub).to.have.been.called;
            expect(node.canCreateSession).to.equal(true);
        });
        it('should mark node as not alive when keep alive fails', async () => {
            fetchStub.throws(new Error('error'));
            node = new Node(nodeConfig);
            await delay(1); //wait for nextTick
            expect(node.canCreateSession).to.equal(false);
            expect(fetchStub).to.have.been.called;
        });
        it('should mark node as not alive when deregistring node', async () => {
            fetchStub.returns(undefined);
            node = new Node(nodeConfig);
            await delay(1); //wait for nextTick
            expect(node.canCreateSession).to.equal(true);
            node.deregister();
            expect(node.canCreateSession).to.equal(false);
        });
        it('should loop using nextTick', async () => {
            fetchStub.returns(undefined);
            const stub = sinon.stub(Node.prototype, 'checkIsAlive' as any).callThrough();
            node = new Node({ ...nodeConfig, nodePolling: 1 });
            expect(stub).to.have.been.calledOnce;
            expect((node as any).shouldCheckIsAlive).to.equal(true);
            await delay(2);
            node.deregister();
            expect(stub.callCount).to.be.greaterThanOrEqual(2);
            expect(processNextTickStub.callCount).to.equal(stub.callCount - 1);
            expect((node as any).shouldCheckIsAlive).to.equal(false);
        });
    });
});

describe('grid', () => {
    let grid: GridType;
    beforeEach(() => {
        grid = new Grid();
        sinon.stub(Node.prototype, 'checkIsAlive' as any).callsFake(function (this: any) {
            this.isAlive = true;
        });
        fetchStub.resolves({
            json: () => {
                const sessionId = uuid.v4();
                return { sessionId, value: { id: sessionId } };
            },
        });
    });

    afterEach(() => {
        sinon.restore();
        fetchStub.reset();
    });

    function assertGridNodesCount(count: number) {
        expect((grid as any).nodes.size).to.equal(count);
    }

    describe('register node', () => {
        it('should register node', () => {
            const node = grid.registerNode(nodeConfig);
            assertGridNodesCount(1);
            expect((grid as any).nodes.get(node.id)).to.equal(node);
        });
    });

    describe('deregister node', () => {
        it('should deregister node', () => {
            grid.registerNode(nodeConfig);
            assertGridNodesCount(1);
            grid.deregisterNode(nodeHost, nodePort);
            assertGridNodesCount(0);
        });

        it('should throw when deregestring unregistered node', () => {
            expect(() => grid.deregisterNode(nodeHost, 2)).to.throw(NoMatchingNode);
        });

        it('should mark node as deregisterd for stopping alive checks', () => {
            const node = grid.registerNode(nodeConfig);
            const stub = sinon.stub(node, 'deregister').callThrough();
            grid.deregisterNode(nodeHost, nodePort);
            expect(stub).to.have.been.calledOnce;
        });

        it('should remove all nodes sessions', async () => {
            (grid.registerNode(nodeConfig) as any).isAlive = true;
            const stub = sinon.stub(Grid.prototype, '_removeSession').callThrough();
            await grid.createSession();
            expect(grid.listSessions().length).to.equal(1);
            grid.deregisterNode(nodeHost, nodePort);
            expect(grid.listSessions().length).to.equal(0);
            expect(stub).to.have.been.calledOnce;
        });
    });

    describe('sessions', () => {
        describe('createSession', () => {
            it('should throw if no nodes to create session on', () => {
                expect(grid.createSession()).to.be.rejectedWith(NoMatchingNode);
            });

            it('should create session on node and register it', async () => {
                grid.registerNode(nodeConfig);
                await grid.createSession();
                expect(grid.listSessions().length).to.equal(1);
                expect(fetchStub).to.have.been.calledOnce;
            });

            it('should create session on node with biggest number of free slots', async () => {
                const mediumNode = grid.registerNode({ ...nodeConfig, port: 3, maxSession: 7 });
                const bigNode = grid.registerNode({ ...nodeConfig, maxSession: 10 });
                const smallNode = grid.registerNode({ ...nodeConfig, port: 2, maxSession: 5 });
                const smallNodeRegister = sinon.stub(smallNode, 'registerSession').callThrough();
                const mediumNodeRegister = sinon.stub(mediumNode, 'registerSession').callThrough();
                const bigNodeRegister = sinon.stub(bigNode, 'registerSession').callThrough();
                await grid.createSession();
                expect(smallNodeRegister).not.to.have.been.called;
                expect(mediumNodeRegister).not.to.have.been.called;
                expect(bigNodeRegister).to.have.been.calledOnce;
            });

            it('should pass create session options to node', async () => {
                grid.registerNode(nodeConfig);
                await grid.createSession({ foo: 'bar' });
                expect(fetchStub).to.have.been.calledOnce;
                expect((fetchStub.getCall(0).args[1] as any).body).to.equal(JSON.stringify({ foo: 'bar' }));
            });
        });

        it('should get node by session id', async () => {
            const node = grid.registerNode(nodeConfig);
            const session = await grid.createSession();
            expect(grid.getNode(session.id)).to.equal(node);
        });

        it('getNode should throw when no matching session', () => {
            expect(() => grid.getNode(uuid.v4())).to.throw(SessionNotFound);
        });

        it('should get session by session id', async () => {
            grid.registerNode(nodeConfig);
            const session = await grid.createSession();
            expect(grid.getSession(session.id)).to.shallowDeepEqual(session);
        });

        it('getSession should throw when no matching session', () => {
            expect(() => grid.getSession(uuid.v4())).to.throw(SessionNotFound);
        });

        it('should get a session websocket url', async () => {
            grid.registerNode(nodeConfig);
            const session = await grid.createSession();
            expect(grid.getWebSocketUrl(session.id)).to.equal(`ws://${nodeHost}:${nodePort}/ws/${session.id}`);
        });

        it('should remove session from node', async () => {
            const node = grid.registerNode(nodeConfig);
            const stub = sinon.stub(node, 'deregisterSession').callThrough();
            const session = await grid.createSession();
            await grid.removeSession(session.id);
            expect(stub).to.have.been.calledOnce;
            expect(fetchStub).to.have.been.calledTwice;
        });
    });
});
