import { PetMateAttribute } from "../../types/petmate";
import { PetMate } from "./petmate";

/**
 * Dass
 * 继承Petmate，基本的属性增删不需要写，主要写动作
 */
export class Dass extends PetMate {
    constructor(attrs: PetMateAttribute) {
        super(attrs);
    }
}