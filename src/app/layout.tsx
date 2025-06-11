import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import UserThemeProvider from './UserThemeProvider';
import TrpcProvider from './_trpc/TrpcProvider';
import './global.css';
import './layout.css';
import { cookies } from 'next/headers';

const SIDEBAR_COLLAPSE_COOKIE = 'is-sidebar-collapsed';
async function isSidebarCollapsed() {
	const store = await cookies();
	const collapsedCookie = store.get(SIDEBAR_COLLAPSE_COOKIE);
	const isCollapsed = collapsedCookie ? collapsedCookie.value : 'false';
	return isCollapsed === 'true';
}

function Providers({ children }: { children: React.ReactNode }) {
	return (
		<TrpcProvider>
			<UserThemeProvider>{children}</UserThemeProvider>
		</TrpcProvider>
	);
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
	const collapsedSidebar = await isSidebarCollapsed();
	// hydration suppressing might not be the best decision, see
	// https://youtu.be/ACfWFp9W07M?t=1667 or
	// https://github.com/pacocoursey/next-themes/issues/169#issuecomment-1733952011
	return (
		<>
			<html lang="en" suppressHydrationWarning>
				<head>
					<meta charSet="UTF-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1.0" />
					<meta name="apple-mobile-web-app-title" content="LiquidQube" />
					<link rel="icon" href="/favicon.ico" sizes="48x48" />
					<link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml" />
					<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
					<link rel="manifest" href="/site.webmanifest" />
					<title>LiquidQube</title>
				</head>
				<body>
					<Providers>
						<header>
							<Header sidebarCollapsed={collapsedSidebar} />
						</header>
						<main>
							<aside className={`sidebar ${collapsedSidebar ? 'is-collapsed' : ''}`}>
								<Sidebar />
							</aside>
							<div className="main">{children}</div>
						</main>
						<footer>
							<Footer />
						</footer>
					</Providers>
				</body>
			</html>
		</>
	);
}
