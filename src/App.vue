<script setup lang="ts">
import { game } from './game/store'
import MainMenu from './components/MainMenu.vue'
import LevelSelect from './components/LevelSelect.vue'
import GameView from './components/GameView.vue'
import Leaderboard from './components/Leaderboard.vue'
import HowToPlay from './components/HowToPlay.vue'
</script>

<template>
  <MainMenu v-if="game.screen === 'menu'" />
  <LevelSelect v-else-if="game.screen === 'setup'" />
  <GameView v-else-if="game.screen === 'play'" :key="game.gameKey" />
  <Leaderboard v-else-if="game.screen === 'scores'" />
  <HowToPlay v-else-if="game.screen === 'howto'" />
</template>
