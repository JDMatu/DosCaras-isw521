<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const props = defineProps<{
  open: boolean
  title: string
  submitLabel: string
  initialName: string
  existingNames: string[]
  submitting: boolean
  serverError: string
}>()

const emit = defineEmits<{ submit: [name: string]; cancel: [] }>()

const name = ref(props.initialName)
const localError = ref('')

watch(
  () => props.open,
  (open) => {
    if (open) {
      name.value = props.initialName
      localError.value = ''
    }
  },
)

function submit(): void {
  const value = name.value.trim()
  if (value === '') {
    localError.value = 'Escribí un nombre para la categoría.'
    return
  }
  const duplicated = props.existingNames.some(
    (existing) => existing.toLocaleLowerCase() === value.toLocaleLowerCase(),
  )
  if (duplicated) {
    localError.value = 'Ya existe una categoría con ese nombre.'
    return
  }
  localError.value = ''
  emit('submit', value)
}
</script>

<template>
  <BaseModal :open="open" :title="title" @close="emit('cancel')">
    <form novalidate class="flex flex-col gap-4" @submit.prevent="submit">
      <BaseInput
        v-model="name"
        label="Nombre de la categoría"
        required
        placeholder="Ej.: Economía"
        :error="localError || serverError"
        :disabled="submitting"
      />
      <div class="flex justify-end gap-3">
        <BaseButton variant="secondary" :disabled="submitting" @click="emit('cancel')">
          Cancelar
        </BaseButton>
        <BaseButton type="submit" :loading="submitting" :disabled="submitting">
          {{ submitLabel }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
