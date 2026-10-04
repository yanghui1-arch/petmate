<template>
    <img
        class="farm-icon farm-ui-icon"
        :data-icon="name"
        :src="images[name]"
        alt=""
        aria-hidden="true"
        :draggable="false"
    />
</template>
<script setup lang="ts">
import backpack from '../../assets/farm-ui/backpack.png'
import butterfly from '../../assets/farm-ui/butterfly.png'
import check from '../../assets/farm-ui/check.png'
import codex from '../../assets/farm-ui/codex.png'
import flower from '../../assets/farm-ui/flower.png'
import harvest from '../../assets/farm-ui/harvest.png'
import orders from '../../assets/farm-ui/orders.png'
import rest from '../../assets/farm-ui/rest.png'
import seedlings from '../../assets/farm-ui/seedlings.png'
import shop from '../../assets/farm-ui/shop.png'
import stock from '../../assets/farm-ui/stock.png'
import walk from '../../assets/farm-ui/walk.png'
import water from '../../assets/farm-ui/water.png'

const images = {
    backpack,
    butterfly,
    check,
    codex,
    flower,
    harvest,
    orders,
    rest,
    seedlings,
    shop,
    stock,
    walk,
    water
}
defineProps<{ name: keyof typeof images }>()
</script>
<style scoped>
.farm-ui-icon {
    display: block;
    width: 100%;
    height: 100%;
    flex: none;
    object-fit: contain;
    pointer-events: none;
}
</style>
