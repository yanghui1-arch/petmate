import { PetMate } from "../modules/petmate/petmate";
import { ItemTypeValue } from "./item";
import type { SchoolHandbookRewardGrant } from "./school-handbook";
import type { VersionReminderSave } from "./version-reminder";

export type PlayerInfo = {
    steamId?: string | null;
    name: string;
    qq?: string | null;
    petmates: Array<PetMate>;
    cash: number;
    items: PackageItemInfo[];
    versionReminder?: VersionReminderSave;
}

export interface PackageItemInfo {
    id: number;
    name: string;
    type: ItemTypeValue;
    description: string;
    url: string;
    count: number;
}

export type ConsumeItemResult = {
    rewards?: SchoolHandbookRewardGrant[];
}
