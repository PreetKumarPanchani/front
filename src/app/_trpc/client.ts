import { createTRPCClient, createTRPCReact, httpBatchLink } from '@trpc/react-query';
import { type AppRouter } from '@/server/router';

export const reactClient = createTRPCReact<AppRouter>({});
export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: '/api/trpc',
		}),
	],
});
