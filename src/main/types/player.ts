import { PetMate } from "../modules/petmate/petmate";
import { ItemType } from "./item";

export type PlayerInfo = {
    steam_id?: string | null;
    name: string;
    qq?: string | null;
    petmates: Array<PetMate>;
    cash: number;
    items: PackageItemInfo[];
}

export interface PackageItemInfo {
    id: number;
    name: string;
    type: ItemType;
    description: string;
    url: string;
    count: number;
}