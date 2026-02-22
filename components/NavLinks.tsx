'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavLinks({ isAdmin }: { isAdmin: boolean }) {
    const pathname = usePathname()

    return (
        <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
            <Link
                href="/"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${pathname === '/' || pathname === '/exam'
                        ? 'border-blue-500 text-gray-900 dark:text-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-300 dark:hover:text-white'
                    }`}
            >
                首页/考试
            </Link>
            <Link
                href="/mistakes"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${pathname.startsWith('/mistakes')
                        ? 'border-blue-500 text-gray-900 dark:text-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-300 dark:hover:text-white'
                    }`}
            >
                错题本
            </Link>
            {isAdmin && (
                <Link
                    href="/admin"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${pathname.startsWith('/admin')
                            ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                            : 'border-transparent text-amber-600 hover:text-amber-700 hover:border-amber-300 dark:text-amber-400 dark:hover:text-amber-300'
                        }`}
                >
                    管理后台
                </Link>
            )}
        </div>
    )
}
