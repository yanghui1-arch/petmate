<template>
  <n-message-provider>
    <Home />
  </n-message-provider>
</template>

<script setup lang="ts">
// 你可以在这里写 Composition API 的逻辑
import Wish from "./views/Wish.vue";
import Home from "./views/Home.vue";
import { NMessageProvider } from "naive-ui";
</script>

