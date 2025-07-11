<template>
    <n-button color="white" class="wish-item"><label>{{ wishItemName }}</label></n-button>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
// 暴露一个属性
import { defineProps } from 'vue'


const props = defineProps<{
    wishItemName: string
}>()

</script>

<style lang="scss" scoped>

.wish-item {
    display: flex;
    width: 100%;
    margin: 5px 0px;
    border-radius: 30px;
    align-items: center;
    text-align: center;
    label {
        color: $font-blue;
        font-weight: bold;
    }
}
</style>