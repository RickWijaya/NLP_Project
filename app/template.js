'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Template({ children }) {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Reset and trigger animation on route change
        setIsVisible(false);
        const timer = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(timer);
    }, [pathname]);

    return (
        <div
            className={`w-full transition-all duration-300 ease-out ${isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-2'
                }`}
            style={{
                minHeight: '100vh',
                maxWidth: '100vw',
                overflowX: 'hidden'
            }}
        >
            {children}
        </div>
    );
}
