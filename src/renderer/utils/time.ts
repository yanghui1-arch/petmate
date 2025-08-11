/**
 * 将Date对象转为北京时间字符串
 * 2025-08-05T05:37:09.480Z -> 2025-08-05 13:37:09.480
 * @param date 时间对象
 * @param format 时间字符串，格式为YYYY-MM-DD HH:MM:ss
 */
export const formatTime = (date: Date) => {
    const options = { timeZone: "Asia/Shanghai" };
    const localDate = new Date(date.toLocaleString("zh-CN", options));

    const pad = (n: number) => n.toString().padStart(2, "0");

    const year = localDate.getFullYear();
    const month = pad(localDate.getMonth() + 1); // 月份从0开始
    const day = pad(localDate.getDate());
    const hour = pad(localDate.getHours());
    const minute = pad(localDate.getMinutes());
    const second = pad(localDate.getSeconds());

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};