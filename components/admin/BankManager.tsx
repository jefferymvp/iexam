'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FiUploadCloud, FiTrash2, FiFileText, FiPower } from 'react-icons/fi'
import * as XLSX from 'xlsx'

export default function BankManager() {
    const [banks, setBanks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const supabase = createClient()

    useEffect(() => {
        fetchBanks()
    }, [])

    const fetchBanks = async () => {
        setLoading(true)
        const { data } = await supabase.from('question_banks').select('*').order('created_at', { ascending: false })
        if (data) setBanks(data)
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (confirm('确认删除该题库吗？这会级联删除所有题目和组织绑定！')) {
            await supabase.from('question_banks').delete().eq('id', id)
            fetchBanks()
        }
    }

    const handleToggle = async (id: string, currentStatus: boolean) => {
        await supabase.from('question_banks').update({ is_active: !currentStatus }).eq('id', id)
        fetchBanks()
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data)
            const worksheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json(worksheet)

            // Very simplified example logic to create a default bank and import questions:
            // Ideal system allows mapping Excel's "题库名称" to distinct Banks.
            const bankName = file.name.replace(/\.[^/.]+$/, "") // use file name as bank name

            const { data: newBank, error: bankErr } = await supabase
                .from('question_banks')
                .insert({ name: bankName, description: 'Excel 批量导入' })
                .select()
                .single()

            if (bankErr) throw bankErr

            const bankId = newBank.id

            const questionsToInsert = jsonData.map((row: any) => {
                return {
                    bank_id: bankId,
                    title: row['题目'] || row['Title'],
                    type: row['题型'] === '多选题' ? 'multiple' : row['题型'] === '判断题' ? 'judge' : 'single',
                    options: JSON.stringify([
                        { label: 'A', value: row['选项A'] || row['A'] },
                        { label: 'B', value: row['选项B'] || row['B'] },
                        { label: 'C', value: row['选项C'] || row['C'] },
                        { label: 'D', value: row['选项D'] || row['D'] }
                    ].filter(o => o.value)),
                    answer: JSON.stringify(row['答案'] || row['Answer'] || 'A'),
                    parse: row['解析'] || row['Parse'] || ''
                }
            })

            const { error: qErr } = await supabase.from('questions').insert(questionsToInsert)
            if (qErr) throw qErr

            alert(`成功导入 ${questionsToInsert.length} 道题目至题库 [${bankName}]`)
            fetchBanks()
        } catch (err: any) {
            console.error(err)
            alert(`导入失败: ${err.message}`)
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = ''
            setUploading(false)
        }
    }

    if (loading) return <div className="text-center py-10">加载中...</div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">题库管理中心</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">支持通过 Excel 进行试题的自动化解析和批量录入。</p>
                </div>
                <div>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 shadow-sm"
                    >
                        {uploading ? (
                            <>处理中...</>
                        ) : (
                            <><FiUploadCloud className="mr-2" /> 导入 Excel 题库</>
                        )}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {banks.map((bank) => (
                    <div key={bank.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 relative group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                <FiFileText className="w-6 h-6" />
                            </div>
                            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleToggle(bank.id, bank.is_active)}
                                    title={bank.is_active ? "停用该题库" : "启用该题库"}
                                    className={`p-1.5 rounded-lg ${bank.is_active ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20' : 'text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                                >
                                    <FiPower className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(bank.id)}
                                    title="删除该题库"
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <FiTrash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">{bank.name}</h3>
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0 border ${bank.is_active !== false ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'}`}>
                                {bank.is_active !== false ? '使用中' : '已停用'}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 min-h-[40px]">
                            {bank.description || '无具体描述'}
                        </p>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                            创建于: {new Date(bank.created_at).toLocaleDateString()}
                        </div>
                    </div>
                ))}

                {banks.length === 0 && (
                    <div className="col-span-full text-center py-20 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                        <FiDatabase className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p>还没有录入任何题库，点击右上角导入吧</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// Add FiDatabase icon since it's used in empty state
import { FiDatabase } from 'react-icons/fi'
