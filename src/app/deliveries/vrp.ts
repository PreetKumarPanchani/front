import type { SourceToTarg } from './deliveryTypes';

const TRUCK_CAPACITY = 23;
export const DEPOT_INDEX = 0;

// Sample asymmetric distance/time matrix (you'll replace this with your real data)
type SavingsMetric = 'distance' | 'time';

export const orderSizes = [0, 5, 5, 5, 5, 5, 5, 5, 5, 5];

/**
 * Is order included in `order_indexes` and not the depot?
 * @param order
 * @param order_indexes
 * @returns
 */
function is_valid_order(order: number, order_indexes: number[]): boolean {
	return order !== DEPOT_INDEX && order_indexes.includes(order);
}

function computeSavings(
	distances: SourceToTarg[][],
	metric: SavingsMetric,
	order_indexes: number[]
): [number, number, number][] {
	let savings: [number, number, number][] = [];

	for (const stt1 of distances) {
		for (const dist of stt1) {
			const i = dist.source_index;
			const j = dist.target_index;
			if (i === j || !is_valid_order(i, order_indexes) || !is_valid_order(j, order_indexes)) {
				continue;
			}

			const directDist = dist[metric];

			function getPointDistance(source_index: number, target_index: number) {
				for (const stt1 of distances) {
					for (const dist of stt1) {
						if (dist.source_index == source_index && dist.target_index == target_index) {
							return dist;
						}
					}
				}
			}

			const viaDepot =
				(getPointDistance(i, DEPOT_INDEX)?.[metric] ?? -Infinity) +
				(getPointDistance(DEPOT_INDEX, j)?.[metric] ?? -Infinity);
			// -Infinity = via depot is infinitely quick

			const saving = viaDepot - (directDist ?? Infinity);
			savings.push([i, j, saving]);
		}
	}

	return savings.sort((a, b) => b[2] - a[2]);
}

// ------------------------------- ✨ VIBE ZONE ✨ -------------------------------

export function solveVRP(
	distances: SourceToTarg[][],
	orders: number[],
	order_indexes: number[]
): number[][] {
	const savingsList = computeSavings(distances, 'time', order_indexes);
	let routes: number[][] = [];
	let capacities: number[] = [];

	for (const [from, to, saving] of savingsList) {
		if (saving <= 0) {
			continue;
		}

		let fromRouteIndex = -1,
			toRouteIndex = -1;

		// Find which routes contain the "from" and "to" nodes
		for (let i = 0; i < routes.length; i++) {
			if (routes[i].includes(from)) fromRouteIndex = i;
			if (routes[i].includes(to)) toRouteIndex = i;
		}

		// Case 1: Both nodes are unassigned → Create a new route
		if (fromRouteIndex === -1 && toRouteIndex === -1) {
			const newCapacity = orders[from] + orders[to];
			if (newCapacity <= TRUCK_CAPACITY) {
				routes.push([from, to]);
				capacities.push(newCapacity);
			}
		}
		// Case 2: Both are assigned and are already in the same route
		else if (fromRouteIndex == toRouteIndex) {
			continue;
		}
		// Case 3: One node is assigned → Try adding the other node
		else if (fromRouteIndex !== -1 && toRouteIndex === -1) {
			if (capacities[fromRouteIndex] + orders[to] <= TRUCK_CAPACITY) {
				routes[fromRouteIndex].push(to);
				capacities[fromRouteIndex] += orders[to];
			}
		} else if (toRouteIndex !== -1 && fromRouteIndex === -1) {
			if (capacities[toRouteIndex] + orders[from] <= TRUCK_CAPACITY) {
				routes[toRouteIndex].unshift(from);
				capacities[toRouteIndex] += orders[from];
			}
		}
		// Case 4: Both nodes exist in different routes → Try merging routes
		else if (fromRouteIndex !== toRouteIndex) {
			const combinedCapacity = capacities[fromRouteIndex] + capacities[toRouteIndex];
			if (combinedCapacity <= TRUCK_CAPACITY) {
				// Merge routes in correct direction
				if (
					routes[fromRouteIndex][routes[fromRouteIndex].length - 1] === from &&
					routes[toRouteIndex][0] === to
				) {
					routes[fromRouteIndex] = routes[fromRouteIndex].concat(routes[toRouteIndex]);
				} else if (
					routes[toRouteIndex][routes[toRouteIndex].length - 1] === to &&
					routes[fromRouteIndex][0] === from
				) {
					routes[toRouteIndex] = routes[toRouteIndex].concat(routes[fromRouteIndex]);
				}
				// Remove merged route
				routes.splice(toRouteIndex, 1);
				capacities[fromRouteIndex] = combinedCapacity;
			}
		}
	}

	// Ensure each route starts & ends at the depot
	let seen: number[] = [];
	for (let i = 0; i < routes.length; i++) {
		routes[i] = [DEPOT_INDEX, ...routes[i], DEPOT_INDEX];
		seen = [...seen, ...routes[i]];
	}
	for (const ind of order_indexes) {
		if (seen.includes(ind)) {
			continue;
		}

		routes.push([DEPOT_INDEX, ind, DEPOT_INDEX]);
	}

	return routes;
}

// ----------------------------- ✨ VIBE ZONE END ✨ -----------------------------
