<template>
  <div class="skin-get-page">
    <div class="skin-get-stage">
      <img class="skin-get-page-image" :src="pageImage" alt="五一短裙套装领取页面" />
      <div
        class="claim-hotspot"
        :class="{ 'claim-hotspot--claiming': isClaiming }"
        @click="handleClaim"
      />
    </div>

    <div
      v-if="dialogMode"
      class="success-overlay"
      @click.self="dialogMode = null"
    >
      <div class="success-panel">
        <img class="success-icon" :src="skinIcon" alt="五一短裙套装" />
        <div class="success-title">{{ dialogTitle }}</div>
        <div v-if="dialogDescription" class="success-description">
          {{ dialogDescription }}
        </div>
        <button class="success-action" type="button" @click="goWardrobe">
          {{ dialogActionText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { openMessageModal } from "@/hooks/useInteract";
import pageImage from "@/assets/page/51labor-skin-get/五一短裙套装领取页面.png";
import skinIcon from "@/assets/page/51labor-skin-get/五一短裙套装.png";

const router = useRouter();
const isClaiming = ref(false);
const dialogMode = ref<"success" | "duplicate" | null>(null);

const dialogTitle = computed(() =>
  dialogMode.value === "duplicate" ? "已经领取过啦" : "领取成功"
);
const dialogDescription = computed(() =>
  dialogMode.value === "duplicate"
    ? "这个套装已经在衣橱里了，不可以重复领取。"
    : ""
);
const dialogActionText = computed(() =>
  dialogMode.value === "duplicate" ? "去衣橱换装" : "去衣橱实装"
);

const handleClaim = async () => {
  if (isClaiming.value) return;

  isClaiming.value = true;
  try {
    const response = await window.api.claimLaborSkin();
    if (response.code === 200) {
      dialogMode.value = "success";
      return;
    }

    if (response.code === 409) {
      dialogMode.value = "duplicate";
      return;
    }

    openMessageModal("fail", response.message || "领取失败");
  } catch (error) {
    console.error("领取五一短裙套装失败:", error);
    openMessageModal("fail", "领取失败");
  } finally {
    isClaiming.value = false;
  }
};

const goWardrobe = () => {
  dialogMode.value = null;
  router.push("/wardrobe");
};
</script>

<style scoped lang="scss">
.skin-get-page {
  flex: 1;
  min-height: 100%;
  background: #f7d6df;
  display: flex;
  justify-content: center;
  overflow-y: auto;
}

.skin-get-stage {
  width: min(100vw, calc(100vh * 1086 / 1448));
  max-width: 100%;
  aspect-ratio: 1086 / 1448;
  position: relative;
  flex: 0 0 auto;
}

.skin-get-page-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  user-select: none;
  pointer-events: none;
}

.claim-hotspot {
  position: absolute;
  left: 22.84%;
  top: 83.29%;
  width: 54.33%;
  height: 14.5%;
  cursor: pointer;

  &--claiming {
    cursor: wait;
  }
}

.success-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(35, 30, 31, 0.48);
  backdrop-filter: blur(4px);
}

.success-panel {
  width: min(320px, calc(100vw - 48px));
  padding: 18px;
  border-radius: 8px;
  border: 1px solid rgba(255, 214, 231, 0.85);
  background: linear-gradient(180deg, #fff9fb 0%, #ffe2ec 100%);
  box-shadow: 0 18px 48px rgba(97, 45, 58, 0.28);
  display: flex;
  flex-direction: column;
  align-items: center;
  row-gap: 12px;
}

.success-icon {
  width: 132px;
  height: 132px;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: 0 8px 24px rgba(218, 82, 117, 0.22);
}

.success-title {
  color: #b33a5d;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 0;
}

.success-description {
  color: #7b4b5b;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
}

.success-action {
  width: 100%;
  height: 38px;
  border: none;
  border-radius: 8px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
  background: linear-gradient(135deg, #f35f8a 0%, #d84c6f 100%);
  box-shadow: 0 8px 18px rgba(216, 76, 111, 0.26);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 22px rgba(216, 76, 111, 0.34);
  }
}
</style>
