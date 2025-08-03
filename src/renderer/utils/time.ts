/**
 * 将Date对象转为字符串，
 * @param date 时间对象
 * @param format 时间字符串，格式为YYYY-MM-DD HH:MM:SS
 */
export const formatTime = (date: Date) => {
    return date.toISOString().replace("T", " ").slice(0, 19);
};