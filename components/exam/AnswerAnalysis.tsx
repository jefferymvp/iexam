'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { FiCpu, FiRefreshCw } from 'react-icons/fi'

interface AnswerAnalysisProps {
    question: any
    correctAnswer: any
    isAiLoading?: boolean
    isStreamingEnabled?: boolean
    userRole?: string
    onGenerateAI?: () => void
    onToggleStreaming?: (enabled: boolean) => void
    renderEndRef?: React.RefObject<HTMLDivElement | null>
}

export default function AnswerAnalysis({
    question,
    correctAnswer,
    isAiLoading = false,
    isStreamingEnabled = true,
    userRole = 'user',
    onGenerateAI,
    onToggleStreaming,
    renderEndRef
}: AnswerAnalysisProps) {
    
    const displayAnswer = Array.isArray(correctAnswer) 
        ? correctAnswer.join(', ') 
        : (question.type === 'judge' ? (String(correctAnswer) === '1' ? '正确' : '错误') : correctAnswer);

    return (
        <div className="bg-gray-50/80 dark:bg-gray-750/80 p-5 sm:p-8 border-t border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mr-3">
                        <span className="text-blue-500">💡</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">答案解析</h3>
                </div>
                
                {onGenerateAI && (
                    <div className="flex items-center gap-3">
                        {onToggleStreaming && (
                            <label className="flex items-center cursor-pointer group" title="开启后解析将逐字显示">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={isStreamingEnabled}
                                        onChange={(e) => onToggleStreaming(e.target.checked)}
                                    />
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${isStreamingEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 transform ${isStreamingEnabled ? 'translate-x-4' : 'translate-x-0'} shadow-sm`}></div>
                                </div>
                                <span className="ml-2 text-xs font-semibold text-gray-500 dark:text-gray-400 group-hover:text-blue-500 transition-colors">流式输出</span>
                            </label>
                        )}
                        
                        <button
                            onClick={onGenerateAI}
                            disabled={isAiLoading || (!!question.parse && question.parse.trim().length > 0 && userRole !== 'admin')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            title={question.parse && question.parse.trim().length > 0 && userRole !== 'admin' ? "只有管理员可以重新生成解析" : ""}
                        >
                            {isAiLoading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiCpu className="w-4 h-4" />}
                            <span>
                                {isAiLoading ? (isStreamingEnabled ? '正在构思...' : '生成中...') : (question.parse && question.parse.trim().length > 0 && userRole !== 'admin' ? '仅限管理覆盖' : '生成智能解析')}
                            </span>
                        </button>
                    </div>
                )}
            </div>
            
            <div className="ml-11">
                <p className="font-mono text-base sm:text-lg mb-4 text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 inline-block px-3 py-1 rounded-lg">
                    正确答案: {displayAnswer}
                </p>
                <div className={`prose prose-sm sm:prose-base prose-blue dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed [overflow-wrap:anywhere] transition-all duration-300 ${(isAiLoading && !isStreamingEnabled) ? 'opacity-50 animate-pulse' : ''}`}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[[rehypeKatex, { output: 'html' }]]}
                        components={{
                            p: ({ node, ...props }: any) => <p className="mb-4 last:mb-0" {...props} />,
                            table: ({ node, ...props }: any) => (
                                <div className="overflow-x-auto mb-4">
                                    <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden" {...props} />
                                </div>
                            ),
                            thead: ({ node, ...props }: any) => <thead className="bg-gray-100 dark:bg-gray-800" {...props} />,
                            th: ({ node, ...props }: any) => <th className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-left font-bold" {...props} />,
                            td: ({ node, ...props }: any) => <td className="border border-gray-200 dark:border-gray-700 px-4 py-2" {...props} />,
                        }}
                    >
                        {(question.parse || "暂无详细解析内容。")
                            .replace(/~/g, '至')
                            .replace(/\\texttt?\{([^}]*)\}/g, '`$1`')
                            .replace(/√\s*([0-9a-zA-Z]+)/g, '$\\sqrt{$1}$')
                            .replace(/√(?![0-9a-zA-Z])/g, '\\sqrt')
                            .replace(/(?<!\$)\\boxed\{([A-Z0-9]+)\}(?!\$)/g, '$\\boxed{$1}$')
                            .replace(/(?<!\$)\\boxed\{(正确|错误)\}(?!\$)/g, '$\\boxed{$1}$')
                            .replace(/(?<!\$)\\boxed\{\\text\{(正确|错误)\}\}(?!\$)/g, '$\\boxed{\\text{$1}}$')
                        }
                    </ReactMarkdown>
                </div>
                {renderEndRef && <div ref={renderEndRef} />}
            </div>
        </div>
    )
}
