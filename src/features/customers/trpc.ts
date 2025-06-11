import db from '@/server/db';
import { Customers } from '@/server/schema/legacy_schema';
import { procedure } from '@/server/trpc';

const default_limit = 50;
export const customers = {
	getCustomers: procedure.query(async () => {
		return await db.select().from(Customers).limit(default_limit);
	}),
};
