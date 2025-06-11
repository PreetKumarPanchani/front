import 'server-only';

import { type MapLocation, type SourceToTarg } from '@/app/deliveries/deliveryTypes';
import { getCache, updateCache, type CacheContent, type RouteCache } from '@/server/cache';
import { DEPOT_INDEX } from '@/app/deliveries/vrp';
import { sleep } from '@/lib/sleep';

type FlattenedDistance = {
	from: MapLocation;
	to: MapLocation;
	dist: { distance: number; time: number };
};

type FlattenedDistanceMatrix = {
	depot: MapLocation;
	distances: FlattenedDistance[];
};

// https://apidocs.geoapify.com/docs/route-matrix/#api
type Mode =
	| 'drive'
	| 'light_truck'
	| 'medium_truck'
	| 'truck'
	| 'heavy_truck'
	| 'truck_dangerous_goods'
	| 'long_truck'
	| 'bus'
	| 'scooter'
	| 'motorcycle'
	| 'bicycle'
	| 'mountain_bike'
	| 'road_bike'
	| 'walk'
	| 'hike'
	| 'transit'
	| 'approximated_transit';
type ResLoc = { original_location: MapLocation; location: MapLocation };
type Unit = 'metric' | 'imperial';
type Distance = string;
export type DistResponse = {
	sources: ResLoc[];
	targets: ResLoc[];
	sources_to_targets: SourceToTarg[][];
	units: Unit;
	distance_units: Distance;
	mode: Mode;
};

async function getMatrixGeoApify(locs: MapLocation[]): Promise<RouteCache> {
	const places = locs.map((loc) => {
		return { location: loc };
	});
	const req = { mode: 'light_truck', sources: places, targets: places };

	const res = await fetch(
		`https://api.geoapify.com/v1/routematrix?apiKey=${process.env.GEOAPIFY_KEY}`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(req),
		}
	);
	const mat: DistResponse = await res.json();
	console.log(JSON.stringify(mat));

	return {
		locations: mat.sources.map((loc) => loc.original_location),
		stt: mat.sources_to_targets,
	};
}

async function getMatrixFromApi(locs: MapLocation[]): Promise<RouteCache> {
	const res = await getMatrixGeoApify(locs);
	await sleep(500);
	return res;
}

function flattenDistanceMatrix({ locations, stt }: RouteCache): FlattenedDistanceMatrix {
	const depot = locations[DEPOT_INDEX];
	const distances: FlattenedDistance[] = [];
	for (const sttDist of stt.flat()) {
		if (sttDist.distance === null || sttDist.time === null) {
			continue;
		}

		const from = locations[sttDist.source_index];
		const to = locations[sttDist.target_index];
		const dist = { distance: sttDist.distance, time: sttDist.time };

		let prevIndex;
		do {
			prevIndex = distances.findIndex(
				(fd) => isMapLocEqual(from, fd.from) && isMapLocEqual(to, fd.to)
			);
			if (prevIndex > -1) {
				console.log();
				distances.splice(prevIndex, 1);
			}
		} while (prevIndex > -1);
		distances.push({ from, to, dist });
	}
	return { depot, distances };
}

function isMapLocEqual(self: MapLocation, other: MapLocation) {
	return self[0] === other[0] && self[1] == other[1];
}

/**
 * JavaScript SUCKS
 * @param findLoc
 * @param locations
 * @returns
 */
function indexOf(findLoc: MapLocation, locations: MapLocation[]): number | null {
	const loc = locations.findIndex((arrLoc) => isMapLocEqual(findLoc, arrLoc));
	if (loc >= 0) {
		return loc;
	}
	return null;
}

/**
 * Get index of `location` in `locations`, otherwise push to `locations` and
 * return new index.
 * @param location
 * @param locations
 * @returns
 */
function getIndex(location: MapLocation, locations: MapLocation[]): number {
	const ind = indexOf(location, locations);
	if (ind !== null) {
		return ind;
	}
	locations.push(location);
	return locations.length - 1;
}

/**
 * Reverse of {@link flattenDistanceMatrix}.
 * @param flatmat
 * @returns
 */
function unflattenMatrix({ depot, distances }: FlattenedDistanceMatrix): RouteCache {
	const locations = [depot];
	const stt: SourceToTarg[][] = [];
	for (const distance of distances) {
		const fromIndex = getIndex(distance.from, locations);
		const toIndex = getIndex(distance.to, locations);

		const newElementAmt = fromIndex + 1 - stt.length;
		for (let i = 0; i < newElementAmt; i++) {
			stt.push([]);
		}

		const dist = distance.dist;
		stt[fromIndex].push({
			distance: dist.distance,
			time: dist.time,
			source_index: fromIndex,
			target_index: toIndex,
		});
	}
	return { locations, stt };
}

async function updateCachedDistanceMatrix(
	cachedDistances: RouteCache,
	depot: MapLocation,
	locations: MapLocation[],
	cache: CacheContent
) {
	const flatCache = flattenDistanceMatrix(cachedDistances);
	const response = await getMatrixFromApi([depot, ...locations]);
	const flatResponse = flattenDistanceMatrix(response);

	const newFlat: FlattenedDistanceMatrix = {
		depot,
		distances: [...flatCache.distances, ...flatResponse.distances],
	};
	const unflat = unflattenMatrix(newFlat);
	const unflatDeDup = unflattenMatrix(flattenDistanceMatrix(unflat));
	// could probably do a more efficient operation
	updateCache({ ...cache, routes: unflatDeDup });
}

function isValidMatrix(dm: RouteCache) {
	const len = dm.locations.length;
	const outer = dm.stt;
	if (outer.length !== len) {
		return false;
	}
	for (const inner of outer) {
		if (inner.length !== len) {
			return false;
		}
	}
	return true;
}

export async function getDistanceMatrix(depot: MapLocation, locations: MapLocation[]) {
	const cache = await getCache();
	const cachedDistances = cache.routes;
	const locs = [depot, ...locations];

	const seenIndexes: number[] = cachedDistances.locations.flatMap((loc, i) => {
		const index = indexOf(loc, locs);
		if (index !== null) {
			return [i];
		} else {
			return [];
		}
		// if location is in `locs` then store the index from `cachedDistances`.
	});

	if (seenIndexes.length !== locs.length) {
		await updateCachedDistanceMatrix(cachedDistances, depot, locations, cache);
		return getDistanceMatrix(depot, locations);
	}

	const filteredDistances = cachedDistances.stt.flat().flatMap((stt) => {
		if (seenIndexes.includes(stt.source_index) && seenIndexes.includes(stt.target_index)) {
			return [stt];
		}
		return [];
	});
	const flat = flattenDistanceMatrix({
		locations: cachedDistances.locations,
		stt: [filteredDistances],
	});
	const dm = unflattenMatrix(flat);

	if (!isValidMatrix(dm)) {
		await updateCachedDistanceMatrix(cachedDistances, depot, locations, cache);
		return getDistanceMatrix(depot, locations);
	}

	return dm;
}

export async function getDistances(points: MapLocation[]): Promise<RouteCache> {
	const [depot, ...rest] = points;
	return getDistanceMatrix(depot, rest);
}
