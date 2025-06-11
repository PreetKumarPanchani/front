import React from 'react';
import './Input.css';

/**
 * LQ-branded input element.
 * @param props
 * @returns
 */
export default function Input(props: React.JSX.IntrinsicElements['input']) {
	let className;
	if (props.className) {
		className = `${props.className} lq-input`;
	} else {
		className = 'lq-input';
	}
	return React.createElement('input', { ...props, className });
}
