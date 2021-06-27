import fetch from 'node-fetch';
import { NoMatchingNode, SessionNotFound } from "../common/errors";
import { delay, removeWsUrl } from '../common/utls';
import { logger } from '../logger';
import { serializedSession } from '../standalone/sessionManager';

export interface NodeConfig {
    host?: string;
    port?: string;
    hubHost: string;
    hubPort: string;
    maxSession: number;
    nodePolling: number;
}


export class Node {
    private sessions = new Set<string>();
    private isAlive = false;

    constructor(private config: NodeConfig) {
        this.config.maxSession = this.config.maxSession ?? Number.POSITIVE_INFINITY;
        if(this.config.maxSession === 1) {
            this.config.maxSession = Number.POSITIVE_INFINITY;
        }
        this.checkIsAlive();
    };

    static getId(config: Pick<NodeConfig, 'host' | 'port'>) {
        return `${config.host}:${config.port}`;
    }

    get id() {
        return Node.getId(this.config);
    }

    get URL() {
        return `http://${this.config.host}:${this.config.port}`;
    }
    get webSocketURL() {
        return `ws://${this.config.host}:${this.config.port}`;
    }

    get freeSlots() {
        return this.config.maxSession - this.sessions.size;
    }
    
    get canCreateSession() {
        return this.freeSlots > 0 && this.isAlive;
    }

    getSessions() {
        return Array.from(this.sessions);
    }

    registerSession(id: string) {
        this.sessions.add(id);
    }

    deregisterSession(id: string) {
        this.sessions.delete(id);
    }
    private async checkIsAlive() {
        try {
            await fetch(`${this.URL}/wd/hub/status`, { timeout: 1000 });
            if (!this.isAlive) {
                logger.warn(`grid ${this.id} connected`);
            }
            this.isAlive = true;
        } catch (err) {
            if (this.isAlive) {
                logger.warn(`grid ${this.id} disconnected`);
            }
            this.isAlive = false;
        }
        await delay(this.config.nodePolling || 10000);
        process.nextTick(() => this.checkIsAlive());

    }
}

export class Grid {
    private nodes = new Map<string, Node>();
    private sessionNodeMap = new Map<string, string>();
    private sessions = new Map<string, serializedSession>();

    registerNode(config: NodeConfig) {
        const node = new Node(config);
        this.nodes.set(node.id, node);
        return node;
    }

    async deregisterNode(host: string, port: string) {
        const nodeId = Node.getId({ host, port });
        if (!this.nodes.has(nodeId)) {
            throw new NoMatchingNode(`node ${nodeId} not registerd`);
        }

        const node = this.nodes.get(nodeId)!;
        this.nodes.delete(nodeId);
        node.getSessions().map(sessionId => this._removeSession(sessionId));
    }

    async createSession(body: string) {
        const candidates = Array.from(this.nodes.values()).filter((node) => node.canCreateSession);
        const node = candidates.length ? 
            candidates.reduce((prev, curr) => curr.freeSlots > prev.freeSlots ? curr : prev) :
            null;

        if (!node) {
            throw new NoMatchingNode('cannot find a free node to create a session on');
        }

        const session: { sessionId: string , value: serializedSession } = await fetch(`${node.URL}/wd/hub/session`, {
            method: 'POST',
            body,
            headers: {'Content-Type': 'application/json'}
        }).then(res => res.json());
        node.registerSession(session.sessionId);
        this.sessionNodeMap.set(session.sessionId, node.id);
        this.sessions.set(session.sessionId, removeWsUrl(session.value));

        return session.value;
    }

    getWebSocketUrl(sessionId: string) {
        return `${this.getNode(sessionId).webSocketURL}/ws/${sessionId}`;
    }

    listSessions() {
        return Array.from(this.sessions.values());
    }
    
    getSession(id: string) {
        if (!this.sessions.has(id)) {
            throw new SessionNotFound(id);
        }
        return this.sessions.get(id)!;
    }

    getNode(sessionId: string) {
        const nodeId = this.sessionNodeMap.get(this.getSession(sessionId)!.id)!;
        if (!this.nodes.has(nodeId)) {
            throw new NoMatchingNode(`node ${nodeId} not registerd`);
        }

        return this.nodes.get(nodeId)!;
    }

    _removeSession(sessionId: string) {
        this.getSession(sessionId); // throw if no session
        this.sessionNodeMap.delete(sessionId);
        this.sessions.delete(sessionId);
    }

    async removeSession(sessionId: string) {
        const node = this.getNode(sessionId);
        node.deregisterSession(sessionId);
        this._removeSession(sessionId);
        return await fetch(`${node.URL}/wd/hub/session/${sessionId}`, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'}
        }).then(res => res.json());
    }
}

export const grid = new Grid();