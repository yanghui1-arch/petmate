import { ItemType } from "./common";
import { PetMate } from "./petmate";

export interface PlayerInfo {
    steam_id?: string | null;
    name: string;
    qq?: string | null;
    petmates: PetMate[];
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