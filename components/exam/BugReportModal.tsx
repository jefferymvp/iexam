'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FiX, FiSend, FiAlertTriangle } from 'react-icons/fi'

interface BugReportModalProps {
    isOpen: boolean
    onClose: () => void
    questionId: string
    userId: string
}

export default function BugReportModal({ isOpen, onClose, questionId, userId }: BugReportModalProps) {
    const [content, setContent] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const supabase = createClient()

    if (!isOpen) return null

    const handleSubmit = async () => {
        if (!content.trim()) return

        setIsSubmitting(true)
        setMessage(null)

        try {
            const { error } = await supabase.from('bugs').insert({
                user_id: userId,
                question_id: questionId,
                content: content.trim(),
                status: 'open'
            })

            if (error) throw error

            setMessage({ type: 'success', text: '感谢您的反馈！我们会尽快处理。' })
            setContent('')
            setTimeout(() => {
                onClose()
                setMessage(null)
            }, 2000)
        } catch (err: any) {
            console.error('Error reporting bug:', err)
            setMessage({ type: 'error', text: '提交失败，请稍后重试。' })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                        <FiAlertTriangle className="text-amber-500 mr-2" /> 题目报错
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <FiX className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        如果您发现本题的题目内容、选项或解析存在错误，请在此详细说明：
                    </p>

                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="请输入错误情况..."
                        className="w-full h-32 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
                    />

                    {message && (
                        <div className={`mt-4 p-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold rounded-xl transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !content.trim()}
                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center"
                        >
                            {isSubmitting ? '提交中...' : <><FiSend className="mr-2" /> 提交反馈</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
