'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FiPlayCircle, FiUsers, FiAward, FiBook, FiList, FiSettings } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import JoinOrg from '@/components/JoinOrg'

export default function HomeClient({ user, initialOrgs }: { user: any, initialOrgs: any[] }) {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [myOrgs, setMyOrgs] = useState<any[]>(initialOrgs)
    const [currentOrgId, setCurrentOrgId] = useState<string>('')

    // Config state
    const [banks, setBanks] = useState<any[]>([])
    const [selectedBankId, setSelectedBankId] = useState<string>('')

    const [types] = useState([
        { label: '所有题型', value: 'all' },
        { label: '单选题', value: 'single' },
        { label: '多选题', value: 'multi' },
        { label: '判断题', value: 'judge' }
    ])
    const [selectedType, setSelectedType] = useState('all')

    const [modes] = useState([
        { label: '显示答案 (练习模式)', value: 'show' },
        { label: '屏蔽答案 (考试模式)', value: 'hide' }
    ])
    const [selectedMode, setSelectedMode] = useState('show')

    const [questionCount, setQuestionCount] = useState(10)
    const [maxQuestions, setMaxQuestions] = useState(0)

    // Init
    useEffect(() => {
        if (myOrgs.length > 0 && !currentOrgId) {
            handleOrgSwitch(myOrgs[0].id)
        }
    }, [myOrgs])

    // Fetch Banks when Org changes
    const handleOrgSwitch = async (orgId: string) => {
        setCurrentOrgId(orgId)
        setLoading(true)

        // Fetch active banks for this org
        const { data } = await supabase
            .from('organization_banks')
            .select('bank_id, question_banks!inner(id, name, is_active)')
            .eq('organization_id', orgId)
            .eq('question_banks.is_active', true)

        const formattedBanks: any[] = data?.map(item => item.question_banks) || []
        setBanks(formattedBanks)

        if (formattedBanks.length > 0) {
            setSelectedBankId(formattedBanks[0].id)
        } else {
            setSelectedBankId('')
            setMaxQuestions(0)
            setQuestionCount(0)
        }
        setLoading(false)
    }

    // Effect for updating max questions when bank or type changes
    useEffect(() => {
        const updateMax = async () => {
            if (!selectedBankId) return

            let query = supabase.from('questions').select('*', { count: 'exact', head: true }).eq('bank_id', selectedBankId)

            if (selectedType !== 'all') {
                query = query.eq('type', selectedType)
            }

            const { count } = await query
            const validCount = count || 0
            setMaxQuestions(validCount)

            if (validCount > 0) {
                setQuestionCount(Math.min(10, validCount))
            } else {
                setQuestionCount(0)
            }
        }

        updateMax()
    }, [selectedBankId, selectedType])


    const handleStartExam = () => {
        if (!selectedBankId) {
            alert('请先选择题库')
            return
        }
        if (questionCount <= 0) {
            alert('题目数量不足')
            return
        }

        const queryParams = new URLSearchParams({
            orgId: currentOrgId,
            bankId: selectedBankId,
            type: selectedType,
            mode: selectedMode,
            count: questionCount.toString()
        })

        router.push(`/exam?${queryParams.toString()}`)
    }

    if (myOrgs.length === 0) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <FiUsers className="mr-2" /> 探索组织
                    </h2>
                    <JoinOrg />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-6">
                        <FiUsers className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                        欢迎来到 iExam
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8 text-lg">
                        您尚未加入任何组织或班级。点击右上角的加入按钮，开始您的练习之旅。
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold mb-2">
                            模拟考试系统
                        </h1>
                        <p className="text-blue-100 text-lg">
                            选择练习配置，生成专属试卷
                        </p>
                    </div>
                </div>
                <div className="absolute -bottom-10 -right-10 opacity-10">
                    <FiAward className="w-56 h-56" />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center">
                            <FiUsers className="mr-1.5" /> 当前组织
                        </label>
                        <select
                            value={currentOrgId}
                            onChange={(e) => handleOrgSwitch(e.target.value)}
                            className="w-full bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-lg rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 shadow-sm transition-colors"
                        >
                            {myOrgs.map(org => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="shrink-0 self-end sm:self-auto sm:mt-6">
                        <JoinOrg />
                    </div>
                </div>

                {/* Form Body */}
                <div className="p-6 sm:p-8 space-y-8">
                    {/* Bank Selection */}
                    <div className="space-y-2">
                        <label className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                            <FiBook className="mr-2 text-blue-500" /> 选择题库
                        </label>
                        <select
                            value={selectedBankId}
                            onChange={(e) => setSelectedBankId(e.target.value)}
                            disabled={banks.length === 0}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-4 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                            {banks.length === 0 ? (
                                <option value="">无可用题库</option>
                            ) : (
                                banks.map(bank => (
                                    <option key={bank.id} value={bank.id}>{bank.name}</option>
                                ))
                            )}
                        </select>
                    </div>

                    <div className="hidden sm:block border-t border-gray-100 dark:border-gray-700"></div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-6">
                        {/* Type Selection */}
                        <div className="space-y-2">
                            <label className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                                <FiList className="mr-2 text-blue-500" /> 选择考试题型
                            </label>
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white cursor-pointer transition-colors"
                            >
                                {types.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Mode Selection */}
                        <div className="space-y-2">
                            <label className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                                <FiSettings className="mr-2 text-blue-500" /> 选择答题模式
                            </label>
                            <select
                                value={selectedMode}
                                onChange={(e) => setSelectedMode(e.target.value)}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white cursor-pointer transition-colors"
                            >
                                {modes.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="hidden sm:block border-t border-gray-100 dark:border-gray-700"></div>

                    {/* Question Count Slider */}
                    <div className="space-y-4 bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                        <div className="flex justify-between items-end">
                            <label className="text-base font-bold text-gray-900 dark:text-white">选择题目数量</label>
                            <div className="bg-white dark:bg-gray-800 px-4 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 font-bold text-lg shadow-sm">
                                {questionCount} <span className="text-sm font-normal text-gray-400 mx-1">/</span> {maxQuestions}
                            </div>
                        </div>
                        <div className="pt-2 pb-1 relative">
                            <input
                                type="range"
                                min="1"
                                max={Math.max(1, maxQuestions)}
                                value={questionCount}
                                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                                disabled={maxQuestions === 0}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600 disabled:opacity-50"
                            />
                            {/* Visual Track Fill (Optional Tailwind trick or rely on accent color) */}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 pb-2">
                        <button
                            onClick={handleStartExam}
                            disabled={!selectedBankId || questionCount === 0 || loading}
                            className="w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-bold rounded-2xl text-lg px-5 py-5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex justify-center items-center"
                        >
                            <FiPlayCircle className="w-6 h-6 mr-2" />
                            {loading ? '加载配置...' : '开始练习'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
