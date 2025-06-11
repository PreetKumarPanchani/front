import 'server-only';

import db from '@/server/db';
import { Drivers } from '@/server/schema/legacy_schema';
import { procedure } from '@/server/trpc';
import { addDriverInput } from './schema';
import { ResultAsync } from 'neverthrow';
import { wrapPgErrorUntyped } from '@/lib/postgresErrorWrapper';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

const default_limit = 50;
export type Driver = typeof Drivers.$inferSelect;

export const drivers = {
	addDriver: procedure.input(addDriverInput).mutation(async (opts) => {
		const driver = opts.input;
		const result = ResultAsync.fromPromise(
			db.insert(Drivers).values(driver).returning({ id: Drivers.driver_id }),
			wrapPgErrorUntyped
		);
		return result;
	}),

	getDrivers: procedure.query(async () => {
		return await db.select().from(Drivers).limit(default_limit);
	}),

	deleteDriver: procedure.input(z.number()).mutation(async (opts) => {
		const deleted = await db.delete(Drivers).where(eq(Drivers.driver_id, opts.input));
		return deleted.rowCount === 1 ? true : false;
	}),
};
