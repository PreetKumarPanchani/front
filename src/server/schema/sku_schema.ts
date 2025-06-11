import {
	integer,
	numeric,
	pgEnum,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp,
	varchar,
} from 'drizzle-orm/pg-core';
import { OrderStatus } from './legacy_schema';
import { sql } from 'drizzle-orm';

export const PickStatus = pgEnum('pick_status', OrderStatus.enumValues);

export const SkuTable = pgTable('sku_table', {
	sku_number: varchar('', { length: 50 }).primaryKey(),
	product_description: text(),
	height_cm: numeric('', { precision: 10, scale: 2 }),
	width_cm: numeric('', { precision: 10, scale: 2 }),
	depth_cm: numeric('', { precision: 10, scale: 2 }),
	weight_kg: numeric('', { precision: 10, scale: 2 }),
	barcode: varchar('', { length: 50 }).unique(),
});

export const WarehouseMap = pgTable('warehouse_map', {
	id: serial().primaryKey(),
	sku: varchar('', { length: 50 }).references(() => SkuTable.sku_number),
	location: varchar('', { length: 50 }).notNull(),
	x_coordinate: numeric('', { precision: 10, scale: 2 }),
	y_coordinate: numeric('', { precision: 10, scale: 2 }),
	z_coordinate: numeric('', { precision: 10, scale: 2 }),
	area: varchar('', { length: 50 }),
	zone: varchar('', { length: 50 }),
});

export const PickTable = pgTable('pick_table', {
	pick_instruction_number: serial().primaryKey(),
	sku: varchar('', { length: 50 })
		.notNull()
		.references(() => SkuTable.sku_number),
	order_number: varchar('', { length: 50 }),
	source_line_id: varchar('', { length: 50 }).notNull().unique(),
	order_line_number: integer(),
	quantity_to_pick: integer(),
	location_to_pick: varchar('', { length: 50 }).notNull(),
	quantity_picked: integer().default(0),
	marshalling_area: varchar('', { length: 100 }).notNull(),
	from_address: varchar('', { length: 255 }),
	to_address: varchar('', { length: 255 }),
	delivery_latitude: numeric('', { precision: 10, scale: 6 }),
	delivery_longitude: numeric('', { precision: 10, scale: 6 }),
	courier_service: varchar('', { length: 50 }),
	status: PickStatus().default('NOT_STARTED'),
});

export const BoxTypes = pgTable('box_types', {
	name: varchar('', { length: 50 }).primaryKey(),
	width_cm: numeric('', { precision: 10, scale: 2 }).notNull(),
	height_cm: numeric('', { precision: 10, scale: 2 }).notNull(),
	depth_cm: numeric('', { precision: 10, scale: 2 }).notNull(),
	max_weight_kg: numeric('', { precision: 10, scale: 2 }).notNull(),
});

export const Boxes = pgTable('boxes', {
	box_id: varchar('', { length: 50 }).primaryKey(),
	box_type_name: varchar('', { length: 50 }).references(() => BoxTypes.name),
	order_number: varchar('', { length: 50 }).notNull(),
	status: varchar('', { length: 50 }).notNull().default('Active'),
	current_weight_kg: numeric('', { precision: 10, scale: 2 })
		.notNull()
		.default(sql`0`),
	current_volume_cm3: numeric('', { precision: 10, scale: 2 })
		.notNull()
		.default(sql`0`),
	created_date: timestamp().notNull().defaultNow(),
});

export const BoxItems = pgTable(
	'box_items',
	{
		box_id: varchar('', { length: 50 }).references(() => Boxes.box_id),
		pick_instruction_number: integer().references(() => PickTable.pick_instruction_number),
		quantity: integer().notNull(),
		weight_kg: numeric('', { precision: 10, scale: 2 }).notNull(),
		volume_cm3: numeric('', { precision: 10, scale: 2 }).notNull(),
		added_date: timestamp().notNull(),
	},
	(table) => [primaryKey({ columns: [table.box_id, table.pick_instruction_number] })]
);
