<script setup lang="ts">
import VaGlobalLoadingHost from '../loading/VaGlobalLoadingHost.vue'
import VaConfirmHost from '../modal/VaConfirmHost.vue'
import VaPromptHost from '../modal/VaPromptHost.vue'
import VaToastHost from '../toast/VaToastHost.vue'
import { useFeedback } from './feedback'

const feedback = useFeedback()
</script>

<template>
  <VaConfirmHost :controller="feedback.confirmation" />
  <VaPromptHost :controller="feedback.prompting" />
  <VaToastHost :controller="feedback.toast" />
  <VaGlobalLoadingHost :controller="feedback.loading" />
</template>
