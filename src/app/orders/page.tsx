'use client';

import React, { useState } from 'react';
import { type OrderLine } from '../../server/types';
import DBTable from '../../components/DBTable';
import { OrderFilter } from './OrderFilter';
import Button from '@/components/Button';
import { trpcClient } from '../_trpc/client';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/router';
import { formDataToStringObject } from '@/lib/handleFormData';

function downloadFileFromUrl(url: string, fileName: string) {
	const a = document.createElement('a');
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

function saveFileContent(content: string, fileName: string) {
	const file = new Blob([content], { type: 'text/csv' });
	const url = window.URL.createObjectURL(file);
	downloadFileFromUrl(url, fileName);
	window.URL.revokeObjectURL(url);
}

const CSV_SEPARATOR = ',';
const CSV_NL = '\n';
// could be configured on windows perhaps, but is that even necessary
function escapeCSV(value: string): string {
	const matcher = /[,"]/;
	// comma or speech marks means needs to be escaped
	if (!matcher.test(value)) {
		return value;
	}

	return `"${value.replaceAll(/(")/g, '$1$1')}"`;
}
// slight bug: exporting to csv then going to excel doesn't work because excel
// converts large numbers to scientfic notation. This is entirely Excel's fault
// but still affects the frontend

type Coercible = { toString: () => string };
const escaper = (value: Coercible | null) => escapeCSV(value?.toString() || 'NULL');

function OrderTables({ orders, orderLines }: { orders: Order[]; orderLines: OrderLine[] }) {
	if (orders.length === 0) {
		return <p>No orders match criteria.</p>;
	}
	if (orderLines.length === 0) {
		return <DBTable content={orders} />;
	}

	const ordersSplit: [Order, OrderLine[]][] = [];
	for (const order of orders) {
		const lines = orderLines.filter((line) => line.order_id === order.order_id);
		ordersSplit.push([order, lines]);
	}

	function exportOrderLines(orderLines: OrderLine[]) {
		const data = [
			Object.keys(orderLines[0]).map(escaper).join(CSV_SEPARATOR),
			...orderLines.map((line) => Object.values(line).map(escaper).join(CSV_SEPARATOR)),
		];
		saveFileContent(data.join(CSV_NL), 'orderLines.csv');
	}

	const [showLines, setShowLines] = useState<boolean[]>(Array(ordersSplit.length).fill(false));

	const toggleShowLines = (index: number) => {
		setShowLines((prev) => {
			const newState = [...prev];
			newState[index] = !newState[index];
			return newState;
		});
	};
	// I genuinely copied and pasted this funtion from ChatGPT because this is so
	// un-ergonomic to use, thanks React very cool

	const elem = ordersSplit.map((split, i) => {
		const lineAmt = split[1].length;
		const hasLines = lineAmt > 0;
		const toggleMsg = `Toggle ${lineAmt} line` + (lineAmt === 1 ? '' : 's');

		return (
			<div className="single-order" style={{ margin: '1em 0', overflow: 'auto' }} key={i}>
				<hr />
				<h3>Order #{split[0].order_id}</h3>
				<DBTable content={[split[0]]} />
				<br />
				{hasLines && (
					<>
						<Button onClick={() => exportOrderLines(split[1])}>Export lines</Button>
						<Button onClick={() => toggleShowLines(i)}>{toggleMsg}</Button>
						{showLines[i] && <DBTable content={split[1]} />}
					</>
				)}
			</div>
		);
	});
	return <>{elem}</>;
}

type Order = inferRouterOutputs<AppRouter>['orders']['getOrder'];
function Orders() {
	const [orders, setOrders] = useState<Order[]>([]);
	const [orderLines, setOrderLines] = useState<OrderLine[]>([]);

	async function submitOrders(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		// Convert form inputs into an object
		const formData = new FormData(event.currentTarget);
		const rawData = formDataToStringObject(formData, undefined);

		if (rawData.orderId) {
			const order = await trpcClient.orders.getOrder.query(+rawData.orderId);
			const orders = (order && [order]) || [];
			const orderLines = await trpcClient.order_lines.getOrderLinesByOrderIds.query(
				orders.map((order) => order.order_id)
			);

			setOrders(orders);
			setOrderLines(orderLines);
			return;
		}

		const params = {
			...rawData,
			// limit: rawParams.limit ? parseInt(rawParams.limit) : undefined,
			customerIds: rawData?.customerId
				? rawData.customerId.split(',').map((val) => parseInt(val))
				: undefined,
			carrier: rawData.courier || undefined,
		};

		const orders = await trpcClient.orders.getOrders.query(params);
		const orderLines = await trpcClient.order_lines.getOrderLinesByOrderIds.query(
			orders.map((order) => order.order_id)
		);
		setOrders(orders);
		setOrderLines(orderLines);
	}

	function exportOrderHeaders(_: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
		if (orders.length === 0) {
			return;
		}

		const data = [
			Object.keys(orders[0]).map(escaper).join(CSV_SEPARATOR),
			...orders.map((order) => Object.values(order).map(escaper).join(CSV_SEPARATOR)),
		];
		saveFileContent(data.join(CSV_NL), 'orderHeaders.csv');
	}

	return (
		<>
			<h2>Orders</h2>

			<OrderFilter handleSubmit={submitOrders} />

			{orders.length > 0 && (
				<div
					className="responsive-grid"
					style={{
						display: 'grid',
						padding: '1em 0',
						columnGap: '1em',
						...({ '--max-columns-full': 1 } as any as React.CSSProperties),
					}}
				>
					<Button onClick={exportOrderHeaders}>Export order headers</Button>
					{/* <Button>Export all</Button> */}
				</div>
			)}
			<OrderTables orders={orders} orderLines={orderLines} />
		</>
	);
}

export default Orders;
