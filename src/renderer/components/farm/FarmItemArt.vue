<template>
    <svg
        class="item-art"
        :class="{ muted }"
        :data-item="id"
        :data-stage="stage"
        :viewBox="`0 0 ${frame.rect[2]} ${frame.rect[3]}`"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
    >
        <svg :width="frame.rect[2]" :height="frame.rect[3]" overflow="hidden">
            <image
                :href="cropImages[id]"
                :x="-frame.rect[0]"
                :y="-frame.rect[1]"
                :width="meta.sheet[0]"
                :height="meta.sheet[1]"
            />
        </svg>
    </svg>
</template>
<script setup lang="ts">
import { computed } from 'vue'

import { cropFrames, cropImages } from '../../assets/farm-game'
const props = withDefaults(defineProps<{ id: string; stage?: number; muted?: boolean }>(), {
    stage: 3,
    muted: false
})
const meta = computed(() => cropFrames[props.id])
const frame = computed(() => meta.value.stages[props.stage])
</script>
<style scoped>
.item-art {
    display: block;
    width: 68px;
    height: 76px;
    flex: none;
    overflow: hidden;
    pointer-events: none;
}
.muted {
    filter: saturate(0.3);
    opacity: 0.65;
}
</style>
