import React from 'react';
import DBTable from '../components/DBTable';
import type { Customer, Order, OrderLine } from '../server/types';
import { serverClient } from './_trpc/serverClient';

async function BasePage() {
	const [orders, order_lines, customers] = await Promise.all([
		serverClient.orders.getOrders({}),
		serverClient.order_lines.getOrderLines(),
		serverClient.customers.getCustomers(),
	]);

	return (
		<>
			<h2>Base path</h2>
			<p>
				Just the database tables. See <a href="orders">orders</a> for orders table.
			</p>

			<h3>Orders</h3>
			<DBTable content={orders} />

			<h3>Order lines</h3>
			<DBTable content={order_lines} />

			<h3>Customers</h3>
			<DBTable content={customers} />
		</>
	);
}

export default BasePage;
