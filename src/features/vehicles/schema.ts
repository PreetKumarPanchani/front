import { z } from 'zod';

export const addVehicleInput = z.object({
	reg: z.string(),
	make: z.string().nullable(),
	vehicle_type: z.string().nullable(),
	home_depot: z.number(),
});
