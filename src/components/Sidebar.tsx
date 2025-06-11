'use client';

import Link from 'next/link';
import React from 'react';
import './Sidebar.css';
import { usePathname } from 'next/navigation';

function SidebarLink(props: { href: string; text: string }) {
	const { href, text } = props;
	const pathName = usePathname();

	let className = 'sidebar-link';
	if (href === pathName) {
		className += ' is-current-page';
	}

	return (
		<div className={className}>
			<Link href={href}>{text}</Link>
		</div>
	);
}

export default function Sidebar() {
	// perhaps this could be replaced by something like shadcn
	return (
		<div className="sidebar-links">
			<SidebarLink href="/" text="Base page" />
			<SidebarLink href="/orders" text="Orders" />
			<SidebarLink href="/deliveries" text="Deliveries" />
			<SidebarLink href="/admin" text="Admin" />
		</div>
	);
}
