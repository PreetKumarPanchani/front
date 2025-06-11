import React from 'react';
import './DBTable.css';

type DBTableControl = { type: string; children: (ctx: any) => React.ReactElement };
interface Props<T> {
	content: T[];
	controls?: DBTableControl[];
}

function DBTableContent<T extends Object>({ content, controls }: Props<T>) {
	if (!content || content.length === 0) return null;

	const keys = Object.keys(content?.[0] ?? []);

	const rowControls = controls?.map((ctrl) => {
		return function (ctx: any) {
			return (
				<td key={ctrl.type} style={{ border: 'none' }}>
					{ctrl.children(ctx)}
				</td>
			);
		};
	});

	return (
		<table className="db-table">
			<thead>
				<tr>
					{keys.map((field) => (
						<th key={field}>{field}</th>
					))}
				</tr>
			</thead>
			<tbody>
				{content.map((record, index) => (
					<tr key={index}>
						{keys
							.map((k) => record[k as any as keyof T])
							.map((v, i) => (
								<td key={i}>{(v && v.toString()) ?? 'NULL'}</td>
							))}
						{rowControls?.map((fn) => fn(record))}
					</tr>
				))}
			</tbody>
		</table>
	);
}

function DBTable<T extends Object>(props: Props<T>) {
	if (props.content.length <= 0) {
		return <></>;
	}

	return (
		<div className="db-table-wrapper">
			<DBTableContent {...props} />
		</div>
	);
}

export default DBTable;
