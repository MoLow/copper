import * as fastify from 'fastify';
import { FastifyInstance } from "fastify";

declare module 'fastify' {
  interface FastifyRequest {
    sid: string;
    session: WebdriverSession;
  }
}