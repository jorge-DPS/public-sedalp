import type { MapCatalog, MapGeometry, PublicMapLayer, RenderedMapLayer } from "~/types/maps";

export function usePublicMapLayers() {
  const config = useRuntimeConfig();
  const layers = shallowRef<PublicMapLayer[]>([]);
  const selected = ref<number[]>([]);
  const geometries = shallowRef<Record<number, MapGeometry>>({});
  const failures = ref<Record<number, string>>({});
  const pending = ref<number[]>([]);
  const loading = ref(false);
  const error = ref("");
  const refreshedAt = ref<Date>();
  let initialized = false;
  let generation = 0;
  let catalogRequest: AbortController | undefined;
  const requests = new Map<number, AbortController>();

  const rendered = computed<RenderedMapLayer[]>(() => layers.value.flatMap((layer) => {
    const geometry = geometries.value[layer.id];
    return selected.value.includes(layer.id) && geometry ? [{ layer, geometry }] : [];
  }));

  async function loadGeometry(id: number): Promise<void> {
    if (geometries.value[id] || requests.has(id)) return;
    const currentGeneration = generation;
    const request = new AbortController();
    requests.set(id, request);
    pending.value = [...pending.value, id];
    delete failures.value[id];
    try {
      const data = await $fetch<MapGeometry>("/public/map-layers/" + id + "/geojson", {
        baseURL: config.public.apiBase,
        signal: request.signal,
        timeout: 30000,
        retry: 0,
        headers: { Accept: "application/geo+json" },
      });
      if (request.signal.aborted || currentGeneration !== generation) return;
      if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) throw new Error("Invalid GeoJSON");
      geometries.value = { ...geometries.value, [id]: data };
    } catch (failure) {
      if (!request.signal.aborted && currentGeneration === generation) {
        const status = (failure as { statusCode?: number }).statusCode;
        failures.value[id] = status === 404
          ? "Esta capa ya no está publicada. Actualiza el catálogo."
          : "No se pudo cargar esta capa.";
      }
    } finally {
      if (requests.get(id) === request) {
        requests.delete(id);
        pending.value = pending.value.filter((value) => value !== id);
      }
    }
  }

  function toggle(id: number, visible: boolean): void {
    selected.value = visible
      ? [...new Set([...selected.value, id])]
      : selected.value.filter((value) => value !== id);
    if (visible) void loadGeometry(id);
  }

  function toggleBoundaries(visible: boolean): void {
    for (const layer of layers.value.filter((item) => item.kind === "boundary")) toggle(layer.id, visible);
  }

  async function refresh(): Promise<void> {
    const currentGeneration = ++generation;
    catalogRequest?.abort();
    for (const request of requests.values()) request.abort();
    requests.clear();
    pending.value = [];
    const request = new AbortController();
    catalogRequest = request;
    loading.value = true;
    error.value = "";
    failures.value = {};
    geometries.value = {};
    const previousLayers = new Set(layers.value.map((layer) => layer.id));
    const previousSelection = new Set(selected.value);
    layers.value = [];
    selected.value = [];
    try {
      const catalog: PublicMapLayer[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const result = await $fetch<MapCatalog>("/public/map-layers", {
          baseURL: config.public.apiBase,
          query: { page, per_page: 50 },
          signal: request.signal,
          timeout: 15000,
          retry: 0,
          headers: { Accept: "application/json" },
        });
        catalog.push(...result.data);
        lastPage = result.meta.last_page;
      } while (++page <= lastPage);
      if (request.signal.aborted) return;
      layers.value = catalog;
      selected.value = catalog.filter((layer) =>
        previousSelection.has(layer.id) ||
        ((!initialized || !previousLayers.has(layer.id)) && layer.kind === "boundary"),
      ).map((layer) => layer.id);
      initialized = true;
      const queue = [...selected.value];
      await Promise.all(Array.from({ length: 3 }, async () => {
        while (queue.length && !request.signal.aborted) {
          const id = queue.shift();
          if (id !== undefined) await loadGeometry(id);
        }
      }));
      if (!request.signal.aborted) refreshedAt.value = new Date();
    } catch {
      if (!request.signal.aborted) error.value = "No se pudo consultar la cartografía. Comprueba tu conexión e inténtalo otra vez.";
    } finally {
      if (currentGeneration === generation) loading.value = false;
    }
  }

  onMounted(() => { void refresh(); });
  onBeforeUnmount(() => {
    generation++;
    catalogRequest?.abort();
    for (const request of requests.values()) request.abort();
  });

  return { layers, selected, rendered, failures, pending, loading, error, refreshedAt, refresh, toggle, toggleBoundaries, loadGeometry };
}

