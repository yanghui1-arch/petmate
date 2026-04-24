import { PetMateAttribute, PetMateStatus } from "../../types/petmate";
import { Wish } from "../../types/wish";
import { DEFAULT_DASS_ATTRIBUTE, Dass } from "./dass";

/**
 * Youmei
 * 尤美继承黛丝的数值体系，旧存档中的属性、活动状态、心愿和完成次数可直接传承。
 */
export class Youmei extends Dass {
    constructor(id: number, name: string, attrs: PetMateAttribute, status: PetMateStatus, wishes: Wish[], completedWishesNum: number) {
        super(id, name, attrs, status, wishes, completedWishesNum);
    }
}

/**
 * 尤美默认属性沿用黛丝默认数值。
 */
export const DEFAULT_YOUMEI_ATTRIBUTE: PetMateAttribute = DEFAULT_DASS_ATTRIBUTE;
