import 'server-only';

import db from '@/server/db';
import { Depots } from '@/server/schema/legacy_schema';
import { procedure } from '@/server/trpc';
import { addDepotInput } from './schema';
import { ResultAsync } from 'neverthrow';
import { wrapPgErrorUntyped } from '@/lib/postgresErrorWrapper';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

const default_limit = 50;
export type Depot = typeof Depots.$inferSelect;

export const depots = {
	addDepot: procedure.input(addDepotInput).mutation(async (opts) => {
		const depot = opts.input;
		const result = ResultAsync.fromPromise(
			db.insert(Depots).values(depot).returning({ id: Depots.depot_id }),
			wrapPgErrorUntyped
		);
		return result;
	}),

	getDepots: procedure.query(async () => {
		return await db.select().from(Depots).limit(default_limit);
	}),

	getDepot: procedure.input(z.number()).query(async (opts) => {
		const query = db
			.select()
			.from(Depots)
			.limit(default_limit)
			.where(eq(Depots.depot_id, opts.input));
		return (await query)?.[0] ?? null;
	}),

	deleteDepot: procedure.input(z.number()).mutation(async (opts) => {
		const deleted = await db.delete(Depots).where(eq(Depots.depot_id, opts.input));
		return deleted.rowCount === 1 ? true : false;
	}),
};
