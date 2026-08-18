<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="flex flex-col items-center gap-4 py-16 text-center">
    <p class="text-7xl font-black text-amber-700 dark:text-amber-500" aria-hidden="true">404</p>
    <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-50">Página no encontrada</h1>
    <p class="max-w-md text-sm text-stone-600 dark:text-stone-300">
      La página que buscás no existe o fue eliminada. Como todo en la vida, este error también
      tiene dos caras: perdiste una ruta, pero encontraste el tablero.
    </p>
    <RouterLink
      :to="{ name: 'board' }"
      class="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
    >
      Volver al tablero principal
    </RouterLink>
  </section>
</template>
