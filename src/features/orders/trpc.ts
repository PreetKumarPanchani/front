import { eq, inArray } from 'drizzle-orm';
import { orderSourceValues, orderStatusValues } from '@/server/types';
import { procedure } from '@/server/trpc';
import { z } from 'zod';
import db from '@/server/db';
import { Orders } from '@/server/schema/legacy_schema';

const default_limit = 50;

export const orders = {
	getOrders: procedure
		.input(
			z.object({
				limit: z.number().max(default_limit).default(default_limit),
				customerIds: z.array(z.number()).optional(),
				source: z.enum(orderSourceValues).optional(),
				carrier: z.string().optional(),
				serviceLevel: z.string().optional(),
				status: z.enum(orderStatusValues).optional(),
			})
		)
		.query(async (opts) => {
			const { limit, customerIds, source, carrier, serviceLevel, status } = opts.input;
			let query = db.select().from(Orders);

			if (customerIds) {
				query.where(inArray(Orders.customer_id, customerIds));
			}
			if (source) {
				query.where(eq(Orders.order_source, source));
			}
			if (carrier) {
				query.where(eq(Orders.carrier, carrier));
			}
			if (serviceLevel) {
				query.where(eq(Orders.service_level, serviceLevel));
			}
			if (status) {
				query.where(eq(Orders.order_status, status));
			}

			const orders = await query.limit(limit);
			return orders;
		}),

	getOrder: procedure.input(z.number()).query(async (opts) => {
		const query = db.select().from(Orders).where(eq(Orders.order_id, opts.input));
		return (await query)?.[0] ?? null;
	}),
};
