'use client';

import {
	FullscreenControl,
	LogoControl,
	Map,
	Marker,
	NavigationControl,
	ScaleControl,
	type MapEvent,
	type MapRef,
	type MarkerEvent,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import React, { useEffect, useRef, useState } from 'react';
import './DeliveryMap.css';
import { type MapLocation } from './deliveryTypes';
import maplibregl from 'maplibre-gl';
import { orderSizes, solveVRP } from './vrp';
import { trpcClient } from '../_trpc/client';
import type { LocationMap } from '@/features/maps/geocode';

const BUTTON_CONTROL_STYLE = 'width: 7em; height: 3em;';

function addPlotRoute(map: maplibregl.Map, props: { onClick: (_: MouseEvent) => void }) {
	const { onClick } = props;
	const container = document.createElement('div');
	const prompt = 'Plot routes';
	container.innerHTML = `
   <div class="maplibregl-ctrl maplibregl-ctrl-group">
		<button type="button" aria-label="${prompt}" title="${prompt}" style="${BUTTON_CONTROL_STYLE}">
			<span style="color:black">${prompt}</span>
		</button>
	</div>
   `;

	const control = {
		onAdd() {
			return container;
		},
		onRemove() {
			container.remove();
		},
	};

	map.addControl(control, 'top-left');

	const btn = container.querySelector('button')!;
	btn.onclick = onClick;
}

function addLocationToggler(map: maplibregl.Map, props: { onClick: (_: MouseEvent) => void }) {
	const { onClick } = props;
	const container = document.createElement('div');
	const prompt = 'Toggle all locations';
	container.innerHTML = `
   <div class="maplibregl-ctrl maplibregl-ctrl-group">
		<button type="button" aria-label="${prompt}" title="${prompt}" style="${BUTTON_CONTROL_STYLE}">
			<span style="color:black">${prompt}</span>
		</button>
	</div>
   `;

	const control = {
		onAdd() {
			return container;
		},
		onRemove() {
			container.remove();
		},
	};

	map.addControl(control, 'top-left');

	const btn = container.querySelector('button')!;
	btn.onclick = onClick;
}

async function initialiseMap(map: maplibregl.Map) {}

type Location = { address: string; location: MapLocation };
type MapComponentProps = { depot: MapLocation; places: Location[] };
function MapComponent({ depot, places }: MapComponentProps) {
	/*
   - Initial position is depot (label depot)
   - Markers for each location (label is index)
   */
	// This is just a view of the locations that need to be visited. If route is
	// possible do route.

	// Geocoding is even more complex than mapping the world, so options are:
	// - Harcode them by manually converting addresses to geocodes (see
	//   https://nominatim.geocoding.ai/search.html)
	// - Free tier of commercial applications (https://www.geoapify.com/)
	// - Heavily rate-limited public apis (see
	//   https://maplibre.org/maplibre-gl-js/docs/examples/geocoder/)
	// - Self-hosting (https://nominatim.org/release-docs/latest/admin/Installation/)

	// In testing will use hardcoded stuff, when demoing probably have a cached
	// version of commercial solutions

	// Allow users to choose specific orders on the maps and get those orders
	// planned.

	// look into sources, targets
	/*
   max(source, targ) * min(source, targ, 5) * 2
   (source + targ) * 10 vs source * targ * 2
   */

	const mapRef = useRef<MapRef>(null as any);

	const locationsString = [`${depot[1]},${depot[0]}`, ...places.map((place) => place.address)];
	const rest = places.map((place) => place.location);

	const [clicked, setClicked] = useState<boolean[]>(rest.flatMap((_) => false));

	function getLocOnLick(i: number): (e: MarkerEvent<MouseEvent>) => void {
		return function (e: MarkerEvent<MouseEvent>) {
			const isSelected = clicked[i];
			if (!isSelected) {
				clicked[i] = true;
				e.target.addClassName('location-selected');
			} else {
				clicked[i] = false;
				e.target.removeClassName('location-selected');
			}
			setClicked([...clicked]);
		};
	}
	const locationPoints = rest.map((p, i) => (
		<Marker
			key={i}
			longitude={p[0]}
			latitude={p[1]}
			color="var(--marker-fill)"
			className="location-marker has-onclick"
			onClick={getLocOnLick(i)}
		/>
	));

	function toggleAll() {
		const container = mapRef.current.getMap()._container;
		const unclicked = container.querySelectorAll(
			'.maplibregl-marker.location-marker.has-onclick:not(.location-selected)'
		) as NodeListOf<HTMLDivElement>;
		if (unclicked.length === 0) {
			const clicked = container.querySelectorAll(
				'.maplibregl-marker.location-marker.has-onclick.location-selected'
			) as NodeListOf<HTMLDivElement>;
			clicked.forEach((loc) => loc.click());
		} else {
			unclicked.forEach((loc) => loc.click());
		}
	}

	const [routesComponent, setRoutesComponent] = useState<React.JSX.Element[] | null>(null);

	function ungeocode(geocoded: LocationMap[]) {
		const points = Array.from({ length: locationsString.length }, () => [] as any as MapLocation);
		for (const point of geocoded) {
			const i = locationsString.findIndex((loc) => loc === point.text);
			points[i] = point.location;
		}
		return points;
	}

	async function plotRouteWithClicked(clicked: boolean[]) {
		const clickedIndexes = clicked.flatMap((isClicked, i) => (isClicked ? [i + 1] : []));
		const geocoded = await trpcClient.maps.geocodeAddresses.query(locationsString);
		const points = ungeocode(geocoded);
		const distances = await trpcClient.maps.getDistances.query(points);
		const vrp = solveVRP(distances.stt, orderSizes, clickedIndexes);
		const routes = vrp.map((route) => {
			const query = route
				.map((loc) => {
					// const l = locations.sources[loc].location;
					// const coords = `${l[1]},${l[0]}`;
					// const name = locations_str[loc].replaceAll(' ', '+');
					// return `(${coords})+${name}`;
					return locationsString[loc].replaceAll(' ', '+');
				})
				.join('/');

			return `https://www.google.co.uk/maps/dir/${query}`;
		});
		const routesComponent = routes.map((route, i) => (
			<li key={i}>
				<a href={route}>{`Delivery route ${i + 1}`}</a>
			</li>
		));
		setRoutesComponent(routesComponent);
	}

	function plotRoute() {
		setClicked((c) => {
			plotRouteWithClicked(c);
			return c;
		});
	}

	function onLoad(e: MapEvent) {
		const map = mapRef.current.getMap();
		initialiseMap(map);
		addLocationToggler(map, { onClick: toggleAll });
		addPlotRoute(map, { onClick: plotRoute });
	}

	const initialViewState = { longitude: depot[0], latitude: depot[1], zoom: 14 };

	return (
		<>
			<div className="map-view">
				<Map
					initialViewState={initialViewState}
					style={{ width: 600, height: 400 }}
					// mapStyle="https://demotiles.maplibre.org/style.json"
					mapStyle="https://tiles.openfreemap.org/styles/liberty"
					ref={mapRef}
					onLoad={onLoad}
				>
					<ScaleControl />
					<NavigationControl />
					<LogoControl />
					<FullscreenControl />
					<Marker
						longitude={depot[0]}
						latitude={depot[1]}
						popup={new maplibregl.Popup({ className: 'depot-popup', closeButton: false })
							.setLngLat(depot)
							.setText('Depot')
							.setOffset(30)}
						className="has-onclick"
					/>

					{locationPoints}
				</Map>
			</div>
			<pre style={{ tabSize: 4 }}>{JSON.stringify(clicked)}</pre>
			<ul>{routesComponent}</ul>
		</>
	);
}

export default function DeliveryMap(props: MapComponentProps) {
	const [initialised, setInitialised] = useState(false);
	useEffect(() => {
		setInitialised(true);
	}, []);
	return initialised ? (
		<MapComponent {...props} />
	) : (
		<div style={{ width: 600, height: 400 }}></div>
	);
}
