import { useState } from 'react';
import Head from 'next/head';
import Sidebar from '../components/db_agent/Sidebar';
import ChatInterface from '../components/db_agent/ChatInterface';
import './db_agent/globals.css';

export default function AIAssistantPage() {
  const [activeSection, setActiveSection] = useState('DayseAI');
  
  return (
    <>
      <Head>
        <title>DayseAI - AI Database Assistant</title>
        <meta name="description" content="Voice-enabled AI database query assistant" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" />
        {/* Add missing Tailwind CSS */}
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
        {/* Add Inter font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        
        {/* Fix conflicts */}
        <style jsx global>{`
          /* Fix font */
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif !important;
          }
          
          /* Fix scrollbar to match main app */
          ::-webkit-scrollbar-thumb {
            background-color: var(--accent-primary) !important;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background-color: #f0d04c !important;
          }
          
          /* Add missing Tailwind overrides for dark theme */
          .bg-white { background-color: var(--bg-secondary) !important; }
          .bg-gray-50 { background-color: var(--bg-primary) !important; }
          .text-gray-900 { color: var(--text-primary) !important; }
          /* ... add more overrides as needed */
        `}</style>
      </Head>
      
      <div className="app-container">
        <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
        <main className="main-content">
          <ChatInterface />
        </main>
      </div>
    </>
  );
}