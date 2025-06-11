import React from 'react';
import './Button.css';

/**
 * LQ-branded button element.
 * @param props
 * @returns
 */
export default function Button(props: React.JSX.IntrinsicElements['button']) {
	let className;
	if (props.className) {
		className = `${props.className} lq-button`;
	} else {
		className = 'lq-button';
	}
	return React.createElement('button', { ...props, className });
}
