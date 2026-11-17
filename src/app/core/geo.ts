import { LatLng } from './models';

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface Cluster<T> {
  anchor: T;
  members: T[];
  /** Greedy nearest-neighbour visiting order starting from the anchor. */
  route: T[];
  routeKm: number;
}

/**
 * Greedy radius clustering: repeatedly take the point with the most neighbours within `radiusKm`
 * and pull those neighbours into a cluster. Good enough for "weekend trip" suggestions.
 */
export function clusterByRadius<T extends LatLng>(points: T[], radiusKm: number, minSize = 2): Cluster<T>[] {
  const pool = new Set(points);
  const out: Cluster<T>[] = [];
  while (pool.size) {
    let best: T | null = null;
    let bestN: T[] = [];
    for (const p of pool) {
      const n = [...pool].filter((q) => distanceKm(p, q) <= radiusKm);
      if (n.length > bestN.length) {
        best = p;
        bestN = n;
      }
    }
    if (!best || bestN.length < minSize) break;
    bestN.forEach((p) => pool.delete(p));
    const { route, km } = nearestNeighbourRoute(best, bestN);
    out.push({ anchor: best, members: bestN, route, routeKm: km });
  }
  return out;
}

function nearestNeighbourRoute<T extends LatLng>(start: T, pts: T[]): { route: T[]; km: number } {
  const left = pts.filter((p) => p !== start);
  const route = [start];
  let km = 0;
  let cur = start;
  while (left.length) {
    let i = 0;
    left.forEach((p, j) => {
      if (distanceKm(cur, p) < distanceKm(cur, left[i])) i = j;
    });
    km += distanceKm(cur, left[i]);
    cur = left.splice(i, 1)[0];
    route.push(cur);
  }
  return { route, km };
}
