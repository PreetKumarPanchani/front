import 'server-only';

import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { ca } from './ca';
const { Pool } = pkg;
// Some weird require vs import problem

let pool_config;
if (process.env.DB_URL) {
	pool_config = {
		connectionString: process.env.DB_URL,
	};
} else {
	pool_config = {
		host: process.env.DB_HOST!,
		port: +process.env.DB_PORT!,
		database: process.env.DB_NAME!,
		user: process.env.DB_USERNAME!,
		password: process.env.DB_PASSWORD!,
	};
}

if (process.env.RUN_CONTEXT !== 'local') {
	// @ts-ignore
	pool_config.ssl = { ca };
}

const pool = new Pool(pool_config);
const db = drizzle(pool);

export default db;
