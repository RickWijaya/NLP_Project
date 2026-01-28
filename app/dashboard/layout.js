'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }) {
    const pathname = usePathname();

    const menuItems = [
        {
            name: 'Dashboard',
            path: '/dashboard',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor" />
                </svg>
            )
        },
        {
            name: 'Chat',
            path: '/chat',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )
        },
        {
            name: 'Models',
            path: '/dashboard/models',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" fill="currentColor" />
                </svg>
            )
        }
    ];

    return (
        <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
            {/* Sidebar */}
            <aside className="flex flex-col items-start p-[35px_20px] w-[290px] min-h-screen sticky top-0" style={{ backgroundColor: 'var(--color-bg-card)', boxShadow: 'var(--shadow-sidebar)' }}>
                <div className="flex flex-col items-start w-full gap-10">
                    {/* Logo */}
                    <div className="w-full flex items-center pl-[5px]">
                        <div className="flex flex-row items-center">
                            <Image
                                src="/kathy-avatar.png"
                                alt="Kathy AI"
                                width={50}
                                height={50}
                                className="object-contain rounded-full flex-shrink-0"
                            />
                            <Image
                                src="/kathy-text.png"
                                alt="Kathy AI"
                                width={120}
                                height={40}
                                className="object-contain -ml-8"
                            />
                        </div>
                    </div>

                    {/* Menu */}
                    <nav className="flex flex-col items-start w-full gap-5">
                        <p className="text-[16px] leading-6 text-[#B3B3B3] m-0 pl-[10px]" style={{ fontFamily: 'var(--font-family-poppins)' }}>Menu</p>
                        <ul className="list-none p-0 m-0 flex flex-col gap-[15px] w-full">
                            {menuItems.map((item) => {
                                const isActive = pathname === item.path;
                                return (
                                    <li key={item.path}>
                                        <Link
                                            href={item.path}
                                            className="flex flex-row items-center p-[10px_15px] gap-3 w-full h-11 rounded-[20px] no-underline transition-all duration-300"
                                            style={{
                                                backgroundColor: isActive ? 'var(--color-button-primary)' : 'transparent',
                                                color: isActive ? '#FFFFFF' : '#E5E7EB',
                                                fontFamily: 'var(--font-family-poppins)'
                                            }}
                                        >
                                            <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                                                {item.icon}
                                            </span>
                                            <span className="font-normal text-[16px] leading-6 whitespace-nowrap">
                                                {item.name}
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col w-full overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
