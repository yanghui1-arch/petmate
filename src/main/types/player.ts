import { PetMate } from "../modules/petmate/petmate";
import { Item } from "./item";

export type PlayerInfo = {
    steam_id?: string | null;
    name: string;
    qq?: string | null;
    petmates: Array<PetMate>;
    cash: number;
    items: Map<number, number>;
}