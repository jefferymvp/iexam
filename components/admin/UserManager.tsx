'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FiCheck, FiX } from 'react-icons/fi'

export default function UserManager() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const supabase = createClient()

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        setLoading(true)
        // NOTE: supabase.auth.admin requires service role key, which should only be used on the server.
        // For a safe client-side approach, we fetch `profiles` which has RLS.
        // Assuming admin has permission to read/update all profiles.
        const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
        if (data) setUsers(data)
        setLoading(false)
    }

    const toggleStatus = async (user: any) => {
        // Implement standard toggle if your user profile has an active column
        // Since original just implies role flip, we'll demonstrate a role flip or similar.
        const newRole = user.role === 'admin' ? 'user' : 'admin'
        await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)
        fetchUsers()
    }

    if (loading) return <div className="text-center py-10">加载中...</div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">系统用户列表</h2>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色 (Role)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最后登录范围</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map((u) => (
                            <tr key={u.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-mono text-xs">
                                    {u.id.substring(0, 8)}...
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(u.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => toggleStatus(u)}
                                        className="text-blue-600 hover:text-blue-900 flex items-center"
                                    >
                                        切换至 {u.role === 'admin' ? '普通用户' : '管理员'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-gray-500">没有数据</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
