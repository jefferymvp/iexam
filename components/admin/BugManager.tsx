'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FiCheckCircle, FiClock, FiAlertCircle, FiMessageSquare, FiExternalLink, FiSearch, FiRefreshCw } from 'react-icons/fi'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Bug {
    id: string
    user_id: string
    question_id: string
    content: string
    status: 'open' | 'closed'
    created_at: string
    closed_at: string | null
    profiles: {
        username: string
        email: string
    }
    questions: {
        title: string
        type: string
        options: any
        answer: any
        parse: string
    }
}

export default function BugManager() {
    const [bugs, setBugs] = useState<Bug[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('open')
    const [selectedBug, setSelectedBug] = useState<Bug | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    const supabase = createClient()

    const fetchBugs = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('bugs')
                .select(`
                    *,
                    profiles (username, email),
                    questions (title, type, options, answer, parse)
                `)
                .order('created_at', { ascending: false })

            if (filter === 'open') {
                query = query.eq('status', 'open')
            } else if (filter === 'closed') {
                query = query.eq('status', 'closed')
            }

            const { data, error } = await query

            if (error) throw error
            setBugs(data || [])
        } catch (err: any) {
            console.error('Error fetching bugs:', err?.message || err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBugs()
    }, [filter])

    const handleCloseBug = async (id: string) => {
        try {
            const { error } = await supabase
                .from('bugs')
                .update({ 
                    status: 'closed',
                    closed_at: new Date().toISOString()
                })
                .eq('id', id)

            if (error) throw error
            
            // Update local state instead of full refresh
            setBugs(bugs.map(b => b.id === id ? { ...b, status: 'closed' as const, closed_at: new Date().toISOString() } : b))
            if (selectedBug?.id === id) {
                setSelectedBug({ ...selectedBug, status: 'closed', closed_at: new Date().toISOString() })
            }
        } catch (err) {
            console.error('Error closing bug:', err)
        }
    }

    const filteredBugs = bugs.filter(bug => 
        bug.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bug.questions?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bug.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl">
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setFilter('open')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'open' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        待处理
                    </button>
                    <button
                        onClick={() => setFilter('closed')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'closed' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        已关闭
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'all' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        全部
                    </button>
                </div>

                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="搜索反馈内容、题目或用户..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>

                <button 
                    onClick={fetchBugs}
                    className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 hover:text-blue-500 transition-colors"
                >
                    <FiRefreshCw className={`${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* List */}
                <div className="lg:col-span-5 space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-20 text-gray-400">加载中...</div>
                    ) : filteredBugs.length === 0 ? (
                        <div className="text-center py-20 text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                           <FiMessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                           <p>暂无反馈记录</p>
                        </div>
                    ) : (
                        filteredBugs.map(bug => (
                            <div
                                key={bug.id}
                                onClick={() => setSelectedBug(bug)}
                                className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                                    selectedBug?.id === bug.id 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' 
                                    : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                                }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                        bug.status === 'open' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {bug.status === 'open' ? '待处理' : '已关闭'}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                        {new Date(bug.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
                                    {bug.content}
                                </p>
                                <div className="flex items-center text-[11px] text-gray-500">
                                    <FiAlertCircle className="mr-1" />
                                    <span className="truncate">题目: {bug.questions?.title || '未知题目'}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Detail View */}
                <div className="lg:col-span-7 bg-gray-50 dark:bg-gray-900/40 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    {selectedBug ? (
                        <div className="h-full flex flex-col">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                        反馈详情
                                    </h4>
                                    {selectedBug.status === 'open' && (
                                        <button
                                            onClick={() => handleCloseBug(selectedBug.id)}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center"
                                        >
                                            <FiCheckCircle className="mr-2" /> 标记为已解决并关闭
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl">
                                        <div className="text-gray-400 mb-1">上报用户</div>
                                        <div className="font-bold text-gray-900 dark:text-white truncate">
                                            {selectedBug.profiles?.username || '匿名用户'}
                                        </div>
                                        <div className="text-gray-500 text-[10px] truncate">{selectedBug.profiles?.email}</div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl">
                                        <div className="text-gray-400 mb-1">上报时间</div>
                                        <div className="font-bold text-gray-900 dark:text-white">
                                            {new Date(selectedBug.created_at).toLocaleString()}
                                        </div>
                                        {selectedBug.closed_at && (
                                            <div className="text-green-500 text-[10px]">已于 {new Date(selectedBug.closed_at).toLocaleDateString()} 关闭</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <section>
                                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">反馈内容</h5>
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                                        {selectedBug.content}
                                    </div>
                                </section>

                                <section>
                                    <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">涉及题目内容</h5>
                                        <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                                            ID: {selectedBug.question_id.split('-')[0]}...
                                        </span>
                                    </div>
                                    <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <div className="text-sm font-bold text-gray-900 dark:text-white mb-4 leading-relaxed">
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ node, ...props }: any) => <p style={{ whiteSpace: 'pre-wrap', marginTop: 0, marginBottom: '0.25rem' }} {...props} />
                                                }}
                                            >
                                                {selectedBug.questions?.title}
                                            </ReactMarkdown>
                                        </div>
                                        
                                        {/* Simplified option rendering */}
                                        <div className="space-y-2 opacity-70">
                                            <div className="text-[10px] text-gray-400 border-t pt-2 mt-2">
                                                <p>正确答案: {JSON.stringify(selectedBug.questions?.answer)}</p>
                                                <p className="mt-1">解析: {selectedBug.questions?.parse?.substring(0, 100)}...</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-10 text-center">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <FiMessageSquare className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="font-medium">请从左侧列表中选择一条反馈以查看详情</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
