import fs from "fs";
import path from "path";

/**
 * 读取json文件
 * @param filePath 文件路径
 * @returns 文件内容，如果文件不存在或读取失败，返回null，否则返回一个指定元素类型的数组或对象
 */
export function readJsonFile<T>(filePath: string): Array<T> {
    try {
        const fullPath = path.resolve(filePath);
        const fileContent = fs.readFileSync(fullPath, "utf-8");
        return JSON.parse(fileContent);
    } catch (error) {
        console.error(`读取文件失败: ${filePath}`, error);
        return [];
    }
}