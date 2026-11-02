<script setup lang="ts">
import { computed } from "vue";
import { ChevronDown, ChevronUp } from "lucide-vue-next";
import Button from "~/components/filedom/Button.vue";
import Input from "~/components/filedom/Input.vue";
import Tooltip from "~/components/filedom/Tooltip.vue";
import { controlFor, useFiledom } from "~/components/filedom/FiledomProvider.vue";

const { snapshot, store, run } = useFiledom();
const search = computed(() => controlFor(snapshot.value, "search"));
const findPrev = computed(() => controlFor(snapshot.value, "findPrev"));
const findNext = computed(() => controlFor(snapshot.value, "findNext"));

const query = computed({
  get: () => snapshot.value?.search.query ?? "",
  set: (value: string) => {
    const action = snapshot.value?.actions.search;
    if (action && action.availability !== "shown") return;
    store.value?.viewer.search(value);
  },
});

const countLabel = computed(() => {
  const current = snapshot.value?.search;
  if (!current?.query) return "";
  if (!current.hitCount || current.hitIndex < 0) return "0";
  return `${current.hitIndex + 1} / ${current.hitCount}`;
});

function findNextHit() {
  if (!findNext.value.show || findNext.value.disabled) return;
  run("findNext");
}
</script>

<template>
  <div v-if="search.show" data-slot="search-bar" class="flex items-center gap-0.5">
    <Input
      v-model="query"
      data-slot="search-input"
      data-action="search"
      type="search"
      placeholder="Search"
      class="w-36"
      autocomplete="off"
      spellcheck="false"
      aria-label="Search"
      :disabled="search.disabled"
      :title="search.title"
      @keydown.enter.prevent="findNextHit"
    />
    <Tooltip v-if="findPrev.show" :label="findPrev.title ?? 'Previous match'">
      <Button
        variant="icon"
        data-slot="search-prev"
        data-action="findPrev"
        aria-label="Previous match"
        :disabled="findPrev.disabled"
        :title="findPrev.title"
        @click="run('findPrev')"
      >
        <ChevronUp class="size-4" aria-hidden="true" />
      </Button>
    </Tooltip>
    <Tooltip v-if="findNext.show" :label="findNext.title ?? 'Next match'">
      <Button
        variant="icon"
        data-slot="search-next"
        data-action="findNext"
        aria-label="Next match"
        :disabled="findNext.disabled"
        :title="findNext.title"
        @click="run('findNext')"
      >
        <ChevronDown class="size-4" aria-hidden="true" />
      </Button>
    </Tooltip>
    <span data-slot="search-count" class="min-w-10 text-center text-xs text-muted-foreground tabular-nums" aria-live="polite">
      {{ countLabel }}
    </span>
  </div>
</template>
