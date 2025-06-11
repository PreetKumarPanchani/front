import 'server-only';

import { router } from './trpc';
import { drivers } from '@/features/drivers/server/trpc';
import { order_lines } from '@/features/order_lines/server/trpc';
import { orders } from '@/features/orders/trpc';
import { maps } from '@/features/maps/trpc';
import { customers } from '@/features/customers/trpc';
import { vehicles } from '@/features/vehicles/trpc';
import { depots } from '@/features/depots/trpc';
import { temp } from '@/features/temp/trpc';

export const appRouter = router({
	drivers,
	orders,
	order_lines,
	maps,
	customers,
	vehicles,
	depots,

	temp,
});
export type AppRouter = typeof appRouter;
