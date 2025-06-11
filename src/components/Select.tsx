import React from 'react';
import './Select.css';

/**
 * LQ-branded select element.
 * @param props
 * @returns
 */
export default function Select(props: React.JSX.IntrinsicElements['select']) {
	let className;
	if (props.className) {
		className = `${props.className} lq-select`;
	} else {
		className = 'lq-select';
	}
	return React.createElement('select', { ...props, className });
}
