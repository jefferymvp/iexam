'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FiX, FiUsers, FiDatabase, FiCheck, FiTrash2, FiPlus } from 'react-icons/fi'

interface OrgConfigModalProps {
    org: any
    onClose: () => void
}

export default function OrgConfigModal({ org, onClose }: OrgConfigModalProps) {
    const [activeTab, setActiveTab] = useState<'users' | 'banks'>('users')
    const [loading, setLoading] = useState(true)

    // Data for users tab
    const [allUsers, setAllUsers] = useState<any[]>([])
    const [orgMembers, setOrgMembers] = useState<Set<string>>(new Set())

    // Data for banks tab
    const [allBanks, setAllBanks] = useState<any[]>([])
    const [orgBanks, setOrgBanks] = useState<Set<string>>(new Set())

    const supabase = createClient()

    useEffect(() => {
        fetchData()
    }, [org.id, activeTab])

    const fetchData = async () => {
        setLoading(true)
        if (activeTab === 'users') {
            // Fetch all users
            const { data: usersData } = await supabase.from('profiles').select('id, username, role')
            if (usersData) setAllUsers(usersData)

            // Fetch current org members
            const { data: membersData } = await supabase
                .from('organization_members')
                .select('user_id')
                .eq('organization_id', org.id)

            setOrgMembers(new Set(membersData?.map(m => m.user_id) || []))
        } else {
            // Fetch all banks
            const { data: banksData } = await supabase.from('question_banks').select('id, name')
            if (banksData) setAllBanks(banksData)

            // Fetch current org banks
            const { data: orgBanksData } = await supabase
                .from('organization_banks')
                .select('bank_id')
                .eq('organization_id', org.id)

            setOrgBanks(new Set(orgBanksData?.map(b => b.bank_id) || []))
        }
        setLoading(false)
    }

    const toggleMember = async (userId: string, isMember: boolean) => {
        if (isMember) {
            // Remove
            await supabase
                .from('organization_members')
                .delete()
                .eq('organization_id', org.id)
                .eq('user_id', userId)

            const newSet = new Set(orgMembers)
            newSet.delete(userId)
            setOrgMembers(newSet)
        } else {
            // Add
            await supabase
                .from('organization_members')
                .insert({ organization_id: org.id, user_id: userId })

            const newSet = new Set(orgMembers)
            newSet.add(userId)
            setOrgMembers(newSet)
        }
    }

    const toggleBank = async (bankId: string, hasBank: boolean) => {
        if (hasBank) {
            // Remove
            await supabase
                .from('organization_banks')
                .delete()
                .eq('organization_id', org.id)
                .eq('bank_id', bankId)

            const newSet = new Set(orgBanks)
            newSet.delete(bankId)
            setOrgBanks(newSet)
        } else {
            // Add
            await supabase
                .from('organization_banks')
                .insert({ organization_id: org.id, bank_id: bankId })

            const newSet = new Set(orgBanks)
            newSet.add(bankId)
            setOrgBanks(newSet)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                            配置组织：{org.name}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"
                    >
                        <FiX />
                    </button>
                </div>

                <div className="flex border-b border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center transition-colors ${activeTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <FiUsers className="mr-2" /> 成员管理
                    </button>
                    <button
                        onClick={() => setActiveTab('banks')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center transition-colors ${activeTab === 'banks' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <FiDatabase className="mr-2" /> 题库分配
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="text-center py-10 text-gray-500">数据加载中...</div>
                    ) : (
                        <>
                            {activeTab === 'users' ? (
                                <div className="space-y-2">
                                    {allUsers.length === 0 ? (
                                        <div className="text-center text-gray-500 py-4">系统暂无用户</div>
                                    ) : (
                                        allUsers.map(user => {
                                            const isMember = orgMembers.has(user.id)
                                            return (
                                                <div key={user.id} className="flex justify-between items-center p-3 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                                    <div>
                                                        <span className="font-medium text-gray-900 dark:text-white">{user.username || '未命名用户'}</span>
                                                        <span className="ml-2 text-xs text-gray-500">{(user.role === 'admin' ? '管理员' : '普通用户')}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => toggleMember(user.id, isMember)}
                                                        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors ${isMember
                                                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                                            : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                                                            }`}
                                                    >
                                                        {isMember ? <><FiTrash2 className="mr-1" /> 移出</> : <><FiPlus className="mr-1" /> 加入</>}
                                                    </button>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {allBanks.length === 0 ? (
                                        <div className="text-center text-gray-500 py-4">系统暂无题库</div>
                                    ) : (
                                        allBanks.map(bank => {
                                            const hasBank = orgBanks.has(bank.id)
                                            return (
                                                <div key={bank.id} className="flex justify-between items-center p-3 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                                    <div>
                                                        <span className="font-medium text-gray-900 dark:text-white">{bank.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => toggleBank(bank.id, hasBank)}
                                                        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors ${hasBank
                                                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                                            : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                                                            }`}
                                                    >
                                                        {hasBank ? <><FiTrash2 className="mr-1" /> 取消授权</> : <><FiPlus className="mr-1" /> 授权题库</>}
                                                    </button>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
