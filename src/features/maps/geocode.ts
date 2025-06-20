import 'server-only';

import { type MapLocation } from '@/app/deliveries/deliveryTypes';
import { getCache, updateCache, type LocationCache } from '@/server/cache';
import { request } from 'undici';

async function waitForGeoApifyBatch(
	url: string,
	timeout_ms: number,
	max_requests: number
): Promise<Finished[]> {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			repeatUntilSuccess(resolve, reject, 0);
		}, timeout_ms);
	});

	// taken from https://www.geoapify.com/solutions/batch-geocoding-requests/
	type PromiseReturn<T> = (value: T) => void;
	async function repeatUntilSuccess(
		resolve: PromiseReturn<Finished[]>,
		reject: PromiseReturn<string | any>,
		attempt_no: number
	) {
		console.log('Attempt: ' + attempt_no);
		const result = await request(url);

		if (result.statusCode === 200) {
			const success = await result.body.json();
			resolve(success as Finished[]);
		} else if (attempt_no >= max_requests) {
			reject('Max amount of attempts achived');
		} else if (result.statusCode === 202) {
			// Check again after timeout
			setTimeout(() => {
				repeatUntilSuccess(resolve, reject, attempt_no + 1);
			}, timeout_ms);
		} else {
			// Something went wrong
			reject(await result.body.json());
		}
	}
}

type Waiting = {
	id: string;
	status: 'pending';
	url: string;
};
type Finished = {
	query: {
		text: string;
		parsed: {
			// ...
		};
	};
	// ...
	lon: number;
	lat: number;
	// ...
};
export type LocationMap = {
	text: string;
	location: MapLocation;
};
async function geocodeAddressesGeoapify(points: String[]): Promise<LocationCache> {
	const url = `https://api.geoapify.com/v1/batch/geocode/search?apiKey=${process.env.GEOAPIFY_KEY}`;

	const res = await fetch(url, {
		method: 'post',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(points),
	});

	const body = (await res.json()) as Waiting;
	const geocoded = await waitForGeoApifyBatch(body.url, 3 * 1000, 30);
	return geocoded.map((value) => {
		return {
			text: value.query.text,
			location: [value.lon, value.lat],
		};
	});
}

function allPointsAreCached(cache: LocationCache, points: string[]): boolean {
	for (const loc of points) {
		if (cache.findIndex((value: LocationMap) => value.text === loc) === -1) {
			return false;
		}
	}
	return true;
}

export async function geocodeAddresses(points: string[]): Promise<LocationCache> {
	const cache = await getCache();
	const cachedAddresses = cache.locations;

	if (allPointsAreCached(cachedAddresses, points)) {
		return cachedAddresses;
	}
	// TODO some flattening operation before updating the cache

	// const locs = [depot, ...locations];

	// const seenIndexes: number[] = cachedDistances.locations.flatMap((loc, i) => {
	// 	const index = indexOf(loc, locs);
	// 	if (index !== null) {
	// 		return [i];
	// 	} else {
	// 		return [];
	// 	}
	// 	// if location is in `locs` then store the index from `cachedDistances`.
	// });

	// if (seenIndexes.length !== locs.length) {
	// 	await updateCachedDistanceMatrix(cachedDistances, depot, locations, cache);
	// 	return getDistanceMatrix(depot, locations);
	// }
	const addresses = await geocodeAddressesGeoapify(points);
	updateCache({ ...cache, locations: [...cachedAddresses, ...addresses] });
	return addresses;
}
