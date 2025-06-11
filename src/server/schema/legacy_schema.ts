import { sql } from 'drizzle-orm';
import {
	check,
	date,
	integer,
	numeric,
	pgEnum,
	pgTable,
	real,
	serial,
	text,
	timestamp,
	unique,
	varchar,
} from 'drizzle-orm/pg-core';

export const OrderSource = pgEnum('order_source', ['unknown', 'shopify']);
// Don't put :: in any of these

export const OrderStatus = pgEnum('order_status', [
	'UNKNOWN',
	'NOT_STARTED',
	'READY_TO_PICK',
	'PICKED',
	'LOADED',
	'DISPATCHED',
	'MARSHALLING',
	'DELIVERED',
	'CANCELLED',
]);

export type PgEnum<T extends { enumValues: readonly string[] }> = T['enumValues'][number];

export const Customers = pgTable(
	'customers',
	{
		customer_id: serial().primaryKey(),
		source_customer_id: varchar('', { length: 50 }).notNull(),
		customer_source: OrderSource().notNull(),

		name: varchar('', { length: 100 }).notNull(),
		email: varchar('', { length: 255 }),
		phone: varchar('', { length: 20 }),

		address_1: varchar('', { length: 255 }),
		address_2: varchar('', { length: 255 }),
		address_3: varchar('', { length: 255 }),
		country: varchar('', { length: 100 }),
		postcode: varchar('', { length: 20 }),
	},
	(t) => [unique().on(t.source_customer_id, t.customer_source)]
);

export const Orders = pgTable(
	'orders',
	{
		order_id: serial().primaryKey(),
		customer_id: integer().references(() => Customers.customer_id, { onDelete: 'cascade' }),

		source_order_id: varchar('', { length: 50 }).notNull(),
		order_source: OrderSource().notNull(),

		order_date: timestamp().notNull(),
		deliver_by: timestamp().notNull(),
		// make order date + 1 if from shopify
		order_status: OrderStatus().notNull(),
		carrier: varchar('', { length: 100 }),
		service_level: varchar('', { length: 50 }),
		del_address_1: varchar('', { length: 255 }),
		del_address_2: varchar('', { length: 255 }),
		del_address_3: varchar('', { length: 255 }),
	},
	(t) => [unique().on(t.source_order_id, t.order_source)]
);

export const OrderLines = pgTable(
	'order_lines',
	{
		order_line_id: serial().primaryKey(),
		order_id: integer()
			.notNull()
			.references(() => Orders.order_id, { onDelete: 'cascade' }),
		order_line_source: OrderSource().notNull(),
		source_line_id: varchar('', { length: 50 }).notNull(),
		// possible barcode

		source_product_id: varchar('', { length: 50 }),
		quantity: integer().notNull(),
		line_price: numeric('', { precision: 10, scale: 2 }).notNull(),
		currency: varchar('', { length: 6 }).notNull(),
	},
	(table) => [
		check('quantity_check', sql`${table.quantity} > 0`),
		check('price_check', sql`${table.line_price} >= 0`),
		unique().on(table.source_line_id, table.order_line_source),
	]
);

export const Vehicles = pgTable('vehicles', {
	vehicle_id: serial().primaryKey(),
	reg: text().unique(),
	make: text(),
	vehicle_type: text(),
	home_depot: integer()
		.notNull()
		.references(() => Depots.depot_id, { onDelete: 'cascade' }),
});

export const Drivers = pgTable('drivers', {
	driver_id: serial().primaryKey(),
	first_name: text(),
	last_name: text(),
	email: text().unique().notNull(),
	phone: text().unique(),
});

export const Deliveries = pgTable('deliveries', {
	delivery_id: serial().primaryKey(),
	driver_id: integer()
		.notNull()
		.references(() => Drivers.driver_id, { onDelete: 'cascade' }),
	vehicle_id: integer()
		.notNull()
		.references(() => Vehicles.vehicle_id, { onDelete: 'cascade' }),
	starting_depot: integer()
		.notNull()
		.references(() => Depots.depot_id, { onDelete: 'cascade' }),
	date: date().notNull(),
});

// route no = depot id + date + reg + count
export const DeliveryConnection = pgTable('delivery_connections', {
	delivery_connection_id: serial().primaryKey(),
	delivery_id: integer()
		.notNull()
		.references(() => Deliveries.delivery_id, { onDelete: 'cascade' }),
	order_id: integer()
		.notNull()
		.references(() => Orders.order_id, { onDelete: 'cascade' }),
});

export const Depots = pgTable('depots', {
	depot_id: serial().primaryKey(),
	address: text().notNull(),
	longitude: real().notNull(),
	latitude: real().notNull(),
});
