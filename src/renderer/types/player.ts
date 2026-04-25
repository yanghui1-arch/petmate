import { ItemTypeValue } from "./common";
import { PetMate } from "./petmate";

export interface PlayerInfo {
    steamId?: string | null;
    name: string;
    qq?: string | null;
    petmates: PetMate[];
    cash: number;
    items: PackageItemInfo[];
}

export interface PackageItemInfo {
    id: number;
    name: string;
    type: ItemTypeValue;
    description: string;
    url: string;
    count: number;
}
