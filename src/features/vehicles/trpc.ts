import 'server-only';

import db from '@/server/db';
import { Vehicles } from '@/server/schema/legacy_schema';
import { procedure } from '@/server/trpc';
import { addVehicleInput } from './schema';
import { ResultAsync } from 'neverthrow';
import { wrapPgErrorUntyped } from '@/lib/postgresErrorWrapper';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

const default_limit = 50;
export type Vehicle = typeof Vehicles.$inferSelect;

export const vehicles = {
	addVehicle: procedure.input(addVehicleInput).mutation(async (opts) => {
		const vehicle = opts.input;
		const result = ResultAsync.fromPromise(
			db.insert(Vehicles).values(vehicle).returning({ id: Vehicles.vehicle_id }),
			wrapPgErrorUntyped
		);
		return result;
	}),

	getVehicles: procedure.query(async () => {
		return await db.select().from(Vehicles).limit(default_limit);
	}),

	deleteVehicle: procedure.input(z.number()).mutation(async (opts) => {
		const deleted = await db.delete(Vehicles).where(eq(Vehicles.vehicle_id, opts.input));
		return deleted.rowCount === 1 ? true : false;
	}),
};
