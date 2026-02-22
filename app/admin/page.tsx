import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminTabs from '@/components/admin/AdminTabs'
import { FiShield } from 'react-icons/fi'
import Link from 'next/link'

export default async function AdminPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check admin role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return (
            <div className="max-w-2xl mx-auto text-center py-20">
                <FiShield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">访问被拒绝</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">您需要管理员权限才能访问此页面。</p>
                <Link href="/" className="text-blue-600 hover:text-blue-500 font-medium">返回首页</Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-2xl p-6 sm:p-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center mb-2">
                    <FiShield className="text-amber-500 mr-2" /> 管理员控制台
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    在此统一管理组织架构、系统用户和题库资源。
                </p>
            </div>

            <AdminTabs />
        </div>
    )
}
