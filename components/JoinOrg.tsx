'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FiPlus, FiX } from 'react-icons/fi'

export default function JoinOrg() {
    const [isOpen, setIsOpen] = useState(false)
    const [availableOrgs, setAvailableOrgs] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        if (isOpen) {
            fetchAvailableOrgs()
        }
    }, [isOpen])

    const fetchAvailableOrgs = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setLoading(false)
            return
        }

        try {
            // 获取所有允许加入的组织
            const { data: orgs, error: orgErr } = await supabase
                .from('organizations')
                .select('*')
                .eq('allow_join', true)

            if (orgErr) throw orgErr

            // 获取用户已经加入的组织
            const { data: memberships, error: memErr } = await supabase
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', user.id)

            if (memErr) throw memErr

            const joinedOrgIds = memberships?.map((m: any) => m.organization_id) || []

            // 筛选出尚未加入的公开组织
            const unjoined = (orgs || []).filter((org: any) => !joinedOrgIds.includes(org.id))
            setAvailableOrgs(unjoined)
        } catch (err) {
            console.error("Fetch orgs error:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleJoin = async (orgId: string) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // RLS policy ensures user can only join where allow_join = true
        const { error } = await supabase
            .from('organization_members')
            .insert({
                user_id: user.id,
                organization_id: orgId
            })

        if (!error) {
            alert("加入成功！")
            setIsOpen(false)
            window.location.reload() // Refresh page to see the newly joined org
        } else {
            alert(`加入失败: ${error.message}`)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
            >
                <FiPlus className="mr-1" /> 加入新组织
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">发现组织</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-500 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {loading ? (
                                <div className="text-center py-10 text-gray-500">搜索中...</div>
                            ) : availableOrgs.length === 0 ? (
                                <div className="text-center py-10 text-gray-500 border-2 border-dashed border-gray-100 rounded-xl">
                                    暂无开放加入的组织
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {availableOrgs.map(org => (
                                        <div key={org.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex justify-between items-center hover:border-blue-300 transition-colors">
                                            <div>
                                                <h3 className="font-bold text-gray-900 dark:text-white">{org.name}</h3>
                                                <p className="text-sm text-gray-500 line-clamp-1">{org.description || '无描述'}</p>
                                            </div>
                                            <button
                                                onClick={() => handleJoin(org.id)}
                                                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shrink-0 ml-4"
                                            >
                                                加入
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
