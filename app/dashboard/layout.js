'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }) {
    const pathname = usePathname();
    const email = 'admin@gmail.com'; // Replace with actual user email logic
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
            name: 'Models',
            path: '/dashboard/models',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" fill="currentColor" />
                </svg>
            )
        },
        {
            name: 'Analytics',
            path: '/dashboard/analytics',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2 2H5V5h14v14zm0-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" fill="currentColor" />
                </svg>
            )
        },
        {
            name: 'Profile',
            path: '/dashboard/profile',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor" />
                </svg>
            )
        },
        {
            name: 'Settings',
            path: '/dashboard/settings',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 640 640" fill="white"><path d="M259.1 73.5C262.1 58.7 275.2 48 290.4 48L350.2 48C365.4 48 378.5 58.7 381.5 73.5L396 143.5C410.1 149.5 423.3 157.2 435.3 166.3L503.1 143.8C517.5 139 533.3 145 540.9 158.2L570.8 210C578.4 223.2 575.7 239.8 564.3 249.9L511 297.3C511.9 304.7 512.3 312.3 512.3 320C512.3 327.7 511.8 335.3 511 342.7L564.4 390.2C575.8 400.3 578.4 417 570.9 430.1L541 481.9C533.4 495 517.6 501.1 503.2 496.3L435.4 473.8C423.3 482.9 410.1 490.5 396.1 496.6L381.7 566.5C378.6 581.4 365.5 592 350.4 592L290.6 592C275.4 592 262.3 581.3 259.3 566.5L244.9 496.6C230.8 490.6 217.7 482.9 205.6 473.8L137.5 496.3C123.1 501.1 107.3 495.1 99.7 481.9L69.8 430.1C62.2 416.9 64.9 400.3 76.3 390.2L129.7 342.7C128.8 335.3 128.4 327.7 128.4 320C128.4 312.3 128.9 304.7 129.7 297.3L76.3 249.8C64.9 239.7 62.3 223 69.8 209.9L99.7 158.1C107.3 144.9 123.1 138.9 137.5 143.7L205.3 166.2C217.4 157.1 230.6 149.5 244.6 143.4L259.1 73.5zM320.3 400C364.5 399.8 400.2 363.9 400 319.7C399.8 275.5 363.9 239.8 319.7 240C275.5 240.2 239.8 276.1 240 320.3C240.2 364.5 276.1 400.2 320.3 400z"/></svg>
            )
        }
    ];

    return (
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
            {/* Sidebar - fixed height, no scroll */}
            <aside className="flex-shrink-0 flex flex-col items-start p-[35px_20px] w-[290px] h-screen overflow-y-auto" style={{ backgroundColor: 'var(--color-bg-card)', boxShadow: 'var(--shadow-sidebar)' }}>
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
                                                color: '#E5E7EB',
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

            {/* Main Content - scrollable */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden">
                {children}
            </main>
        </div>
    );
}