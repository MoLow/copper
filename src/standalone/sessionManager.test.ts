import * as sinon from 'sinon';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as mkdirp from 'mkdirp';
import * as readDir from 'recursive-readdir';
import * as os from 'os';
import * as proxyquire from 'proxyquire';
import * as puppeteer from 'puppeteer-core';
import { SessionManager as SessionManagerType } from './sessionManager';
import { expect } from 'chai';
import { CreateSessionError, SessionNotFound } from '../common/errors';
import { copperConfig } from './config';

const fetchStub = sinon.stub();
const mkdirpStub = sinon.stub();
const chromeLaunch = sinon.stub();
const chromeKill = sinon.stub();

const { SessionManager } = proxyquire.noCallThru()('./sessionManager', {
    'node-fetch': { default: fetchStub },
    'chrome-launcher': { launch: chromeLaunch },
    mkdirp: mkdirpStub,
}) as { SessionManager: typeof SessionManagerType };

describe('sessionManger', () => {
    let sessionManager: SessionManagerType;
    let tmpdir: string;
    beforeEach(async () => {
        sessionManager = new SessionManager();
        tmpdir = path.join(os.tmpdir(), 'unittests');
        await mkdirp(tmpdir);
        fetchStub.resolves({ json: () => ({ webSocketDebuggerUrl: 'webSocketDebuggerUrl' }) });
        mkdirpStub.resolves();
        chromeLaunch.resolves({ port: 1, pid: 2, kill: chromeKill });
        copperConfig.value.enableW3CProtocol = false;
    });

    afterEach(async () => {
        sinon.restore();
        fetchStub.reset();
        mkdirpStub.reset();
        chromeLaunch.reset();
        chromeKill.reset();
        copperConfig.reset();
        await fs.remove(tmpdir);
    });

    describe('parse configuration', () => {
        it("should parse chromeOptions from desiredCapabilities['goog:chromeOptions']", () => {
            const opts = {};
            expect((sessionManager as any).getChromeOptions({ 'goog:chromeOptions': opts })).to.equal(opts);
        });

        it('should parse chromeOptions from desiredCapabilities.chromeOptions', () => {
            const opts = {};
            expect((sessionManager as any).getChromeOptions({ chromeOptions: opts })).to.equal(opts);
        });

        it('should parse capabilities from desiredCapabilities.capabilities.firstMatch', () => {
            const caps = {};
            expect(
                (sessionManager as any).parseSessionRequest({ capabilities: { firstMatch: [caps] } }).capabilities,
            ).to.equal(caps);
        });

        it('should parse capabilities from desiredCapabilities.desiredCapabilities', () => {
            const caps = {};
            expect((sessionManager as any).parseSessionRequest({ desiredCapabilities: caps }).capabilities).to.equal(
                caps,
            );
        });

        it('should have default desiredCapabilities', () => {
            expect((sessionManager as any).parseSessionRequest().capabilities).to.eql({ browserName: 'chrome' });
        });
    });

    describe('webdriver specific args', () => {
        it('should handle chrome profile', async () => {
            sinon.stub(os, 'tmpdir').returns(tmpdir);
            await (sessionManager as any).handleChromeProfile();
            expect(mkdirpStub).to.have.been.calledWith(`${tmpdir}/puppeteer_dev_chrome_profile-`);
        });

        it('should unzip an extension and save it locally', async () => {
            const EMPTY_ZIP =
                'UEsDBBQACAAIAIBT5FIAAAAAAAAAAAEAAAANACAAZW1wdHlmaWxlLnR4dFVUDQAHAGPhYLRm4WCyZuFgdXgLAAEE9QEAAAQUAAAAMwQAUEsHCLfv3IMDAAAAAQAAAFBLAQIUAxQACAAIAIBT5FK379yDAwAAAAEAAAANACAAAAAAAAAAAACkgQAAAABlbXB0eWZpbGUudHh0VVQNAAcAY+FgtGbhYLJm4WB1eAsAAQT1AQAABBQAAABQSwUGAAAAAAEAAQBbAAAAXgAAAAAA';
            await (sessionManager as any).saveExtensionLocally(EMPTY_ZIP, tmpdir);
            const files = await readDir(tmpdir);
            expect(files).to.have.lengthOf(1);
            expect(files[0]).to.contain('emptyfile.txt');
        });

        it('should cache extensions that are already uploaded', async () => {
            const EMPTY_ZIP = 'UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==';
            const upload1 = await (sessionManager as any).saveExtensionLocally(EMPTY_ZIP, tmpdir);
            const upload2 = await (sessionManager as any).saveExtensionLocally(EMPTY_ZIP, tmpdir);

            expect(upload1).to.equal(upload2);
        });

        it('should throw on invalid zip files', async () => {
            const INVALID_ZIP = 'abcd';
            await expect((sessionManager as any).saveExtensionLocally(INVALID_ZIP, '/path/does/not/exist')).to.be
                .rejected;
        });

        it('should handle multiple extensions', async () => {
            const EMPTY_ZIP = 'UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==';
            sinon.stub(os, 'tmpdir').returns(tmpdir);
            await (sessionManager as any).handleExtensions(
                { chromeOptions: { extensions: [EMPTY_ZIP] } },
                'extensions',
            );
            expect(mkdirpStub).to.have.been.calledWith(`${tmpdir}/extensions`);
        });

        it('should ignore a session with no extensions passed', async () => {
            sinon.stub(os, 'tmpdir').returns(tmpdir);
            await (sessionManager as any).handleExtensions({}, 'extensions');
            expect(mkdirpStub).to.not.have.been.called;
        });
    });

    describe('createSession', () => {
        it('should create a session', async () => {
            const session = await sessionManager.createSession();
            expect(session).to.shallowDeepEqual({ pid: 2, port: 1 });
            expect(chromeLaunch).to.have.been.calledWith({});
        });

        it('should accept args from chromeOptions', async () => {
            await sessionManager.createSession({
                chromeOptions: { chromeFlags: ['--foo'] },
            });
            expect(chromeLaunch).to.have.been.calledWith({ chromeFlags: ['--foo'] });
        });

        it('should accept args from desiredCapabilities', async () => {
            await sessionManager.createSession({
                desiredCapabilities: { chromeOptions: { args: ['--foo'] }, browserName: 'chrome' },
            });
            expect(chromeLaunch).to.have.been.calledWith({ chromeFlags: ['--foo'], ignoreDefaultFlags: true });
        });

        it('should throw error when failed to create a browser', async () => {
            chromeLaunch.rejects();
            await expect(sessionManager.createSession()).to.be.rejectedWith(CreateSessionError);
        });

        it('should create a puppeteer instance when enableW3CProtocol is enabled', async () => {
            copperConfig.value.enableW3CProtocol = true;
            const stub = sinon.stub(puppeteer, 'connect').resolves({ pages: () => Promise.resolve([]) } as any);
            const session = await sessionManager.createSession();
            expect(session).to.shallowDeepEqual({ pid: 2, port: 1 });
            expect(stub).to.have.been.calledWith({ browserWSEndpoint: 'webSocketDebuggerUrl' });
        });
    });

    describe('removeSession', () => {
        it('should remove a session', async () => {
            const session = await sessionManager.createSession();
            await sessionManager.removeSession(session.id);
            expect(chromeKill).to.have.been.called;
        });

        it('should catch when failed to remove a session', async () => {
            chromeKill.rejects();
            const session = await sessionManager.createSession();
            await expect(sessionManager.removeSession(session.id)).not.to.be.rejected;
        });

        it('should disconnect puppeteer instance when exists', async () => {
            copperConfig.value.enableW3CProtocol = true;
            const stub = sinon.stub().resolves();
            sinon.stub(puppeteer, 'connect').resolves({ pages: () => Promise.resolve([]), disconnect: stub } as any);
            const session = await sessionManager.createSession();
            await sessionManager.removeSession(session.id);
            expect(stub).to.have.been.called;
        });
    });

    it('should return session websocket url', async () => {
        const session = await sessionManager.createSession();
        expect(sessionManager.getWebSocketUrl(session.id)).to.equal('webSocketDebuggerUrl');
    });

    it('should return session puppeteer instance', async () => {
        copperConfig.value.enableW3CProtocol = true;
        const pages: any[] = [{}];
        const puppeteerInstance = { pages: () => Promise.resolve(pages) } as any;
        sinon.stub(puppeteer, 'connect').resolves(puppeteerInstance);
        const session = await sessionManager.createSession();
        expect(sessionManager.getPuppeteer(session.id)).to.eql({ browser: puppeteerInstance, page: pages[0] });
    });

    it('should not have a puppeteer instance when enableW3CProtocol is disabled', async () => {
        copperConfig.value.enableW3CProtocol = false;
        const session = await sessionManager.createSession();
        expect(sessionManager.getPuppeteer(session.id)).to.be.undefined;
    });

    it('should get a session by id', async () => {
        const session = await sessionManager.createSession();
        expect(sessionManager.getSession(session.id)).to.eql(session);
    });

    it('should throw when no matching session', () => {
        expect(() => sessionManager.getSession('foo')).to.throw(SessionNotFound);
    });

    it('should list all sessions', async () => {
        const session = await sessionManager.createSession();
        const sessions = await sessionManager.listSessions();
        expect(sessions).to.have.lengthOf(1);
        expect(sessions[0]).to.shallowDeepEqual(session);
    });
});
