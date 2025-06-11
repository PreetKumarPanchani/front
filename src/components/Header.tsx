'use client';

import Image from 'next/image';
import './Header.css';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import React from 'react';
import Button from '@/components/Button';
import Select from '@/components/Select';

function ThemeToggle() {
	const { theme, setTheme } = useTheme();

	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const placeholder = !mounted && <option></option>;
	// display blank when page initially loads without causing a layout shift

	return (
		<>
			<label htmlFor="theme-pref">Theme:</label>
			<Select id="theme-pref" value={theme} onChange={(e) => setTheme(e.target.value)}>
				{placeholder}
				<option value="system">System</option>
				<option value="dark">Dark</option>
				<option value="light">Light</option>
			</Select>
		</>
	);
}

const SIDEBAR_COLLAPSE_COOKIE = 'is-sidebar-collapsed';
export default function Header({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
	function handleCollapse(value: boolean) {
		document.cookie = `${SIDEBAR_COLLAPSE_COOKIE}=${value}`;
		const sidebar = document.querySelector('aside.sidebar') as HTMLElement;

		if (sidebar) {
			sidebar.style.setProperty('--sidebar-scroll-height', sidebar.scrollHeight + 'px');
			sidebar.classList.toggle('is-collapsed', value);
		}
		sidebarCollapsed = value;
		// if you can figure out a better way of doing this than manually setting
		// cookies and updating the DOM be my guest
	}

	useEffect(() => {
		handleCollapse(sidebarCollapsed);
	}, []);
	// So the first animation is also smooth

	return (
		<div className="header">
			<nav className="responsive-grid" style={{ '--max-columns-med': 3 } as any}>
				<div className="header-logo">
					<a href="/">
						<Image
							priority={true}
							src="/lq-full-logo.png"
							alt="LiquidQube"
							width="200"
							height="35"
						/>
						{/* this would probably be better off as an svg, would help
						with both styling and removing the initial flash */}
					</a>
				</div>
				<div className="search"></div>
				<div className="user-controls">
					<ThemeToggle />
					<Button onClick={() => handleCollapse(!sidebarCollapsed)}>Toggle Sidebar</Button>
				</div>
			</nav>
		</div>
	);
}
