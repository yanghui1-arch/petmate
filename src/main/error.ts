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

/**
 * 超过限制导致的错误
 */
export class ExceedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ExceedError";
    }
}

/**
 * 数据迁移错误的异常
 */
export class DataMigrationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DataMigrationError";
    }
}

/**
 * 大模型配置错误
 */
export class LLMConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "LLMConfigError";
    }
}

/**
 * TTS过程出现错误
 */
export class TTSProcessError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TTSProcessError";
    }
}

/**
 * 文本大模型的参数设置有问题
 */
export class ChatLLMConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ChatLLMConfigError";
    }
}