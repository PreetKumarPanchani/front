'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import React from 'react';
import { reactClient } from './client';

export default function TrpcProvider({ children }: { children: React.ReactNode }) {
	const queryClient = new QueryClient();
	const trpcClient = reactClient.createClient({
		links: [
			httpBatchLink({
				url: '/api/trpc',
			}),
		],
	});

	return (
		<reactClient.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</reactClient.Provider>
	);
}
