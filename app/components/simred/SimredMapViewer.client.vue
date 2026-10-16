<script setup lang="ts">
import { mapCategories, mapLayerColor, normalizeMapSearch } from "~/utils/maps/presentation";
import type { MapCategory } from "~/types/maps";

const props = defineProps<{ compact?: boolean }>();
const { layers, selected, rendered, failures, pending, loading, error, refreshedAt, refresh, toggle, toggleBoundaries, loadGeometry } = usePublicMapLayers();
const search = ref("");
const category = ref<MapCategory | "">("");
const panelOpen = ref(!props.compact);
const focus = ref<{ token: number; id?: number }>({ token: 0 });
const root = ref<HTMLElement>();
const fullscreen = ref(false);
const fullscreenError = ref("");
const canFullscreen = ref(false);
const panelId = useId();
const boundaryLayers = computed(() => layers.value.filter((layer) => layer.kind === "boundary"));
const boundariesVisible = computed(() => boundaryLayers.value.length > 0 && boundaryLayers.value.every((layer) => selected.value.includes(layer.id)));
const someBoundariesVisible = computed(() => boundaryLayers.value.some((layer) => selected.value.includes(layer.id)));
const filtered = computed(() => layers.value.filter((layer) =>
  (!category.value || layer.category === category.value) &&
  normalizeMapSearch(layer.name + " " + (layer.region?.name ?? "")).includes(normalizeMapSearch(search.value)),
));
function locate(id?: number): void { focus.value = { token: focus.value.token + 1, id }; }
watch(loading, (value) => { if (!value) nextTick(() => locate()); });
async function toggleFullscreen(): Promise<void> {
  fullscreenError.value = "";
  try {
    if (document.fullscreenElement === root.value) await document.exitFullscreen();
    else await root.value?.requestFullscreen();
  } catch { fullscreenError.value = "Tu navegador no permitió abrir el mapa a pantalla completa."; }
}
function syncFullscreen(): void { fullscreen.value = document.fullscreenElement === root.value; }
onMounted(() => {
  canFullscreen.value = document.fullscreenEnabled;
  document.addEventListener("fullscreenchange", syncFullscreen);
});
onBeforeUnmount(() => document.removeEventListener("fullscreenchange", syncFullscreen));
</script>

<template>
  <section ref="root" class="public-map-viewer overflow-auto rounded-xl border border-brand-navy/15 bg-white" aria-label="Visor cartográfico SIMRED">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-brand-navy/10 px-4 py-4 sm:px-5">
      <div>
        <h3 class="text-sm font-semibold text-heading">Cartografía de La Paz</h3>
        <p class="mt-1 text-xs text-muted" role="status">{{ loading ? 'Cargando cartografía…' : rendered.length + ' de ' + layers.length + ' capas visibles' }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="map-button" :aria-expanded="panelOpen" :aria-controls="panelId" @click="panelOpen = !panelOpen">Capas</button>
        <button type="button" class="map-button" :disabled="!rendered.length" @click="locate()">Ver todo</button>
        <button v-if="!compact && canFullscreen" type="button" class="map-button" @click="toggleFullscreen">{{ fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa' }}</button>
      </div>
    </header>
    <div v-if="error" role="alert" class="flex flex-wrap items-center justify-between gap-3 border-b border-brand-copper/25 bg-brand-cream p-4 text-sm text-heading">
      <p>{{ error }}</p><button type="button" class="map-button" :disabled="loading" @click="refresh">Reintentar</button>
    </div>
    <p v-if="fullscreenError" role="alert" class="p-4 text-sm text-body">{{ fullscreenError }}</p>
    <div class="grid min-w-0" :class="panelOpen && !compact ? 'lg:grid-cols-[280px_minmax(0,1fr)]' : ''">
      <aside v-show="panelOpen" :id="panelId" class="min-w-0 border-b border-brand-navy/10 bg-surface-soft p-4" :class="!compact ? 'lg:border-b-0 lg:border-r' : ''" aria-label="Capas publicadas">
        <div class="flex flex-col gap-3">
          <label class="flex flex-col gap-2 text-xs font-semibold text-heading">
            Buscar capa o región
            <input v-model="search" type="search" maxlength="150" placeholder="Ej.: Metropolitana" class="map-input" />
          </label>
          <label class="flex flex-col gap-2 text-xs font-semibold text-heading">
            Tipo de información
            <select v-model="category" class="map-input">
              <option value="">Todas las categorías</option>
              <option v-for="(label, value) in mapCategories" :key="value" :value="value">{{ label }}</option>
            </select>
          </label>
          <label v-if="boundaryLayers.length" class="flex min-h-11 cursor-pointer items-center gap-2 border-y border-brand-navy/10 py-3 text-xs font-semibold text-heading">
            <input type="checkbox" :checked="boundariesVisible" :indeterminate="someBoundariesVisible && !boundariesVisible" class="size-4 accent-brand-copper" :disabled="loading" @change="toggleBoundaries(($event.target as HTMLInputElement).checked)" />
            Mostrar límites regionales
          </label>
        </div>
        <p v-if="!loading && !layers.length && !error" role="status" class="py-5 text-sm leading-6 text-muted">Todavía no hay capas publicadas.</p>
        <p v-else-if="layers.length && !filtered.length" role="status" class="py-5 text-sm text-muted">No hay capas que coincidan con la búsqueda.</p>
        <ul class="mt-2 max-h-64 overflow-y-auto overscroll-contain lg:max-h-[380px]" :class="compact ? 'sm:grid sm:grid-cols-2 sm:gap-x-4' : ''">
          <li v-for="layer in filtered" :key="layer.id" class="border-b border-brand-navy/8 py-3 last:border-0">
            <div class="flex items-center gap-2">
              <label class="flex min-w-0 flex-1 cursor-pointer items-start gap-2 text-xs leading-5 text-heading">
                <input type="checkbox" :checked="selected.includes(layer.id)" :disabled="loading" class="mt-0.5 size-4 shrink-0 accent-brand-copper" @change="toggle(layer.id, ($event.target as HTMLInputElement).checked)" />
                <span class="mt-1 size-3 shrink-0 rounded-full" :style="{ backgroundColor: mapLayerColor(layer.id) }" aria-hidden="true" />
                <span class="break-words font-medium">{{ layer.name }}</span>
              </label>
              <button type="button" class="shrink-0 rounded-md p-2 text-brand-copper-dark hover:bg-brand-cream focus-visible:outline-2 focus-visible:outline-brand-copper" :aria-label="'Localizar ' + layer.name" :disabled="!rendered.some((entry) => entry.layer.id === layer.id)" @click="locate(layer.id)">⌖</button>
            </div>
            <p class="ml-6 mt-1 text-[11px] text-muted">{{ mapCategories[layer.category] }} · v{{ layer.version }}</p>
            <p v-if="pending.includes(layer.id)" role="status" class="ml-6 mt-1 text-xs text-muted">Cargando geometría…</p>
            <div v-if="failures[layer.id] && selected.includes(layer.id)" role="alert" class="ml-6 mt-2 text-xs text-body">
              <p>{{ failures[layer.id] }}</p>
              <button type="button" class="mt-1 min-h-9 font-semibold text-brand-copper-dark underline" :disabled="pending.includes(layer.id)" @click="loadGeometry(layer.id)">Reintentar capa</button>
            </div>
          </li>
        </ul>
      </aside>
      <SimredMapCanvas :layers="rendered" :focus="focus" :compact="compact" />
    </div>
    <footer class="flex flex-wrap items-center justify-between gap-2 border-t border-brand-navy/10 px-4 py-3 text-[11px] text-muted">
      <span>{{ refreshedAt ? 'Consulta actualizada a las ' + refreshedAt.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : 'Información cartográfica publicada por SEDALP' }}</span>
      <button type="button" class="min-h-9 font-semibold text-brand-copper-dark underline underline-offset-4 disabled:opacity-50" :disabled="loading" @click="refresh">Actualizar capas</button>
    </footer>
  </section>
</template>

<style scoped>
.map-button { @apply inline-flex min-h-10 items-center justify-center rounded-lg border border-brand-navy/15 bg-white px-3 text-xs font-semibold text-heading transition-colors hover:border-brand-copper hover:text-brand-copper-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-copper disabled:cursor-not-allowed disabled:opacity-40; }
.map-input { @apply h-11 w-full min-w-0 rounded-lg border border-brand-navy/15 bg-white px-3 text-xs font-normal text-heading outline-none focus:border-brand-copper focus:ring-2 focus:ring-brand-copper/20; }
.public-map-viewer:fullscreen { width: 100%; height: 100%; padding: 1rem; }
@reference "../../assets/css/main.css";
</style>

