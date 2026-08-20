<script setup lang="ts">
/**
 * Reference sources belonging to one side of a view.
 * - YOUTUBE renders a playable embed; if the stored URL does not parse as a
 *   YouTube link it degrades to a plain external link.
 * - DOCUMENT URLs may be relative (`/uploads/...`, as returned by the upload
 *   endpoint), so they are made absolute against the API base URL.
 */
import { absoluteUploadUrl } from '@/services/uploads'
import { youtubeEmbedUrl, youtubeVideoId } from '@/lib/youtube'
import type { Source, SourceType } from '@/types/api'

const props = defineProps<{ sources: Source[]; sideLabel: string }>()

const typeLabels: Record<SourceType, string> = {
  LINK: 'Enlace',
  YOUTUBE: 'Video de YouTube',
  DOCUMENT: 'Documento',
}

function href(source: Source): string {
  return source.type === 'DOCUMENT' ? absoluteUploadUrl(source.url) : source.url
}

function linkText(source: Source): string {
  const label = source.label?.trim()
  return label !== undefined && label !== '' ? label : source.url
}

function embedId(source: Source): string | null {
  return source.type === 'YOUTUBE' ? youtubeVideoId(source.url) : null
}

function embedTitle(source: Source): string {
  return `Video de YouTube: ${linkText(source)}`
}

const listLabel = `Fuentes de ${props.sideLabel}`
</script>

<template>
  <section>
    <h4 class="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">Fuentes</h4>

    <p v-if="sources.length === 0" class="text-sm text-stone-500 dark:text-stone-400">
      Esta postura no tiene fuentes registradas.
    </p>

    <ul v-else class="flex flex-col gap-3" :aria-label="listLabel">
      <li
        v-for="source in sources"
        :key="source.id"
        class="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/60"
      >
        <div class="flex items-start gap-2">
          <span
            class="mt-0.5 shrink-0 text-stone-500 dark:text-stone-400"
            :title="typeLabels[source.type]"
          >
            <span class="sr-only">{{ typeLabels[source.type] }}:</span>
            <svg
              v-if="source.type === 'YOUTUBE'"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="size-5"
              aria-hidden="true"
            >
              <path
                d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15.02V8.98L15.2 12 10 15.02Z"
              />
            </svg>
            <svg
              v-else-if="source.type === 'DOCUMENT'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              class="size-5"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5A3.375 3.375 0 0 0 10.125 2.25H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              class="size-5"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
              />
            </svg>
          </span>

          <a
            :href="href(source)"
            target="_blank"
            rel="noopener noreferrer"
            class="min-w-0 flex-1 break-words text-sm font-medium text-amber-800 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:text-amber-400"
          >
            {{ linkText(source) }}
            <span class="sr-only">(se abre en una pestaña nueva)</span>
          </a>
        </div>

        <div v-if="embedId(source) !== null" class="mt-3 overflow-hidden rounded-lg">
          <iframe
            :src="youtubeEmbedUrl(embedId(source) ?? '')"
            :title="embedTitle(source)"
            class="aspect-video w-full border-0"
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      </li>
    </ul>
  </section>
</template>
