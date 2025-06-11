'use client';

import React, { type FormEventHandler } from 'react';
import { orderSourceValues, orderStatusValues } from '../../server/types';
import './OrderFilter.css';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Form from './Form';

export type BaseFormItem = {
	id: string;
	label: string;
};

type FormSelectItemOptions = string[] | { value: any; display: string }[];

function getFormSelectItemOptions(values: FormSelectItemOptions): React.JSX.Element {
	if (values.length === 0) {
		return <></>;
	}

	// @ts-ignore
	if (values?.[0]?.display ?? false) {
		// why does typescript SUCK
		values = values as { value: any; display: string }[];

		const options = (
			<>
				<option></option>
				{values.map(({ value: v, display: d }, i) => (
					<option key={i} value={v}>
						{d}
					</option>
				))}
			</>
		);

		return options;
	}

	values = values as string[];
	const options = (
		<>
			<option></option>
			{values.map((v, i) => (
				<option key={i} value={v}>
					{v}
				</option>
			))}
		</>
	);

	return options;
}

export function FormSelectItem(props: BaseFormItem & { values: FormSelectItemOptions }) {
	const { id, label, values } = props;
	const htmlId = id;

	const options = getFormSelectItemOptions(values);

	return (
		<div className="filter-item-select">
			<label htmlFor={htmlId}>{label}</label>

			<Select id={htmlId} name={id}>
				{options}
			</Select>
		</div>
	);
}

export function FormItem(
	props: BaseFormItem & {
		placeholder?: string;
		type?: React.HTMLInputTypeAttribute;
	}
) {
	const { id, label, type, placeholder } = props;
	const htmlId = id;
	return (
		<div className="filter-item">
			<label htmlFor={htmlId}>{label}</label>
			<Input type={type} id={htmlId} name={id} placeholder={placeholder ?? label} />
		</div>
	);
}

export function OrderFilter(props: { handleSubmit: FormEventHandler<HTMLFormElement> }) {
	const { handleSubmit } = props;
	return (
		<Form className="order-form" onSubmit={handleSubmit}>
			<div className="order-form-params responsive-grid">
				<FormItem id="orderId" label="Order number" placeholder="Order ID" />
				<FormItem id="customerId" label="Customer ID" />
				<FormSelectItem id="source" label="Order source" values={orderSourceValues} />
				<FormItem id="courier" label="Courier" />
				<FormItem id="serviceLevel" label="Service Level" />
				<FormSelectItem id="status" label="Order Status" values={orderStatusValues} />
			</div>
			<Button type="submit">Submit</Button>
		</Form>
	);
}
