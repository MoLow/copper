import { format } from 'util';
import { StatusCodes } from 'http-status-codes';

export class BaseError {
    constructor (...args: any[]) {
      Error.apply(this, args as any);
    }
}
BaseError.prototype = new Error();


export class CopperError extends BaseError {
    /**
     * 
     * @param {string} message - error message (usually same as error)
     * @param {string} error  - a constant message (e.g entity not found)
     * @param {number} statusCode
     */
    constructor(public message: string | Error, public error: string, public statusCode = StatusCodes.BAD_REQUEST) {
        super(message);
    }
  
    toJSON() {
      return {
        message: this.message,
        error: this.error
      };
    }
}

export class SessionNotFound extends CopperError {
    constructor(sessionId: string) {
        super(`cannot find session with id ${sessionId}`, 'session not found', StatusCodes.NOT_FOUND);
    }
}

export class CreateSessionError extends CopperError {
    constructor(error: Error) {
        super(error, 'failed creating a session', StatusCodes.INTERNAL_SERVER_ERROR);
    }
}

export class UnsupportedActionError extends CopperError {
    constructor(error: string) {
        super(error, 'unsupported action', StatusCodes.NOT_IMPLEMENTED);
    }
}