export const VERSION = "0.5.0";
export const SUPPORT_TTS_EXT_NAME = ["mp3", "wav"]

export const GET_BUFF_PROB_THROUGH_ACT = 0.2; // 通过活动获取buff的概率
export const GET_BUFF_NUM_THROUGH_ACT = 2; // 通过活动获取buff的数量
export const RETRY_TIMES_GET_BUFF_THROUGH_ACT = 3; // 重试获取buff的次数

export const MAX_WISHES_STORE_NUM = 20; // 最多保存几个愿望
export const WISH_GENERATE_INTERVAL = 5 * 60 * 60 * 1000; // 愿望生成间隔
// export const WISH_GENERATE_INTERVAL = 3 * 60 * 1000; // 愿望生成间隔，测试使用，3分钟