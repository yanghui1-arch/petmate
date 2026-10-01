<template>
    <svg
        class="farm-icon"
        :viewBox="`0 0 ${frame[2]} ${frame[3]}`"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
    >
        <svg :width="frame[2]" :height="frame[3]" overflow="hidden">
            <image :href="icons" :x="-frame[0]" :y="-frame[1]" width="1448" height="1086" />
        </svg>
    </svg>
</template>
<script setup lang="ts">
import { computed } from 'vue'

import { iconFrames, icons } from '../../assets/farm-game'
const props = defineProps<{ index: number }>()
const frame = computed(() => iconFrames[props.index])
</script>
<style scoped>
.farm-icon {
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
}
</style>
