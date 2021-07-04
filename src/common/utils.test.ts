import { expect } from 'chai';
import { addWsUrl, removeWsUrl } from './utils';

describe('utils', () => {
    it('adds websocket url to a session returned to client', () => {
        const session = { id: 'id' };
        const req: any = { headers: { host: 'localhost' } };
        const result = addWsUrl(req, session);
        expect(result).to.eql({
            ...session,
            webSocketDebuggerUrl: 'ws://localhost/ws/id',
            'goog:chromeOptions': {
                debuggerAddress: 'localhost/ws/id',
            },
        });
        expect(result).to.not.equal(session);
    });

    it('removes websocket url from a session returned to client', () => {
        const session = {
            id: 'id',
            webSocketDebuggerUrl: 'ws://localhost/ws/id',
            'goog:chromeOptions': {
                debuggerAddress: 'localhost/ws/id',
            },
        };
        const result = removeWsUrl(session);
        expect(result).to.eql({
            id: 'id',
            webSocketDebuggerUrl: undefined,
            'goog:chromeOptions': undefined,
        });
        expect(result).to.not.equal(session);
    });
});
