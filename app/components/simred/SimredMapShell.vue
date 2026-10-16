<script setup lang="ts">
defineProps<{ compact?: boolean }>();
const container = ref<HTMLElement>();
const visible = ref(false);
let observer: IntersectionObserver | undefined;
onMounted(() => {
  if (!container.value) return;
  observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      visible.value = true;
      observer?.disconnect();
    }
  }, { rootMargin: "250px" });
  observer.observe(container.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div ref="container" :class="compact ? 'min-h-[480px]' : 'min-h-[620px]'">
    <ClientOnly>
      <LazySimredMapViewer v-if="visible" :compact="compact" />
      <div v-else class="flex min-h-[480px] items-center justify-center bg-surface-soft p-8 text-sm text-muted" role="status">Preparando el visor territorial…</div>
      <template #fallback>
        <div class="flex min-h-[480px] items-center justify-center bg-surface-soft p-8 text-sm text-muted" role="status">Cargando el visor territorial…</div>
      </template>
    </ClientOnly>
    <noscript><p class="p-4 text-sm">Activa JavaScript para explorar el mapa interactivo.</p></noscript>
  </div>
</template>

