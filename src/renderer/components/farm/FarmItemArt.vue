<template>
    <span
        class="item-art"
        :class="{ muted, seed: kind === 'seed' }"
        :data-item="id"
        :data-stage="stage"
    >
        <img v-if="kind === 'decoration'" :src="decorationSprites[id]" alt="" />
        <span
            v-else
            class="crop-art"
            :style="{
                backgroundImage: `url(${cropSprites[id]})`,
                backgroundPosition: `${(stage * 100) / 3}% center`
            }"
        ></span>
        <img v-if="kind === 'seed'" class="seed-bag" :src="toolSprites.seeds" alt="" />
    </span>
</template>
<script setup lang="ts">
import { cropSprites, decorationSprites, toolSprites } from '../../assets/farm'
withDefaults(
    defineProps<{
        id: string
        kind?: 'crop' | 'seed' | 'decoration'
        stage?: number
        muted?: boolean
    }>(),
    {
        kind: 'crop',
        stage: 3,
        muted: false
    }
)
</script>
<style scoped>
.item-art {
    position: relative;
    display: inline-block;
    width: 68px;
    height: 76px;
    flex: none;
    vertical-align: middle;
}
.item-art > img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
}
.crop-art {
    display: block;
    width: 100%;
    height: 100%;
    background-size: 400% 100%;
    background-repeat: no-repeat;
    image-rendering: pixelated;
}
.item-art > .seed-bag {
    position: absolute;
    left: -5px;
    bottom: -2px;
    width: 28px;
    height: 28px;
}
.muted {
    filter: saturate(0.3);
    opacity: 0.65;
}
</style>
