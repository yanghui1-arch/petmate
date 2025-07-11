import { ActivityInfo } from "../../main/types/activity"
import { Item, ItemType } from "../../main/types/item"

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
    const getShopItems = async (type: ItemType):Promise<Array<Item>> => {
        const res = await window.api.showItems(type)
        try {
            if (res.code === 200) {
                if (res.data) {
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

    /**
     * 获取活动
     * @param type 活动类型
     * @returns 活动列表
     */
    const getActivities = async (type: ActivityInfo["type"]):Promise<Array<ActivityInfo>> => {
        const res = await window.api.showActivities(type)
        try {
            if (res.code === 200) {
                if (res.data) {
                    return res.data
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


    return {
        getPetmateCompletedWishesNum,
        getShopItems,
        getActivities,
    }
}