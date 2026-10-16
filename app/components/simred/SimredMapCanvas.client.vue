<script setup lang="ts">
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RenderedMapLayer } from "~/types/maps";
import { mapLayerColor } from "~/utils/maps/presentation";

const props = defineProps<{
  layers: RenderedMapLayer[];
  focus: { token: number; id?: number };
  compact?: boolean;
}>();
const host = ref<HTMLDivElement>();
const tileError = ref(false);
let map: L.Map | undefined;
let observer: ResizeObserver | undefined;
const drawn = new Map<number, { group: L.GeoJSON; data: RenderedMapLayer["geometry"] }>();

function fit(id?: number): void {
  if (!map) return;
  const bounds = L.latLngBounds([]);
  for (const [key, value] of drawn) {
    if (id === undefined || key === id) {
      const next = value.group.getBounds();
      if (next.isValid()) bounds.extend(next);
    }
  }
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13, animate: false });
}

function render(): void {
  if (!map) return;
  const visible = new Set(props.layers.map((entry) => entry.layer.id));
  for (const [id, { group }] of drawn) {
    if (!visible.has(id)) { map.removeLayer(group); drawn.delete(id); }
  }
  for (const entry of props.layers) {
    const id = entry.layer.id;
    if (drawn.get(id)?.data === entry.geometry) continue;
    drawn.get(id)?.group.remove();
    const color = mapLayerColor(id);
    const group = L.geoJSON(entry.geometry, {
      style: { color, weight: 2, fillColor: color, fillOpacity: 0.17, className: "territory-feature" },
      pointToLayer: (_feature, latlng) => L.circleMarker(latlng, {
        color, fillColor: color, fillOpacity: 0.75, radius: 6, weight: 2, className: "territory-feature",
      }),
      onEachFeature: (_feature, featureLayer) => {
        const label = document.createElement("span");
        label.textContent = entry.layer.name;
        featureLayer.bindTooltip(label, { sticky: true, direction: "top" });
      },
    }).addTo(map);
    group.eachLayer((featureLayer) => {
      if (featureLayer instanceof L.Path) {
        const element = featureLayer.getElement();
        element?.setAttribute("tabindex", "0");
        element?.setAttribute("aria-label", entry.layer.name);
      }
    });
    drawn.set(id, { group, data: entry.geometry });
  }
}

onMounted(() => {
  if (!host.value) return;
  map = L.map(host.value, { scrollWheelZoom: false }).setView([-15.6, -68.1], 7);
  map.zoomControl.setPosition("topright");
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).on("tileerror", () => { tileError.value = true; }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);
  observer = new ResizeObserver(() => { map?.invalidateSize({ pan: false }); });
  observer.observe(host.value);
  render();
  fit();
});
watch(() => props.layers, render, { flush: "post" });
watch(() => props.focus, (focus) => { fit(focus.id); }, { flush: "post" });
onBeforeUnmount(() => { observer?.disconnect(); map?.remove(); drawn.clear(); });
</script>

<template>
  <div class="relative isolate min-w-0 bg-surface-soft">
    <div ref="host" class="public-territory-map w-full" :class="compact ? 'h-[420px]' : 'h-[480px] sm:h-[620px]'" role="region" aria-label="Mapa interactivo de las capas publicadas de La Paz" />
    <p v-if="tileError" role="status" class="absolute bottom-8 left-3 right-3 z-[500] max-w-md rounded-lg bg-white/95 px-3 py-2 text-xs text-body shadow-soft">
      El mapa base no pudo cargar algunas imágenes. Las capas publicadas siguen disponibles.
    </p>
  </div>
</template>

<style scoped>
.public-territory-map { font-family: inherit; }
.public-territory-map :deep(path.territory-feature:hover),
.public-territory-map :deep(path.territory-feature:focus) {
  outline: none;
  stroke-width: 4;
  fill-opacity: 0.38;
}
.public-territory-map :deep(.leaflet-control-attribution) { font-size: 10px; }
</style>

