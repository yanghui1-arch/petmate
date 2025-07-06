/**
 * 响应类型
 * code: 200 成功，400 失败
 * message: 错误信息
 * data: 数据
 */
type Response<T> = {
    code: number;
    message?: string;
    data?: T;
}

export type { Response };