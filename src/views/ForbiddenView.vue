<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="flex flex-col items-center gap-4 py-16 text-center">
    <p class="text-7xl font-black text-red-700 dark:text-red-500" aria-hidden="true">403</p>
    <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-50">Acceso denegado</h1>
    <p class="max-w-md text-sm text-stone-600 dark:text-stone-300">
      No tenés permisos para acceder a esta sección. Esta área está reservada para
      administradores de la plataforma.
    </p>
    <RouterLink
      :to="{ name: 'board' }"
      class="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
    >
      Volver al tablero principal
    </RouterLink>
  </section>
</template>
