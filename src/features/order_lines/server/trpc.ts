import db from '@/server/db';
import { OrderLines } from '@/server/schema/legacy_schema';
import { procedure } from '@/server/trpc';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';

const default_limit = 50;
export const order_lines = {
	getOrderLines: procedure.query(
		async () => await db.select().from(OrderLines).limit(default_limit)
	),

	getOrderLinesByOrderIds: procedure
		.input(z.array(z.number()))
		.query(
			async (opts) =>
				await db
					.select()
					.from(OrderLines)
					.where(inArray(OrderLines.order_id, opts.input))
					.limit(default_limit)
		),
};
