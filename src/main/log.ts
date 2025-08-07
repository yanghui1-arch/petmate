import winston from 'winston';
import path from 'path';

// 获取调用栈中的调用者文件名与行号
function getCallerInfo(): string {
    const stack = new Error().stack;
    if (!stack) return '';
    const lines = stack.split('\n');

    // 查找第一行不是 logger.ts 自身的调用
    const callerLine = lines.find(line =>
        !line.includes('logger.ts') && line.includes('.ts')
    );

    if (!callerLine) return '';

    const match = callerLine.match(/at (.+) \((.+):(\d+):\d+\)/) || callerLine.match(/at (.+):(\d+):\d+/);
    if (match) {
        const file = match[2] || match[1];
        const line = match[3] || match[2];
        return `[${path.basename(file)}:${line}]`;
    }

    return '';
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            const caller = getCallerInfo();
            return `[${timestamp}] [${level.toUpperCase()}] ${caller} ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});

export default logger;
