<template>
    <div class="achievement-list">
        <article
            v-for="entry in entries"
            :key="entry.id"
            class="achievement-card"
            :class="{ unlocked: entry.unlocked }"
            :data-achievement="entry.id"
        >
            <div class="achievement-art">
                <img
                    :src="farmAchievementArt[entry.id][entry.unlocked ? 'unlocked' : 'locked']"
                    alt=""
                    aria-hidden="true"
                />
            </div>
            <div class="achievement-content">
                <header>
                    <h3>{{ t('farm.achievementNames.' + entry.key) }}</h3>
                    <span>{{
                        t(entry.unlocked ? 'farm.achievementUnlocked' : 'farm.achievementLocked')
                    }}</span>
                </header>
                <p>{{ t('farm.achievementDescriptions.' + entry.key) }}</p>
                <div
                    class="achievement-progress"
                    role="progressbar"
                    :aria-label="t('farm.achievementNames.' + entry.key)"
                    :aria-valuemin="0"
                    :aria-valuemax="entry.target"
                    :aria-valuenow="Math.min(entry.value, entry.target)"
                >
                    <i
                        :style="{ width: Math.min(100, (entry.value / entry.target) * 100) + '%' }"
                    />
                </div>
                <small>{{ Math.min(entry.value, entry.target) }} / {{ entry.target }}</small>
            </div>
        </article>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { FarmView } from '../../../main/types/farm'
import { farmAchievementEntries } from '../../../shared/farmAchievements'
import { farmAchievementArt } from '../../assets/farm-achievements'

const props = defineProps<{ view: FarmView }>()
const { t } = useI18n()
const entries = computed(() =>
    props.view.farm
        ? farmAchievementEntries(props.view.farm, props.view.catalog, props.view.unlockedPlots)
        : []
)
</script>
<style scoped>
.achievement-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}
.achievement-card {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 16px;
    border: 1px solid #d8bc83;
    border-radius: 20px;
    background: #fff9e9;
}
.achievement-card.unlocked {
    border-color: #96ae57;
    background: #f1f5d9;
}
.achievement-art {
    width: 66px;
    height: 66px;
    flex-shrink: 0;
}
.achievement-art img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
}
.achievement-content {
    min-width: 0;
    flex: 1;
}
.achievement-content header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 4px;
}
.achievement-content h3 {
    margin: 0;
    font-size: 18px;
}
.achievement-content span,
small {
    font-size: 12px;
    color: #76633e;
}
.achievement-content p {
    min-height: 36px;
    margin: 8px 0;
    font-size: 14px;
    line-height: 1.4;
}
.achievement-progress {
    height: 8px;
    border-radius: 8px;
    background: #e4d6af;
    overflow: hidden;
}
.achievement-progress i {
    display: block;
    height: 100%;
    background: #92b94c;
    border-radius: inherit;
}
@media (max-width: 900px) {
    .achievement-list {
        grid-template-columns: 1fr;
    }
}
</style>
