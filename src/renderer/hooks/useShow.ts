/**
 * 所有跟页面展示的方法都放在这个hook下面
 */

import { ChatLLMConfig, TTSLLMConfig } from "../types/llm"
import { ActivityInfo, Item, ItemType, Wish } from "../types/common"

export function useShow() {
    /**
     * 获取完成petmate的心愿数量
     * @param petmateId petmate的id
     * @returns 完成的心愿数量
     */
    const getPetmateCompletedWishesNum = async (petmateId: number) => {
        const res = await window.api.getPetmateCompletedWishesNum(petmateId)
        try {
            if (res.code === 200) {
                return res.data
            } else {
                throw new Error(res.message)
            }
        } catch (error) {
            console.error(error)
            return -1
        }
    }

    /**
     * 获取黑市的物品
     * @param type 物品类型
     * @returns 物品列表
     */
    const getShopItems = async (type: ItemType): Promise<Array<Item>> => {
        const res = await window.api.showItems(type)
        try {
            if (res.code === 200) {
                if (res.data) {
                    const itemList: Item[] = res.data;
                    return itemList.filter(item => item.expired === undefined)
                } else {
                    throw new Error("请求获取黑市的物品成功了，但是返回的物品为空")
                }
            } else {
                throw new Error(res.message)
            }
        } catch (error) {
            console.error(error)
            return []
        }
    }

    const getAllItems = async (type: ItemType): Promise<Array<Item>> => {
        const res = await window.api.showItems(type)
        try {
            if (res.code === 200) {
                if (res.data) {
                    return res.data;
                } else {
                    throw new Error("请求获取所有物品成功了，但是返回的物品为空")
                }
            } else {
                throw new Error(res.message)
            }
        } catch (error) {
            console.error(error)
            return []
        }
    }

    /**
     * 根据物品id获取物品信息
     * @param itemIds 物品id列表
     * @returns 物品信息列表
     */
    const getItemInfo = async (itemIds: number[]): Promise<Array<Item>> => {
        const res = await window.api.getItemInfo(itemIds)
        try {
            if (res.code === 200) {
                if (res.data) {
                    console.log(res.data)
                    return res.data
                } else {
                    throw new Error("请求获取黑市的物品成功了，但是返回的物品为空")
                }
            } else {
                throw new Error(res.message)
            }
        } catch (error) {
            console.error(error)
            return []
        }
    }

    const getActivities = async (type: ActivityInfo["type"]): Promise<Array<ActivityInfo>> => {
        const res = await window.api.showActivities(type)
        try {
            if (res.code === 200) {
                if (res.data) {
                    const activities: ActivityInfo[] = res.data;
                    return activities.sort((a, b) => (a.requirement.level ?? 0) - (b.requirement.level ?? 0) )
                } else {
                    throw new Error("请求获取活动成功了，但是返回的活动为空")
                }
            } else {
                throw new Error(res.message)
            }
        } catch (error) {
            console.error(error)
            return []
        }
    }

    /**
     * 获取Petmate的某个特定的心愿
     * @param petmateId petmate的id
     * @param wishId 需要获取的愿望的id
     * @returns 获取的愿望
     */
    const getPetmateOneWish = async (petmateId: number, wishId: string): Promise<Wish | undefined> => {
        const res = await window.api.getPetmateOneWish(petmateId, wishId)
        try {
            if (res.code === 200) {
                return res.data
            } else {
                throw new Error(res.message)
            }
        } catch (error) {
            console.error(error)
            return undefined
        }
    }

    /**
     * 获取Chat LLM和TTS LLM的配置
     * @returns Chat LLM和TTS LLM的配置
     */
    const getLLMConfig = async (): Promise<{
        chatLLMConfig: ChatLLMConfig | undefined,
        ttsLLMConfig: TTSLLMConfig | undefined
    }> => {
        try {
            const chatLLMConfigRes = await window.api.getChatLLMConfig()
            const ttsLLMConfigRes = await window.api.getTTSLLMConfig()
            if (chatLLMConfigRes.code === 200 && ttsLLMConfigRes.code === 200) {
                return {
                    chatLLMConfig: chatLLMConfigRes.data,
                    ttsLLMConfig: ttsLLMConfigRes.data
                }
            } else {
                throw new Error(chatLLMConfigRes.message || ttsLLMConfigRes.message)
            }
        } catch (error) {
            console.error(error)
            return {
                chatLLMConfig: undefined,
                ttsLLMConfig: undefined
            }
        }
    }

    /**
     * 动态引入资源路径
     * @param firstDir 资源所属的一级目录，比如item, buff, activity
     * @param imagePath 图片路径，如food/donut或fashion/五一短裙套装.png
     * @returns 资源路径
     */
    const getImageURL = (firstDir: string, imagePath: string) => {
        try {
            const parsedImagePath = imagePath.split("/")
            if (parsedImagePath.length > 2) throw new Error("图片路径不合法，请确保是food/donut这样的格式");
            const secondDir = parsedImagePath[0]
            const imageName = parsedImagePath[1]
            const imageFileName = /\.[a-z0-9]+$/i.test(imageName) ? imageName : `${imageName}.webp`
            const pathname = new URL(`../assets/image/${firstDir}/${secondDir}/${imageFileName}`, import.meta.url).pathname
            if(pathname.includes("undefined")) throw new Error(`图片路径../assets/image/${firstDir}/${secondDir}/${imageName}.webp不存在`);
            return pathname
        } catch (error) {
            console.log("获取图片失败:", error)
            return null
        }
    }

    return {
        getPetmateCompletedWishesNum,
        getShopItems,
        getAllItems,
        getItemInfo,
        getActivities,
        getPetmateOneWish,
        getLLMConfig,
        getImageURL
    }
}
