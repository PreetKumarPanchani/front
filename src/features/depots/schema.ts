import { z } from 'zod';

export const addDepotInput = z.object({
	address: z.string(),
	longitude: z.number(),
	latitude: z.number(),
});
