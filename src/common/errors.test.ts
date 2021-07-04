import { expect } from 'chai';
import { fastify } from 'fastify';
import {
    CopperError,
    CreateSessionError,
    NoMatchingNode,
    registerErrorHandler,
    SessionNotFound,
    UnsupportedActionError,
    WebdriverError,
} from './errors';

describe('errors', () => {
    it('should parse a CopperError to json', () => {
        const error = new CopperError('message', 'code');
        const json = JSON.stringify(error);
        expect(json).to.equal('{"message":"message","error":"code"}');
    });

    it('SessionNotFound should have 404 error code', () => {
        const error = new SessionNotFound('message');
        expect(error.statusCode).to.equal(404);
    });

    it('CreateSessionError should have 500 error code', () => {
        const error = new CreateSessionError('message');
        expect(error.statusCode).to.equal(500);
    });

    it('UnsupportedActionError should have 501 error code', () => {
        const error = new UnsupportedActionError('message');
        expect(error.statusCode).to.equal(501);
    });

    it('NoMatchingNode should have 404 error code', () => {
        const error = new NoMatchingNode('message');
        expect(error.statusCode).to.equal(404);
    });

    it('WebdriverError should have 400 error code', () => {
        const error = new WebdriverError('message');
        expect(error.statusCode).to.equal(400);
    });

    it('should handle CopperError in a fastify error handler', async () => {
        const fastifyInstance = fastify();
        registerErrorHandler(fastifyInstance, {}, () => ({}));
        const err = new CopperError('message', 'code', 403);
        fastifyInstance.get('/', () => {
            throw err;
        });
        await fastifyInstance.ready();
        const response = await fastifyInstance.inject({ method: 'GET', url: '/' });
        expect(response.statusCode).to.equal(403);
        expect(response.body).to.equal(JSON.stringify(err));
        await fastifyInstance.close();
    });

    it('should handle non Copper errors as 500 errors', async () => {
        const fastifyInstance = fastify();
        registerErrorHandler(fastifyInstance, {}, () => ({}));
        fastifyInstance.get('/', () => {
            throw new Error('message');
        });
        await fastifyInstance.ready();
        const response = await fastifyInstance.inject({ method: 'GET', url: '/' });
        expect(response.statusCode).to.equal(500);
        await fastifyInstance.close();
    });
});
