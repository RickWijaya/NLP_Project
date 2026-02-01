'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function DashboardTemplate({ children }) {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Reset and trigger animation on route change
        setIsVisible(false);
        const timer = setTimeout(() => setIsVisible(true), 30);
        return () => clearTimeout(timer);
    }, [pathname]);

    return (
        <div
            className={`w-full h-full transition-all duration-300 ease-out ${isVisible
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 translate-x-3'
                }`}
        >
            {children}
        </div>
    );
}
