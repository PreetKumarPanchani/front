import React from 'react';
import './Form.css';

/**
 * LQ-branded Form element.
 * @param props
 * @returns
 */
export default function Form(props: React.JSX.IntrinsicElements['form']) {
	let className;
	if (props.className) {
		className = `${props.className} form-container`;
	} else {
		className = 'form-container';
	}
	return React.createElement('form', { ...props, className });
}
