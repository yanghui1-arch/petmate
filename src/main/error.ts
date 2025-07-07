/**
 * 不足错误
 * 当因为某些东西不够导致操作失败时，抛出此错误
 */
export class NotEnoughError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NotEnoughError";
    }
}

/**
 * 不存在导致的错误
 */
export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NotFoundError";
    }
}