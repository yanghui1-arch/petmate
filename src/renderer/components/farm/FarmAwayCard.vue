<template>
    <div class="away-card-host" @pointerdown.stop @contextmenu.prevent.stop>
        <section class="away-card" :aria-label="t('farmLife.awayTitle')">
            <header class="away-card-heading">
                <img :src="seedlings" alt="" draggable="false" />
                <h1>{{ t('farmLife.awayTitle') }}</h1>
            </header>
            <nav class="away-card-buttons">
                <button class="away-card-farm" :disabled="opening" @click="emit('farm')">
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                        <path
                            d="M10 16V8m0 4c-5 0-6-3-6-6 4 0 6 2 6 6Zm0-4c0-4 3-5 6-5 0 4-2 6-6 6M4 17h12"
                        />
                    </svg>
                    {{ t('farmLife.visitFarm') }}
                </button>
                <button class="away-card-home" :disabled="opening" @click="emit('home')">
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                        <path d="m3 9 7-6 7 6M5 8v9h10V8M8 17v-5h4v5" />
                    </svg>
                    {{ t('wheel.home') }}
                </button>
            </nav>
        </section>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import seedlings from '../../assets/farm-ui/seedlings.png'

defineProps<{ opening?: boolean }>()
const emit = defineEmits<{ farm: []; home: [] }>()
const { t } = useI18n()
</script>

<style scoped>
.away-card-host {
    position: fixed;
    inset: 0;
    z-index: 30;
    overflow: hidden;
    display: grid;
    place-items: center;
    font-family: 'Microsoft YaHei', 'Segoe UI', sans-serif;
}
.away-card {
    position: relative;
    box-sizing: border-box;
    width: 264px;
    padding: 14px 16px;
    border: 2px solid #bb8b55;
    border-radius: 22px;
    background: linear-gradient(150deg, #fffbed, #fff0d2);
    box-shadow:
        0 4px 0 #b98b5550,
        0 7px 10px #5d68341b;
    color: #714c2e;
}
.away-card::after {
    position: absolute;
    inset: 4px;
    border: 1px solid #fffefa;
    border-radius: 16px;
    content: '';
    pointer-events: none;
}
.away-card-heading {
    -webkit-app-region: drag;
    user-select: none;
    cursor: grab;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
}
.away-card-heading img {
    width: 32px;
    height: 32px;
    object-fit: contain;
    filter: drop-shadow(0 2px 1px #52712422);
}
.away-card-heading h1 {
    margin: 0;
    font-size: 15px;
    font-weight: 800;
    line-height: 1.6;
}
.away-card-buttons {
    -webkit-app-region: no-drag;
    display: grid;
    grid-template-columns: 1.12fr 1fr;
    gap: 9px;
}
.away-card-buttons button {
    display: flex;
    height: 37px;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-width: 1px;
    border-style: solid;
    border-radius: 12px;
    font:
        700 14px 'Microsoft YaHei',
        'Segoe UI',
        sans-serif;
    cursor: pointer;
}
.away-card-buttons button:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow: none;
}
.away-card-buttons button:focus-visible {
    outline: 2px solid #714c2e;
    outline-offset: 3px;
}
.away-card-buttons button:disabled {
    cursor: wait;
}
.away-card-farm {
    border-color: #87a64a;
    background: linear-gradient(#cfe697, #b3d576);
    box-shadow: 0 3px 0 #789a43;
    color: #4b662d;
}
.away-card-home {
    border-color: #cba56c;
    background: linear-gradient(#fff2cd, #f6dfae);
    box-shadow: 0 3px 0 #ba925d;
    color: #866139;
}
.away-card-buttons svg {
    width: 16px;
    height: 16px;
    flex: none;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
}
</style>
