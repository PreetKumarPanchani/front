import 'server-only';

import fs from 'fs/promises';
import path from 'path';
import type { MapLocation, SourceToTarg } from '@/app/deliveries/deliveryTypes';
import type { LocationMap } from '@/features/maps/geocode';

// Ideally this would be done with something like Redis but local storage is
// fine for now.

const CACHE_PATH = path.resolve('./cache.json');

export type RouteCache = { locations: MapLocation[]; stt: SourceToTarg[][] };
const defaultRoutes = { locations: [], stt: [] };

export type LocationCache = LocationMap[];
const defaultLocations: LocationCache = [];

export type CacheContent = { routes: RouteCache; locations: LocationCache };
let content: CacheContent;
const defaultContent: CacheContent = {
	routes: defaultRoutes,
	locations: defaultLocations,
};

export async function getCache(): Promise<CacheContent> {
	if (content) {
		return content;
	}

	const cache = (await readCache()) || ({} as any);
	content = { ...defaultContent, ...cache };
	return content;
	// const routes = cache?.routes;
	// if (!routes) {
	// 	const newCache = { ...cache, routes: [] };
	// 	writeCache(newCache);
	// 	return newCache.routes;
	// }

	// return routes;
}

async function readCache(): Promise<CacheContent | null> {
	try {
		const fileContent = await fs.readFile(CACHE_PATH, 'utf-8');
		return JSON.parse(fileContent);
	} catch {
		return null;
	}
}

export async function updateCache(newData: CacheContent) {
	content = newData;
	await writeCache(content);
}

async function writeCache(data: CacheContent) {
	await fs.writeFile(CACHE_PATH, JSON.stringify(data));
}
