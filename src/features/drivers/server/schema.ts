import { z } from 'zod';

export const addDriverInput = z.object({
	email: z.string().email(),
	first_name: z.string().nullable(),
	last_name: z.string().nullable(),
	phone: z.string().nullable(),
});
