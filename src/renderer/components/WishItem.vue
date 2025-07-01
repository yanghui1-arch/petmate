<template>
    <n-button color="#ced6e0" class="wish-item"><label>{{ wishItemName }}</label></n-button>
</template>

<script lang="ts" setup>
import { ref } from 'vue'


const wishItemName = ref("信息1")

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
        color: $font-gray;
        font-weight: bold;
    }
}
</style>