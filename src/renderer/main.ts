import { createApp } from 'vue'
import 'animate.css'
import './assets/style/global.scss'
import './assets/style/fonts.scss'
function startupFailed(error: unknown) {
    console.error('[startup] renderer-entry-failed: ' + (error instanceof Error ? error.stack ?? error.message : String(error)))
}
if (location.hash === '#/pet-speech') {
    // The bubble has no player initialization, navigation or notifications.
    void import('./views/PetSpeech.vue').then(({ default: PetSpeech }) => createApp(PetSpeech).mount('#app')).catch(startupFailed)
} else {
    // Auxiliary speech windows do not load the ordinary app and page modules.
    void Promise.all([import('./App.vue'), import('./router'), import('./i18n')]).then(
        ([{ default: App }, { default: router }, { i18n }]) =>
            createApp(App).use(router).use(i18n).mount('#app')
    ).catch(startupFailed)
}
