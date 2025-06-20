import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	distDir: '.next',
	// Enable API proxy for forecasting backend
	async rewrites() {
		const apiUrl = process.env.NEXT_PUBLIC_API_URL_Forcast || 'http://localhost:8001/api/v1';
		return [
			{
				source: '/api/v1/:path*',
				destination: `${apiUrl}/:path*`
			}
		];
	},


	//async rewrites() {
	//	const forecastApi = process.env.NEXT_PUBLIC_API_URL_Forcast || 'http://localhost:8001/api/v1';
	//	const dbAgentApi = process.env.NEXT_PUBLIC_API_URL_DBAgent || 'http://localhost:8002';
	  
	//	return [
	//	  {
	//		source: '/api/v1/:path*',
	//		destination: `${forecastApi}/:path*`,
	//	  },
	//	  {
	//		source: '/db-agent/:path*',
	//		destination: `${dbAgentApi}/:path*`,
	//	  }
	//	];
	//  },

	  
	
	// Environment variable configuration
	env: {
		// For AWS App Runner for Forecasting 
		NEXT_PUBLIC_API_URL_Forcast: process.env.NEXT_PUBLIC_API_URL_Forcast || 'http://localhost:8001/api/v1',
		
		// For App Runner for DB AI Agent
		NEXT_PUBLIC_API_URL_DBAgent: process.env.NEXT_PUBLIC_API_URL_DBAgent || 'http://localhost:8002/',
		// WebSocket Gateway URL
		NEXT_PUBLIC_WS_GATEWAY: process.env.NEXT_PUBLIC_WS_GATEWAY || 'wss://5nu02h2v13.execute-api.eu-west-2.amazonaws.com/production'
		
	}
};

export default nextConfig;


