import type { MapCategory } from "~/types/maps";

export const mapCategories: Record<MapCategory, string> = {
  boundaries: "Límites regionales",
  roads: "Carreteras y rutas",
  rivers: "Ríos",
  cableways: "Teleféricos",
  other: "Otros / puntos de interés",
};

// Colores cartográficos estables: el mismo ID conserva su color al filtrar.
const colors = ["#2563eb", "#b45309", "#047857", "#7c3aed", "#be185d", "#0e7490", "#c2410c"];
export function mapLayerColor(id: number): string {
  return colors[(id - 1) % colors.length] ?? colors[0]!;
}

export function normalizeMapSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

