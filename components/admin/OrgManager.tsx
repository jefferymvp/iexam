'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSettings } from 'react-icons/fi'
import OrgConfigModal from './OrgConfigModal'

export default function OrgManager() {
    const [orgs, setOrgs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState({ name: '', allow_join: false })
    const [configOrg, setConfigOrg] = useState<any | null>(null)

    const supabase = createClient()

    useEffect(() => {
        fetchOrgs()
    }, [])

    const fetchOrgs = async () => {
        setLoading(true)
        const { data } = await supabase.from('organizations').select('*').order('created_at', { ascending: false })
        if (data) setOrgs(data)
        setLoading(false)
    }

    const handleEdit = (org: any) => {
        setEditingId(org.id)
        setEditForm({ name: org.name, allow_join: org.allow_join })
    }

    const handleSave = async (id: string) => {
        await supabase.from('organizations').update(editForm).eq('id', id)
        setEditingId(null)
        fetchOrgs()
    }

    const handleDelete = async (id: string) => {
        if (confirm('确认删除该组织吗？此操作将级联删除相关数据。')) {
            await supabase.from('organizations').delete().eq('id', id)
            fetchOrgs()
        }
    }

    const handleCreate = async () => {
        const name = prompt('请输入新组织名称：')
        if (name) {
            await supabase.from('organizations').insert({ name, allow_join: true })
            fetchOrgs()
        }
    }

    if (loading) return <div className="text-center py-10">加载中...</div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">系统组织架构</h2>
                <button
                    onClick={handleCreate}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <FiPlus className="mr-2" /> 新增组织
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">组织名称</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">是否允许加入</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {orgs.map((org) => (
                            <tr key={org.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                    {editingId === org.id ? (
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            className="border rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600"
                                        />
                                    ) : org.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {editingId === org.id ? (
                                        <input
                                            type="checkbox"
                                            checked={editForm.allow_join}
                                            onChange={(e) => setEditForm({ ...editForm, allow_join: e.target.checked })}
                                            className="h-4 w-4 text-blue-600 rounded"
                                        />
                                    ) : (
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${org.allow_join ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                            {org.allow_join ? '允许' : '受限'}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    {editingId === org.id ? (
                                        <div className="flex space-x-3">
                                            <button onClick={() => handleSave(org.id)} className="text-green-600 hover:text-green-900"><FiSave /></button>
                                            <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700"><FiX /></button>
                                        </div>
                                    ) : (
                                        <div className="flex space-x-3">
                                            <button onClick={() => setConfigOrg(org)} title="配置组织 (成员/题库)" className="text-indigo-600 hover:text-indigo-900"><FiSettings /></button>
                                            <button onClick={() => handleEdit(org)} className="text-blue-600 hover:text-blue-900"><FiEdit2 /></button>
                                            <button onClick={() => handleDelete(org.id)} className="text-red-600 hover:text-red-900"><FiTrash2 /></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {orgs.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-6 py-10 text-center text-gray-500">没有数据</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {configOrg && (
                <OrgConfigModal org={configOrg} onClose={() => setConfigOrg(null)} />
            )}
        </div>
    )
}
