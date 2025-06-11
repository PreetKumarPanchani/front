import React from 'react';
import './styles.css';
import DBTable from '@/components/DBTable';
import { serverClient } from '../_trpc/serverClient';
import DeliveryMap from './DeliveryMap';

export default async function Deliveries() {
	const [_, depot, picks] = await Promise.all([
		serverClient.orders.getOrders({}),
		serverClient.depots.getDepot(1),
		serverClient.temp.getPicks(),
	]);

	const addresses: string[] = [];
	for (const pick of picks) {
		const address = pick?.to_address;
		if (address && !addresses.includes(address)) {
			addresses.push(address);
		}
	}

	const locations = await serverClient.maps.geocodeAddresses(addresses);

	const places = [];
	for (const address of addresses) {
		const location = locations.find((l) => l.text == address);
		if (!location?.location) {
			continue;
		}
		places.push({ address, location: location.location });
	}

	return (
		<>
			<h2>Delivery route planner</h2>
			{/* <DBTable content={orders} /> */}
			<DeliveryMap depot={[depot.longitude, depot.latitude]} places={places} />
		</>
	);
}
