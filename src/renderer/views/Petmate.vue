<template>
    <div class="petmate-container">
        <div ref="threeContainer" class="three-container"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePetmateModel } from '../hooks/usePetmateModel';
import * as THREE from 'three';

const threeContainer = ref();

onMounted(() => {
    if (threeContainer.value) {
        const { init3D, jumpTo } = usePetmateModel(threeContainer);
        try {
            init3D().then(() => {
                setTimeout(()=> {
                    jumpTo(new THREE.Vector3(-2, 0, -2));
                }, 1000)
            });
        } catch (error) {
            console.error(error);
        }
    }
})


</script>

<style lang="scss" scoped>
.three-container {
    width: 100%;
    height: 100%;
}
</style>
