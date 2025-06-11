import 'server-only';

import db from '@/server/db';
import { procedure } from '@/server/trpc';
import { PickTable } from '@/server/schema/sku_schema';
import { z } from 'zod';
import { Depots } from '@/server/schema/legacy_schema';
import { isNotNull } from 'drizzle-orm';

const default_limit = 50;

export const temp = {
	getPicks: procedure.query(async () => {
		return await db
			.select()
			.from(PickTable)
			.limit(default_limit)
			.where(isNotNull(PickTable.source_line_id));
	}),
};
