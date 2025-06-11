'use client';

import React from 'react';
import Form from '../orders/Form';
import { FormItem, FormSelectItem } from '../orders/OrderFilter';
import Button from '@/components/Button';
import DBTable from '@/components/DBTable';
import { trpcClient } from '../_trpc/client';
import { useState } from 'react';
import { useEffect } from 'react';
import { type Driver } from '@/features/drivers/server/trpc';
import { addDriverInput } from '@/features/drivers/server/schema';
import { wrapTrpcResult } from '@/lib/trpcConnectionWrapper';
import { formDataToStringObject } from '@/lib/handleFormData';
import type { Depot } from '@/features/depots/trpc';
import { addDepotInput } from '@/features/depots/schema';
import type { Vehicle } from '@/features/vehicles/trpc';
import { addVehicleInput } from '@/features/vehicles/schema';

/**
 * Return type of a {@link useState} call (i.e. `[state, setState]`).
 */
type UseStateWith<T> = ReturnType<typeof useState<T>>;

function DriverSection() {
	const [drivers, setDrivers] = useState<Driver[] | null>(null);

	useEffect(() => {
		(async () => {
			const drivers = await trpcClient.drivers.getDrivers.query();
			setDrivers(drivers);
		})();
	}, []);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const rawData = formDataToStringObject(formData, null);

		const parseResult = addDriverInput.safeParse(rawData);
		if (!parseResult.success) {
			// TODO error stuff
			alert(parseResult.error);
			return;
		}

		const driver = parseResult.data;
		const result = wrapTrpcResult(await trpcClient.drivers.addDriver.mutate(driver));
		if (result.isErr()) {
			alert(result.error.msg);
			return;
		}

		const id = result.value;
		const newDriver = { ...driver, driver_id: id[0].id };
		setDrivers((drivers) => [...(drivers || []), newDriver]);
	}

	async function deleteDriver(id: number) {
		const success = await trpcClient.drivers.deleteDriver.mutate(id);
		if (success) {
			setDrivers((drivers) => drivers?.filter((driver) => driver.driver_id !== id) ?? []);
		} else {
			alert('Deletion was unsuccessful');
		}
	}

	function getChildren(ctx: Driver) {
		return <Button onClick={() => deleteDriver(ctx.driver_id)}>Delete</Button>;
	}

	return (
		<>
			<Form onSubmit={handleSubmit}>
				<div className="responsive-grid">
					<FormItem id="first_name" label="First Name"></FormItem>
					<FormItem id="last_name" label="Last Name"></FormItem>
					<FormItem id="email" label="Email"></FormItem>
					<FormItem id="phone" label="Phone"></FormItem>
				</div>
				<Button type="submit">Submit</Button>
			</Form>

			<DBTable
				content={drivers || []}
				controls={[{ type: 'delete', children: getChildren }]}
			></DBTable>
		</>
	);
}

function VehicleSection({ depotState }: { depotState: UseStateWith<Depot[] | null> }) {
	const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
	const [depots, _] = depotState;

	useEffect(() => {
		(async () => {
			const vehicles = await trpcClient.vehicles.getVehicles.query();
			setVehicles(vehicles);
		})();
	}, []);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const rawData = formDataToStringObject(formData, null);

		rawData.home_depot = rawData.home_depot && (parseInt(rawData.home_depot) as any);

		const parseResult = addVehicleInput.safeParse(rawData);
		if (!parseResult.success) {
			// TODO error stuff
			alert(parseResult.error);
			return;
		}

		const vehicle = parseResult.data;
		const index = (depots ?? []).findIndex((depot) => vehicle.home_depot === depot.depot_id);
		if (index < 0) {
			alert(`Error: home depot with id ${vehicle.home_depot} not found.`);
			return;
		}

		const result = wrapTrpcResult(await trpcClient.vehicles.addVehicle.mutate(vehicle));
		if (result.isErr()) {
			alert(result.error.msg);
			return;
		}

		const id = result.value;
		const newVehicle = { ...vehicle, vehicle_id: id[0].id };
		setVehicles((vehicles) => [...(vehicles || []), newVehicle]);
	}

	async function deleteVehicle(id: number) {
		const success = await trpcClient.vehicles.deleteVehicle.mutate(id);
		if (success) {
			setVehicles((vehicles) => vehicles?.filter((vehicle) => vehicle.vehicle_id !== id) ?? []);
		} else {
			alert('Deletion was unsuccessful');
		}
	}

	function getChildren(ctx: Vehicle) {
		return <Button onClick={() => deleteVehicle(ctx.vehicle_id)}>Delete</Button>;
	}

	let depotsComponent = (
		<FormSelectItem
			id="home_depot"
			label="Home Depot ID"
			values={
				depots?.map((depot) => {
					return { value: depot.depot_id, display: depot.address };
				}) ?? []
			}
		></FormSelectItem>
	);
	depotsComponent = <FormItem id="home_depot" label="Home Depot ID"></FormItem>;

	return (
		<>
			<Form onSubmit={handleSubmit}>
				<div className="responsive-grid">
					<FormItem id="reg" label="Registration number"></FormItem>
					<FormItem id="make" label="Car make"></FormItem>
					<FormItem id="vehicle_type" label="Vehicle type"></FormItem>
					{depotsComponent}
				</div>
				<Button type="submit">Submit</Button>
			</Form>

			<DBTable
				content={vehicles || []}
				controls={[{ type: 'delete', children: getChildren }]}
			></DBTable>
		</>
	);
}

function DepotSection({ depotState }: { depotState: UseStateWith<Depot[] | null> }) {
	const [depots, setDepots] = depotState;

	useEffect(() => {
		(async () => {
			const depots = await trpcClient.depots.getDepots.query();
			setDepots(depots);
		})();
	}, []);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const rawData = formDataToStringObject(formData, null);

		rawData.latitude = rawData.latitude && (parseFloat(rawData.latitude) as any);
		rawData.longitude = rawData.longitude && (parseFloat(rawData.longitude) as any);

		const parseResult = addDepotInput.safeParse(rawData);
		if (!parseResult.success) {
			// TODO error stuff
			alert(parseResult.error);
			return;
		}

		const depot = parseResult.data;
		const result = wrapTrpcResult(await trpcClient.depots.addDepot.mutate(depot));
		if (result.isErr()) {
			alert(result.error.msg);
			return;
		}

		const id = result.value;
		const newDepot = { ...depot, depot_id: id[0].id };
		setDepots((depots) => [...(depots || []), newDepot]);
	}

	async function deleteDepot(id: number) {
		const success = await trpcClient.depots.deleteDepot.mutate(id);
		if (success) {
			setDepots((depots) => depots?.filter((depot) => depot.depot_id !== id) ?? []);
		} else {
			alert('Deletion was unsuccessful');
		}
	}

	function deleteRow(ctx: Depot) {
		return <Button onClick={() => deleteDepot(ctx.depot_id)}>Delete</Button>;
	}
	// TODO edit row button

	return (
		<>
			<Form onSubmit={handleSubmit}>
				<div className="responsive-grid">
					<FormItem id="address" label="Depot address"></FormItem>
					<FormItem id="longitude" label="Longitude"></FormItem>
					<FormItem id="latitude" label="Latitude"></FormItem>
				</div>
				<Button type="submit">Submit</Button>
			</Form>

			<DBTable
				content={depots || []}
				controls={[{ type: 'delete', children: deleteRow }]}
			></DBTable>
		</>
	);
}

export default function Admin() {
	const depotState = useState<Depot[] | null | undefined>(null);

	return (
		<>
			<h2>Admin interface</h2>

			<h3>Drivers</h3>
			<DriverSection />

			<h3>Vehicles</h3>
			<VehicleSection depotState={depotState} />

			<h3>Depots</h3>
			<DepotSection depotState={depotState} />
		</>
	);
}
