<script setup lang="ts">
import { computed } from "vue";
import Select from "~/components/domdoc/Select.vue";
import { controlFor, useDomdoc } from "~/components/domdoc/DomdocProvider.vue";

const { snapshot, run } = useDomdoc();
const live = computed(() => controlFor(snapshot.value, "live"));
const track = computed(() => controlFor(snapshot.value, "track"));
const view = computed(() => controlFor(snapshot.value, "view"));
const mode = computed(() => snapshot.value?.viewMode ?? "live");

function choose(value: string) {
  if (value === "live" || value === "track" || value === "view") run(value);
}
</script>

<template>
  <Select data-slot="mode-select" class="w-36" aria-label="View mode" :model-value="mode" @update:model-value="choose">
    <option v-if="live.show" value="live" data-action="live" :disabled="live.disabled">Live</option>
    <option v-if="track.show" value="track" data-action="track" :disabled="track.disabled">Track changes</option>
    <option v-if="view.show" value="view" data-action="view" :disabled="view.disabled">View only</option>
  </Select>
</template>
