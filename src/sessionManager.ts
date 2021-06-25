import * as os from 'os';
import * as path from 'path';
import * as stream from 'stream';
import * as unzipper from 'unzipper';
import * as mkdirp from 'mkdirp';
import * as uuid from 'uuid';
import * as WebSocket from 'ws';
import { launch, Options, LaunchedChrome } from 'chrome-launcher';
import { logger } from './logger';
import { CreateSessionError, SessionNotFound } from './errors';
import fetch from 'node-fetch';

export type SessionOptions = Omit<Options, 'handleSIGINT'>;

export interface Session {
    chrome: LaunchedChrome,
    webSocket: WebSocket;
    wsInfo: { Browser: string, "Protocol-Version": string, "User-Agent": string, "V8-Version": string, "WebKit-Version": string, webSocketDebuggerUrl: string }
}

const chomreOptionsPath = ['chromeOptions', 'goog:chromeOptions'] as const;

type desiredCapabilities = Partial<Record<typeof chomreOptionsPath[number], { 
    args?: Array<string>;
    extensions?: Array<string>
}>>;

export class SessionManager {
    private sessions = new Map<string, Session>();

    private serializeSession(id: string, session: Session) {
        return {
            ...session.wsInfo,
            id,
            port: session.chrome.port,
            pid: session.chrome.pid,
            webSocketDebuggerUrl: undefined,
        }
    }

    private getChromeOptions(desiredCapabilities: desiredCapabilities) {
        return desiredCapabilities['goog:chromeOptions'] || desiredCapabilities.chromeOptions;
    }
    
    private async handleExtensions(desiredCapabilities: desiredCapabilities, sessionId: string) {
        const chromeOptions = this.getChromeOptions(desiredCapabilities);
        if (!chromeOptions?.extensions?.length) {
            return;
        }
        const extDir = path.join(os.tmpdir(), sessionId);
        await mkdirp(extDir);
        chromeOptions.args = chromeOptions.args || [];
        const extensions: string[] =  desiredCapabilities?.chromeOptions?.extensions || [];
        await Promise.all(extensions.map(extention => new Promise<void>((resolve, reject) => {
            const file = path.join(extDir, uuid.v4().toUpperCase());
            const readStream = stream.Readable.from(Buffer.from(extention, 'base64'));
            logger.info(`writing extension to ${file}`);
            readStream
                .pipe(unzipper.Extract({ path: file }))
                .on('error', err => reject(err))
                .on('finish', () => {
                    chromeOptions.args!.push(`--load-extension=${file}`);
                    resolve();
                })
        })));
    }

    async createSession(opts: SessionOptions = {}, desiredCapabilities: desiredCapabilities = {}) {
        const id = uuid.v4().toUpperCase();
        
        try {
            await this.handleExtensions(desiredCapabilities, id);
            const options = Object.assign({}, opts, desiredCapabilities ? {
                chromeFlags: [ ...this.getChromeOptions(desiredCapabilities)?.args || [] ],
                ignoreDefaultFlags: true
            } : {});

            const chrome = await launch(options);
            const wsInfo = await fetch(`http://localhost:${chrome.port}/json/version`).then(res => res.json());
            const webSocket = new WebSocket(wsInfo.webSocketDebuggerUrl, { timeout: 5000 });
            const session = { chrome , wsInfo, webSocket }
            this.sessions.set(id, session);
            return this.serializeSession(id, session);
        } catch (err) {
            logger.error('error creating a session', { err, id });
            throw new CreateSessionError(err);
        }
    }

    async removeSession(id: string) {
        if (!this.sessions.has(id)) {
            throw new SessionNotFound(id);
        }
        try {
            const session = this.sessions.get(id)!;
            await session.webSocket.close();
            await session.chrome.kill();
        } catch (err) {
            logger.error('error removing a session', { err, id });
        } finally {
            this.sessions.delete(id);
        }
    }

    getSession(id: string) {
        if (!this.sessions.has(id)) {
            throw new SessionNotFound(id);
        }

        const session = this.sessions.get(id)!;
        return this.serializeSession(id, session);
    }

    getSessionWebsocket(id: string) {
        if (!this.sessions.has(id)) {
            throw new SessionNotFound(id);
        }

        const session = this.sessions.get(id)!;
        return session.webSocket;
    }

    listSessions() {
        return Array.from(this.sessions.entries()).map(([id, session]) => this.serializeSession(id, session));
    }
}

export const sessionManager = new SessionManager();
