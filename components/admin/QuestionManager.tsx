'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiImage, FiArrowLeft, FiCheck, FiX, FiSave, FiChevronLeft, FiChevronRight, FiEye, FiCheckCircle, FiInfo } from 'react-icons/fi'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { MdEditor, ToolbarNames } from 'md-editor-rt'
import 'md-editor-rt/lib/style.css'

interface QuestionManagerProps {
    bankId: string
    bankName: string
    onBack: () => void
}

export default function QuestionManager({ bankId, bankName, onBack }: QuestionManagerProps) {
    const [questions, setQuestions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingQuestion, setEditingQuestion] = useState<any>(null)
    const [uploadingImage, setUploadingImage] = useState(false)
    const imageInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1)
    const [previewQuestion, setPreviewQuestion] = useState<any>(null)
    const ITEMS_PER_PAGE = 15

    // Form states
    const [formData, setFormData] = useState({
        title: '',
        type: 'single',
        options: [{ label: 'A', value: '' }, { label: 'B', value: '' }, { label: 'C', value: '' }, { label: 'D', value: '' }],
        answer: '' as any,
        parse: ''
    })

    useEffect(() => {
        fetchQuestions()
    }, [bankId])

    useEffect(() => {
        // Reset to page 1 when searching
        setCurrentPage(1)
    }, [searchQuery])

    const fetchQuestions = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('questions')
            .select('*')
            .eq('bank_id', bankId)
            .order('type', { ascending: false })
            .order('title', { ascending: true })
        if (data) setQuestions(data)
        setLoading(false)
    }

    const handleOpenModal = (q: any = null) => {
        if (q) {
            setEditingQuestion(q)
            setFormData({
                title: q.title || '',
                type: q.type || 'single',
                options: Array.isArray(q.options) ? q.options : [],
                answer: q.answer,
                parse: q.parse || ''
            })
        } else {
            setEditingQuestion(null)
            setFormData({
                title: '',
                type: 'single',
                options: [{ label: 'A', value: '' }, { label: 'B', value: '' }, { label: 'C', value: '' }, { label: 'D', value: '' }],
                answer: '',
                parse: ''
            })
        }
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (confirm('确认删除该题目吗？')) {
            await supabase.from('questions').delete().eq('id', id)
            fetchQuestions()
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingImage(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
            const filePath = `${bankId}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('question-images')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('question-images')
                .getPublicUrl(filePath)

            // Insert markdown image into title
            setFormData(prev => ({
                ...prev,
                title: `${prev.title}\n\n![图片](${publicUrl})\n`
            }))
        } catch (error: any) {
            alert('图片上传失败: ' + error.message)
        } finally {
            setUploadingImage(false)
            if (imageInputRef.current) imageInputRef.current.value = ''
        }
    }

    const handleSave = async () => {
        if (!formData.title.trim()) return alert('请输入题干')
        if (formData.type !== 'judge' && formData.options.some(o => !o.value.trim())) return alert('请完善所有选项内容')
        if (!formData.answer || (Array.isArray(formData.answer) && formData.answer.length === 0)) return alert('请设置正确答案')

        const payload = {
            bank_id: bankId,
            title: formData.title,
            type: formData.type,
            options: formData.options,
            answer: formData.answer,
            parse: formData.parse
        }

        let error;
        if (editingQuestion) {
            const { error: err } = await supabase.from('questions').update({
                ...payload,
                updated_at: new Date().toISOString()
            }).eq('id', editingQuestion.id)
            error = err
        } else {
            const { error: err } = await supabase.from('questions').insert(payload)
            error = err
        }

        if (error) {
            alert('保存失败: ' + error.message)
        } else {
            setIsModalOpen(false)
            fetchQuestions()
        }
    }

    const filteredQuestions = questions.filter(q => 
        q.title?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const totalItems = filteredQuestions.length
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
    const paginatedQuestions = filteredQuestions.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        title="返回题库列表"
                    >
                        <FiArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            题目管理
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                                {bankName}
                            </span>
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">管理题库中的所有试题，支持增删改查及图片上传。</p>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-sm hover:shadow-md"
                >
                    <FiPlus className="mr-2" /> 新增题目
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="搜索题干关键词..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm"
                />
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-20 text-gray-500">加载中...</div>
            ) : totalItems === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500">暂无符合条件的题目，开始新增第一道吧！</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid gap-4">
                        {paginatedQuestions.map((q, idx) => {
                            const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                            return (
                                <div key={q.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition group overflow-hidden relative">
                                    {/* Global Index Decorator */}
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    
                                    <div className="flex justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-700 text-[10px] font-bold text-gray-400 dark:text-gray-500">
                                                    #{globalIndex}
                                                </span>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${
                                                    q.type === 'multiple' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400' :
                                                    q.type === 'judge' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400' :
                                                    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400'
                                                }`}>
                                                    {q.type === 'multiple' ? '多选' : q.type === 'judge' ? '判断' : '单选'}
                                                </span>
                                            </div>
                                            <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2 leading-relaxed">
                                                {q.title}
                                            </h3>
                                            <div className="text-xs text-gray-500 flex items-center gap-4 pt-1">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                                    选项: {Array.isArray(q.options) ? q.options.length : 0}个
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                    答案: <span className="text-green-600 dark:text-green-400 font-bold ml-0.5">
                                                        {Array.isArray(q.answer) ? q.answer.join('') : (q.type === 'judge' ? (q.answer === '1' ? '正确' : '错误') : q.answer)}
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setPreviewQuestion(q)}
                                                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors border border-transparent hover:border-green-100 dark:hover:border-green-800"
                                                title="预览题目"
                                            >
                                                <FiEye className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleOpenModal(q)}
                                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-800"
                                                title="编辑题目"
                                            >
                                                <FiEdit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(q.id)}
                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-800"
                                                title="删除题目"
                                            >
                                                <FiTrash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination Bar */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                显示第 <span className="font-medium text-gray-900 dark:text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> 至 <span className="font-medium text-gray-900 dark:text-white">{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</span> 条，共 <span className="font-medium text-gray-900 dark:text-white">{totalItems}</span> 条题目
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                                >
                                    <FiChevronLeft className="w-5 h-5" />
                                </button>
                                
                                <div className="flex items-center gap-1 px-2">
                                    {Array.from({ length: totalPages }).map((_, i) => {
                                        const page = i + 1;
                                        // Simple page number logic: show first, last, and relative pages
                                        if (
                                            page === 1 || 
                                            page === totalPages || 
                                            (page >= currentPage - 1 && page <= currentPage + 1)
                                        ) {
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-9 h-9 text-sm font-bold rounded-lg transition-all ${
                                                        currentPage === page 
                                                        ? 'bg-blue-600 text-white shadow-md' 
                                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                    }`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        } else if (
                                            (page === 2 && currentPage > 3) || 
                                            (page === totalPages - 1 && currentPage < totalPages - 2)
                                        ) {
                                            return <span key={page} className="text-gray-400 px-1 select-none">...</span>;
                                        }
                                        return null;
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                                >
                                    <FiChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[95vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-gray-100 dark:border-gray-800">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                    <FiEdit2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {editingQuestion ? '编辑题目' : '新增题目'}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">正在编辑题库中的题目内容及配置</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Main Body - Vertical Layout */}
                        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white dark:bg-gray-950 space-y-12">
                            
                            {/* Section 1: Stem Editing */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-lg">
                                        <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                                        题干内容
                                    </div>
                                    <button 
                                        onClick={() => imageInputRef.current?.click()}
                                        disabled={uploadingImage}
                                        className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-2 font-medium text-sm border border-blue-100 dark:border-blue-800"
                                    >
                                        <FiImage className="w-4 h-4" /> {uploadingImage ? '上传中...' : '插入图片'}
                                    </button>
                                    <input 
                                        type="file" 
                                        hidden 
                                        ref={imageInputRef} 
                                        accept="image/*" 
                                        onChange={handleImageUpload} 
                                    />
                                </div>
                                <textarea
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="在此输入题目内容，支持图片 URL 或 Markdown 链接..."
                                    className="w-full p-6 text-lg bg-gray-50/50 dark:bg-gray-900/50 border-2 border-gray-100 dark:border-gray-800 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 outline-none rounded-2xl transition-all resize-none leading-relaxed text-gray-900 dark:text-gray-100 min-h-[160px]"
                                />
                                <div className="mt-2 text-xs text-gray-400 flex items-center gap-2">
                                    <FiInfo className="shrink-0" />
                                    小技巧：可以直接粘贴图片链接或 Markdown 格式图片。
                                </div>
                            </div>

                            {/* Section 2: Question Type & Answer Settings */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Type Selection */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-lg">
                                        <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                                        题目类型
                                    </div>
                                    <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                                        {['single', 'multiple', 'judge'].map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => {
                                                    setFormData(prev => ({ 
                                                        ...prev, 
                                                        type: type as any,
                                                        answer: type === 'multiple' ? [] : (type === 'judge' ? '1' : ''),
                                                        options: type === 'judge' ? [
                                                            { label: '正确', value: '1' },
                                                            { label: '错误', value: '0' }
                                                        ] : (prev.options.length === 2 ? [
                                                            { label: 'A', value: '' }, { label: 'B', value: '' }, { label: 'C', value: '' }, { label: 'D', value: '' }
                                                        ] : prev.options)
                                                    }))
                                                }}
                                                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                                                    formData.type === type 
                                                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                }`}
                                            >
                                                {type === 'multiple' ? '多选' : type === 'judge' ? '判断' : '单选'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Answer Selection */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-lg">
                                        <span className="w-1.5 h-6 bg-green-500 rounded-full"></span>
                                        正确答案
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.options.map((opt) => {
                                            const optValue = formData.type === 'judge' ? opt.value : opt.label;
                                            const isSelected = formData.type === 'multiple' 
                                                ? (formData.answer as string[]).includes(optValue)
                                                : formData.answer === optValue;
                                            
                                            return (
                                                <button
                                                    key={opt.label}
                                                    onClick={() => {
                                                        if (formData.type === 'multiple') {
                                                            const current = (formData.answer as string[])
                                                            const newVal = current.includes(optValue)
                                                                ? current.filter(v => v !== optValue)
                                                                : [...current, optValue].sort()
                                                            setFormData({ ...formData, answer: newVal })
                                                        } else {
                                                            setFormData({ ...formData, answer: optValue })
                                                        }
                                                    }}
                                                    className={`min-w-[3.5rem] px-4 py-2 rounded-xl border-2 font-bold transition-all ${
                                                        isSelected 
                                                        ? 'bg-green-600 border-green-600 text-white shadow-md' 
                                                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400 hover:text-green-600 hover:border-green-200'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Options (if not judge) */}
                            {formData.type !== 'judge' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-lg">
                                            <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                                            选项配置
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const nextLabel = String.fromCharCode(65 + formData.options.length);
                                                setFormData(prev => ({ ...prev, options: [...prev.options, { label: nextLabel, value: '' }] }))
                                            }}
                                            className="text-xs text-blue-600 hover:text-blue-700 font-bold bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors border border-blue-100 dark:border-blue-800/40"
                                        >
                                            + 添加新选项
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {formData.options.map((opt, idx) => (
                                            <div key={idx} className="flex gap-2 group/opt items-start bg-gray-50/50 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                                                <div className="w-10 h-10 shrink-0 flex items-center justify-center font-bold bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                                                    {opt.label}
                                                </div>
                                                <textarea
                                                    value={opt.value}
                                                    placeholder={`选项 ${opt.label} 内容...`}
                                                    rows={2}
                                                    onChange={(e) => {
                                                        const newOpts = [...formData.options]
                                                        newOpts[idx].value = e.target.value
                                                        setFormData({ ...formData, options: newOpts })
                                                    }}
                                                    className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 dark:focus:border-blue-500 outline-none rounded-xl transition-all text-sm text-gray-900 dark:text-gray-100 shadow-sm resize-none"
                                                />
                                                {formData.options.length > 2 && (
                                                    <button 
                                                        onClick={() => {
                                                            const newOpts = formData.options.filter((_, i) => i !== idx).map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) }))
                                                            setFormData({ ...formData, options: newOpts })
                                                        }}
                                                        className="p-2 text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover/opt:opacity-100 mt-1"
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Section 4: Analysis */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-lg">
                                    <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                                    答案解析
                                </div>
                                <div className="border-2 border-transparent focus-within:border-blue-500 rounded-2xl overflow-hidden transition-all shadow-sm">
                                    <MdEditor
                                        modelValue={formData.parse}
                                        onChange={(val) => setFormData({ ...formData, parse: val })}
                                        placeholder="在此输入题目解析内容，支持 Markdown 和 LaTeX 公式..."
                                        language="zh-CN"
                                        preview={false}
                                        theme={(typeof window !== 'undefined' && document.documentElement.classList.contains('dark')) ? 'dark' : 'light'}
                                        toolbars={[
                                            'bold', 'italic', 'underline', 'strikeThrough', '-',
                                            'title', 'sub', 'sup', 'quote', 'unorderedList', 'orderedList', 'task', '-',
                                            'codeRow', 'code', 'link', 'image', 'table', 'katex', '-',
                                            'revoke', 'next', 'save', '=', 'pageFullscreen', 'fullscreen', 'preview', 'htmlPreview'
                                        ] as ToolbarNames[]}
                                        style={{ height: '360px', borderRadius: '1rem' }}
                                        noImgUploadInEditor={true}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-4 bg-gray-50 dark:bg-gray-800/80">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-3 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-2xl transition-colors"
                            >
                                取消
                            </button>
                            <div className="flex-1 flex gap-3">
                                <button
                                    onClick={() => setPreviewQuestion({ ...formData } as any)}
                                    className="flex-1 py-3 bg-white dark:bg-gray-800 border-2 border-blue-600/30 text-blue-600 dark:text-blue-400 font-bold rounded-2xl hover:border-blue-600 transition-all flex items-center justify-center gap-2 group"
                                >
                                    <FiEye className="w-5 h-5 group-hover:scale-110 transition-transform" /> 预览效果
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 text-lg active:scale-[0.98]"
                                >
                                    <FiSave className="w-5 h-5" /> 完成并保存
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewQuestion && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-3xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-gray-100 dark:border-gray-800">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                                    <FiEye className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">题目预览</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">正在按学生端视角渲染题目...</p>
                                </div>
                            </div>
                            <button onClick={() => setPreviewQuestion(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-8 flex-1 bg-white dark:bg-gray-950">
                            {/* Question Content */}
                            <div className="space-y-6">
                                <div className="flex items-start">
                                    <span className="shrink-0 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold px-2.5 py-1 rounded-lg mr-3 mt-1">
                                        {previewQuestion.type === 'multiple' ? '多选' : previewQuestion.type === 'judge' ? '判断' : '单选'}
                                    </span>
                                    <div className="prose prose-lg dark:prose-invert max-w-none text-gray-900 dark:text-white leading-relaxed [overflow-wrap:anywhere]">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                                p: ({ node, ...props }) => <p style={{ whiteSpace: 'pre-wrap', marginTop: 0, marginBottom: '0.25rem' }} {...props} />
                                            }}
                                        >
                                            {previewQuestion.title?.replace(/\n/g, '\n\n')}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                                <div className="space-y-3 pl-0 sm:pl-10">
                                    {Array.isArray(previewQuestion.options) && previewQuestion.options.map((opt: any) => {
                                        const isCorrect = previewQuestion.type === 'multiple'
                                            ? (previewQuestion.answer as string[]).includes(previewQuestion.type === 'judge' ? opt.value : opt.label)
                                            : previewQuestion.answer === (previewQuestion.type === 'judge' ? opt.value : opt.label);

                                        return (
                                            <div 
                                                key={opt.label}
                                                className={`flex items-start p-4 rounded-xl border-2 transition-all ${
                                                    isCorrect 
                                                    ? 'bg-green-50/50 dark:bg-green-900/10 border-green-500/50 shadow-sm' 
                                                    : 'border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20'
                                                }`}
                                            >
                                                <div className={`w-10 h-10 shrink-0 flex items-center justify-center font-bold rounded-lg border-2 mr-4 ${
                                                    isCorrect
                                                    ? 'bg-green-500 border-green-500 text-white'
                                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'
                                                }`}>
                                                    {opt.label}
                                                </div>
                                                <div className="text-gray-700 dark:text-gray-300 font-medium whitespace-pre-wrap pt-1.5">{opt.value}</div>
                                                {isCorrect && <FiCheck className="ml-auto text-green-500 w-6 h-6 shrink-0 mt-2" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Answer and Parse Section */}
                            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold">
                                    <FiCheckCircle className="w-5 h-5" />
                                    <span>正确答案：{Array.isArray(previewQuestion.answer) ? previewQuestion.answer.join(', ') : (previewQuestion.type === 'judge' ? (previewQuestion.answer === '1' ? '正确' : '错误') : previewQuestion.answer)}</span>
                                </div>
                                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100/50 dark:border-blue-800/30">
                                    <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                                        答案解析
                                    </h4>
                                    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed [overflow-wrap:anywhere]">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                                p: ({ node, ...props }) => <p style={{ whiteSpace: 'pre-wrap', marginTop: 0, marginBottom: '0.25rem' }} {...props} />
                                            }}
                                        >
                                            {(previewQuestion.parse || "暂无详细解析内容。")?.replace(/\n/g, '\n\n')}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                            <button
                                onClick={() => setPreviewQuestion(null)}
                                className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl hover:opacity-90 transition-opacity"
                            >
                                关闭预览
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
