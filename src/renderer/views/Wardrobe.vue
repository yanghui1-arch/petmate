<template>
  <div class="wardrobe-page">
    <div class="wardrobe-layout">
      <div class="wardrobe-content">
        <div class="skin-list">
          <button
            v-for="skin in ownedSkins"
            :key="skin.id"
            type="button"
            class="skin-item"
            :class="{
              'skin-item-active': selectedSkinId === skin.id,
              'skin-item-equipped': equippedSkinId === skin.id,
            }"
            @click="selectedSkinId = skin.id"
          >
            <img class="skin-thumb" :src="skin.thumbnail" :alt="skin.name" />
            <div class="skin-item-name">{{ skin.name }}</div>
            <div v-if="equippedSkinId === skin.id" class="skin-item-tag">
              {{ t("wardrobe.applying") }}
            </div>
          </button>
        </div>

        <div class="skin-preview">
          <div class="skin-preview-image-wrapper">
            <img
              v-if="selectedSkin"
              class="skin-preview-image"
              :src="selectedSkin.showImage"
              :alt="selectedSkin.name"
            />
          </div>
          <div class="skin-preview-footer">
            <div>
              <div class="skin-preview-name">{{ selectedSkin?.name ?? "" }}</div>
              <div class="skin-preview-status">
                {{ selectedSkinId === equippedSkinId ? t("wardrobe.current") : t("wardrobe.available") }}
              </div>
            </div>
            <button
              type="button"
              class="equip-button"
              :disabled="!selectedSkin || selectedSkinId === equippedSkinId || isEquipping"
              @click="equipSelectedSkin"
            >
              {{ selectedSkinId === equippedSkinId ? t("wardrobe.equipped") : t("wardrobe.equip") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { PlayerResourceState } from "@main/types/player-resource";
import { openMessageModal } from "@/hooks/useInteract";
import classicSkinThumb from "@/assets/skins/经典长裙套装.png";
import laborSkinThumb from "@/assets/skins/五一短裙套装-2026.png";
import classicSkinShow from "@/assets/skins/show/经典长裙套装-1.png";
import laborSkinShow from "@/assets/skins/show/五一短裙套装-2026-1.png";

type SkinViewModel = {
  id: string;
  name: string;
  thumbnail: string;
  showImage: string;
};

const CLASSIC_SKIN_ID = "youmei-classic-dress";
const { t } = useI18n();
const skinCatalog = computed<SkinViewModel[]>(() => [
  {
    id: CLASSIC_SKIN_ID,
    name: t("wardrobe.skins.classic"),
    thumbnail: classicSkinThumb,
    showImage: classicSkinShow,
  },
  {
    id: "youmei-labor-skirt-2026",
    name: t("wardrobe.skins.labor"),
    thumbnail: laborSkinThumb,
    showImage: laborSkinShow,
  },
]);

const playerResources = ref<PlayerResourceState | null>(null);
const selectedSkinId = ref(CLASSIC_SKIN_ID);
const isEquipping = ref(false);

const ownedSkinIds = computed(() => {
  const ids = playerResources.value?.skins.map((skin) => skin.id) ?? [
    CLASSIC_SKIN_ID,
  ];
  return new Set(ids);
});

const ownedSkins = computed(() =>
  skinCatalog.value.filter((skin) => ownedSkinIds.value.has(skin.id))
);

const equippedSkinId = computed(
  () => playerResources.value?.equippedSkinId || CLASSIC_SKIN_ID
);

const selectedSkin = computed(
  () => ownedSkins.value.find((skin) => skin.id === selectedSkinId.value) ?? ownedSkins.value[0]
);

const syncSelection = () => {
  if (ownedSkins.value.some((skin) => skin.id === selectedSkinId.value)) return;
  selectedSkinId.value = equippedSkinId.value || ownedSkins.value[0]?.id || CLASSIC_SKIN_ID;
};

const refreshPlayerResources = async () => {
  const response = await window.api.getPlayerResources();
  if (response.code === 200 && response.data) {
    playerResources.value = response.data;
    selectedSkinId.value = response.data.equippedSkinId || CLASSIC_SKIN_ID;
    syncSelection();
    return;
  }

  openMessageModal("fail", t("wardrobe.fetchFailed"));
};

const equipSelectedSkin = async () => {
  if (!selectedSkin.value || selectedSkinId.value === equippedSkinId.value) return;

  isEquipping.value = true;
  try {
    const response = await window.api.equipPlayerSkin(selectedSkin.value.id);
    if (response.code === 200 && response.data) {
      playerResources.value = response.data;
      syncSelection();
      openMessageModal("success", t("wardrobe.equipSuccess"));
      return;
    }

    openMessageModal("fail", t("wardrobe.equipFailed"));
  } catch (error) {
    console.error("实装套装失败:", error);
    openMessageModal("fail", t("wardrobe.equipFailed"));
  } finally {
    isEquipping.value = false;
  }
};

onMounted(() => {
  void refreshPlayerResources();
});
</script>

<style scoped lang="scss">
.wardrobe-page {
  flex: 1;
  min-height: 0;
  height: 100%;
  padding: 50px 5% 22px;
  background: $system-bgc;
  overflow-y: auto;
}

.wardrobe-layout {
  width: 100%;
  height: 100%;
  min-height: 320px;
  display: flex;
  flex-direction: column;
}

.wardrobe-content {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 142px minmax(0, 1fr);
  gap: 12px;
}

.skin-list {
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  row-gap: 10px;
  padding-right: 2px;
}

.skin-item {
  position: relative;
  min-height: 156px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: #55484b;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  row-gap: 6px;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 214, 231, 0.64);
  }
}

.skin-item-active {
  border-color: #f3a6bd;
  box-shadow: 0 0 0 2px rgba(243, 166, 189, 0.22);
}

.skin-item-equipped {
  background: linear-gradient(180deg, rgba(243, 166, 189, 0.18), rgba(85, 72, 75, 1));
}

.skin-thumb {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  object-fit: cover;
  background: #f4d6df;
}

.skin-item-name {
  width: 100%;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  text-align: center;
  line-height: 1.25;
}

.skin-item-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 3px 7px;
  border-radius: 999px;
  color: #8b4513;
  font-size: 11px;
  font-weight: 900;
  background: #fff8e1;
}

.skin-preview {
  min-width: 0;
  min-height: 0;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: #55484b;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.skin-preview-image-wrapper {
  min-height: 0;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}

.skin-preview-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.skin-preview-footer {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  background: rgba(35, 30, 31, 0.58);
}

.skin-preview-name {
  color: #ffffff;
  font-size: 16px;
  font-weight: 900;
}

.skin-preview-status {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.58);
  font-size: 12px;
}

.equip-button {
  flex: 0 0 84px;
  height: 36px;
  border: none;
  border-radius: 8px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 900;
  background: linear-gradient(135deg, #ff7675 0%, #d84c6f 100%);
  box-shadow: 0 8px 18px rgba(216, 76, 111, 0.22);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 22px rgba(216, 76, 111, 0.32);
  }

  &:disabled {
    cursor: default;
    opacity: 0.56;
    box-shadow: none;
  }
}
</style>
