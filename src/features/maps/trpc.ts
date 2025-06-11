import { procedure } from '@/server/trpc';
import { z } from 'zod';
import { geocodeAddresses } from './geocode';
import { getDistances } from './distances';

const mapLocation = z.tuple([z.number(), z.number()]);
export const maps = {
	geocodeAddresses: procedure.input(z.array(z.string())).query(async (opts) => {
		return await geocodeAddresses(opts.input);
	}),

	getDistances: procedure.input(z.array(mapLocation)).query(async (opts) => {
		return await getDistances(opts.input);
	}),
};
