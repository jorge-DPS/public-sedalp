import type { FeatureCollection, Geometry } from "geojson";

export type MapCategory = "boundaries" | "roads" | "rivers" | "cableways" | "other";

export interface PublicMapLayer {
  id: number;
  name: string;
  description: string | null;
  kind: "boundary" | "overlay";
  category: MapCategory;
  region: { id: number; name: string } | null;
  published_at: string;
  version: number;
  feature_count: number;
  geometry_types: string[];
}

export interface MapCatalog {
  data: PublicMapLayer[];
  meta: { current_page: number; last_page: number };
}

export type MapGeometry = FeatureCollection<Geometry>;
export interface RenderedMapLayer {
  layer: PublicMapLayer;
  geometry: MapGeometry;
}

