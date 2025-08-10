<template>
    <div class="vertical">
        <n-avatar
        round
        :size="60"
        src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg"
        />
        <label class="show-accompany">(已陪伴一天)</label>
    </div>
</template>

<script lang="ts" setup>

</script>

<style lang="scss" scoped>
.vertical {
    display: flex;
    flex-direction: column;
    align-items: center;
}
label {
    color: $font-gray;
    font-weight: bold;
    border-radius: 30px;
}
.show-accompany {
    background-color: $bg-white-100;
    margin: 5px;
    padding: 5px;
}
</style>