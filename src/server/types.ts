import {
	OrderSource,
	OrderStatus,
	type Customers,
	type OrderLines,
	type Orders,
} from './schema/legacy_schema';

export type Order = typeof Orders.$inferSelect;
export type OrderLine = typeof OrderLines.$inferSelect;
export type Customer = typeof Customers.$inferSelect;

export const orderSourceValues = OrderSource.enumValues;
export type OrderSource = (typeof orderSourceValues)[number];

export const orderStatusValues = OrderStatus.enumValues;
export type OrderStatus = (typeof orderStatusValues)[number];
