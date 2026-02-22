import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FiBookOpen, FiList, FiLogOut, FiUser } from 'react-icons/fi'
import { logout } from '@/app/login/actions'

export default async function Navbar() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Fetch user profile to check if admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isAdmin = profile?.role === 'admin'

    return (
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link href="/" className="flex-shrink-0 flex items-center">
                            <FiBookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                            <span className="ml-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                                iExam
                            </span>
                        </Link>
                        <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                            <Link
                                href="/"
                                className="inline-flex items-center px-1 pt-1 border-b-2 border-blue-500 text-sm font-medium text-gray-900 dark:text-white"
                            >
                                首页/考试
                            </Link>
                            <Link
                                href="/mistakes"
                                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-300 dark:hover:text-white"
                            >
                                错题本
                            </Link>
                            {isAdmin && (
                                <Link
                                    href="/admin"
                                    className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-amber-600 hover:text-amber-700 hover:border-amber-300 dark:text-amber-400 dark:hover:text-amber-300"
                                >
                                    管理后台
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-500 dark:text-gray-300 hidden md:block">
                            {user.email}
                        </div>
                        <form action={logout}>
                            <button
                                type="submit"
                                className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                                title="退出登录"
                            >
                                <FiLogOut className="h-5 w-5" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </nav>
    )
}
