'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FiCheckCircle, FiXCircle, FiArrowRight, FiArrowLeft, FiClock, FiFileText, FiLogOut, FiAlertTriangle } from 'react-icons/fi'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import BugReportModal from '@/components/exam/BugReportModal'

const safeParse = (val: any, fallback: any) => {
    if (val === null || val === undefined) return fallback;
    if (typeof val !== 'string') return val;
    try {
        return JSON.parse(val);
    } catch (e) {
        return val;
    }
}

interface ExamEngineProps {
    initialQuestions: any[]
    userId: string
    mode?: string // 'show' = practice, 'hide' = formal exam
}

export default function ExamEngine({ initialQuestions, userId, mode = 'show' }: ExamEngineProps) {
    const [questions] = useState(initialQuestions)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | string[]>>({})
    const [showAnswerForQ, setShowAnswerForQ] = useState<Record<string, boolean>>({})
    const [isFinished, setIsFinished] = useState(false)
    const [score, setScore] = useState(0)
    const [isBugModalOpen, setIsBugModalOpen] = useState(false)

    const supabase = createClient()
    const currentQ = questions[currentIndex]

    const handleSelectOption = (value: string) => {
        if (showAnswerForQ[currentQ.id] || isFinished) return // Cannot change after submitting in training mode

        if (currentQ.type === 'multiple') {
            const prev = (selectedAnswers[currentQ.id] as string[]) || []
            if (prev.includes(value)) {
                setSelectedAnswers({ ...selectedAnswers, [currentQ.id]: prev.filter(v => v !== value) })
            } else {
                setSelectedAnswers({ ...selectedAnswers, [currentQ.id]: [...prev, value] })
            }
        } else {
            setSelectedAnswers({ ...selectedAnswers, [currentQ.id]: value })
        }
    }

    const checkAndLogMistake = async (q: any, userAnswer: any) => {
        let parsedAnswer = safeParse(q.answer, '');

        let isCorrect = false;
        if (Array.isArray(userAnswer)) {
            const arrParsed = Array.isArray(parsedAnswer) ? parsedAnswer : [parsedAnswer];
            isCorrect = JSON.stringify([...userAnswer].map(String).sort()) === JSON.stringify(arrParsed.map(String).sort());
        } else {
            isCorrect = String(userAnswer) === String(parsedAnswer);
        }

        if (!isCorrect) {
            await supabase.from('user_mistakes').upsert({
                user_id: userId,
                question_id: q.id,
                bank_id: q.bank_id
            }, { onConflict: 'user_id, question_id' })
        }
        return isCorrect;
    }

    const handleSubmitSingleAnswer = async () => {
        // practice mode: check answer immediately
        setShowAnswerForQ({ ...showAnswerForQ, [currentQ.id]: true })
        await checkAndLogMistake(currentQ, selectedAnswers[currentQ.id])
    }

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1)
        } else {
            finishExam()
        }
    }

    const finishExam = async () => {
        let calculatedScore = 0
        for (const q of questions) {
            const ua = selectedAnswers[q.id]
            // check correct logic
            if (ua) {
                const correct = await checkAndLogMistake(q, ua);
                if (correct) calculatedScore++
            } else {
                // log mistake for unanswered
                await checkAndLogMistake(q, null);
            }
        }
        setScore(calculatedScore)
        setIsFinished(true)
    }

    if (isFinished) {
        return (
            <div className="max-w-3xl mx-auto mt-4 sm:mt-10 px-4">
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 sm:p-10 text-center shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                        <FiCheckCircle className="w-10 h-10 sm:w-12 sm:h-12" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">练习完成</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto text-sm sm:text-base">
                        您已经完成了这组练习，错题已自动收录到错题本中，方便日后复习加强。
                    </p>

                    <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-8">
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl">
                            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">总题数</div>
                            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{questions.length}</div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl">
                            <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 mb-1">正确数</div>
                            <div className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-300">{score}</div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link
                            href="/"
                            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold rounded-xl transition-colors w-full sm:w-auto"
                        >
                            返回首页
                        </Link>
                        <Link
                            href="/mistakes"
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors inline-flex items-center justify-center w-full sm:w-auto shadow-md"
                        >
                            查看错题本 <FiArrowRight className="ml-2" />
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const options = safeParse(currentQ.options, []);
    const correctAnswer = safeParse(currentQ.answer, '');
    const myAnswer = selectedAnswers[currentQ.id]
    const isMultiple = currentQ.type === 'multiple'
    const isShowMode = mode === 'show'
    const hasSubmittedCurrent = isShowMode && showAnswerForQ[currentQ.id]

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
            {/* Top Bar */}
            <div className="mb-4 sm:mb-6 flex items-center justify-between text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center flex-1">
                    <div className="flex items-center font-medium shrink-0">
                        <FiFileText className="mr-2 text-blue-500" />
                        <span className="hidden sm:inline mr-1">进度：</span>
                        <span className="text-gray-900 dark:text-white font-bold">{currentIndex + 1}</span> / {questions.length}
                    </div>
                    <div className="w-full max-w-[12rem] bg-gray-100 dark:bg-gray-700 rounded-full h-2 hidden sm:block ml-4">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                        ></div>
                    </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                    <button
                        onClick={() => setIsBugModalOpen(true)}
                        className="flex items-center text-gray-400 hover:text-amber-500 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/10"
                        title="反馈本题错误"
                    >
                        <FiAlertTriangle className="mr-1" /> <span className="hidden xs:inline">报错</span>
                    </button>
                    <button
                        onClick={() => {
                            if (window.confirm('确定要退出当前练习吗？您的进度将不会被保存。')) {
                                window.location.href = '/';
                            }
                        }}
                        className="flex items-center text-gray-400 hover:text-red-500 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10"
                        title="退出练习"
                    >
                        <FiLogOut className="mr-1" /> <span className="hidden xs:inline">退出</span>
                    </button>
                </div>
            </div>

            {/* Bug Report Modal */}
            <BugReportModal
                isOpen={isBugModalOpen}
                onClose={() => setIsBugModalOpen(false)}
                questionId={currentQ.id}
                userId={userId}
            />

            {/* Question Card */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6 sm:mb-8">
                <div className="p-5 sm:p-8">
                    <div className="flex items-start mb-6">
                        <span className="shrink-0 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold px-2.5 py-1 rounded-lg mr-3 mt-0.5">
                            {currentQ.type === 'multiple' ? '多选' : currentQ.type === 'judge' ? '判断' : '单选'}
                        </span>
                        <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-relaxed [overflow-wrap:anywhere]">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: ({ node, ...props }: any) => <p style={{ whiteSpace: 'pre-wrap', marginTop: 0, marginBottom: '0.25rem' }} {...props} />
                                }}
                            >
                                {currentQ.title?.replace(/\n/g, '\n\n')}
                            </ReactMarkdown>
                        </div>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                        {options.map((opt: any) => {
                            const optKey = currentQ.type === 'judge' ? String(opt.value) : String(opt.label);
                            const checked = isMultiple
                                ? ((myAnswer as string[]) || []).map(String).includes(optKey)
                                : String(myAnswer) === optKey

                            let stateClass = "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer text-gray-700"
                            let indicatorClass = "border-gray-300 dark:border-gray-600 text-transparent"

                            if (checked) {
                                stateClass = "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 cursor-pointer shadow-sm"
                                indicatorClass = "bg-blue-500 border-blue-500 text-white"
                            }

                            if (hasSubmittedCurrent) {
                                const isOptCorrect = isMultiple
                                    ? (Array.isArray(correctAnswer) ? correctAnswer.map(String).includes(String(optKey)) : false)
                                    : String(correctAnswer) === String(optKey)

                                if (isOptCorrect) {
                                    stateClass = "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 cursor-default"
                                    indicatorClass = "bg-green-500 border-green-500 text-white"
                                } else if (checked && !isOptCorrect) {
                                    stateClass = "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 cursor-default"
                                    indicatorClass = "bg-red-500 border-red-500 text-white"
                                } else {
                                    stateClass = "border-gray-200 dark:border-gray-700 opacity-60 cursor-default"
                                }
                            }

                            return (
                                <div
                                    key={optKey}
                                    onClick={() => handleSelectOption(optKey)}
                                    className={`border-2 rounded-2xl p-4 sm:p-5 transition-all duration-200 flex items-start ${stateClass}`}
                                >
                                    <div className={`shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center mr-3 sm:mr-4 border-2 transition-colors mt-0.5 ${indicatorClass}`}>
                                        <FiCheckCircle className="w-4 h-4 sm:w-5 sm:h-5 opacity-100" />
                                    </div>
                                    <span className="font-bold text-base sm:text-lg min-w-[1.5rem] sm:min-w-[2rem] opacity-70 mt-0.5 sm:mt-0">
                                        {currentQ.type === 'judge' ? '' : `${opt.label}.`}
                                    </span>
                                    <span className="font-medium text-sm sm:text-base leading-relaxed break-words flex-1 dark:text-gray-200 whitespace-pre-wrap">
                                        {currentQ.type === 'judge' ? opt.label : opt.value}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {hasSubmittedCurrent && (
                    <div className="bg-gray-50/80 dark:bg-gray-750/80 p-5 sm:p-8 border-t border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-4">
                        <div className="flex items-center mb-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mr-3">
                                <span className="text-blue-500">💡</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">答案解析</h3>
                        </div>
                        <div className="ml-11">
                            <p className="font-mono text-base sm:text-lg mb-4 text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 inline-block px-3 py-1 rounded-lg">
                                正确答案: {Array.isArray(correctAnswer) ? correctAnswer.join(', ') : (currentQ.type === 'judge' ? (String(correctAnswer) === '1' ? '正确' : '错误') : correctAnswer)}
                            </p>
                            <div className="prose prose-sm sm:prose-base prose-blue dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed [overflow-wrap:anywhere]">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ node, ...props }: any) => <p style={{ whiteSpace: 'pre-wrap', marginTop: 0, marginBottom: '0.25rem' }} {...props} />
                                    }}
                                >
                                    {(currentQ.parse || "暂无详细解析内容。").replace(/\n/g, '\n\n')}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="flex gap-3 pb-8">
                <button
                    onClick={() => {
                        if (currentIndex > 0) {
                            setCurrentIndex(currentIndex - 1)
                        }
                    }}
                    disabled={currentIndex === 0}
                    className="flex-1 flex justify-center items-center px-4 py-4 sm:py-3 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                    <FiArrowLeft className="mr-2" /> <span className="hidden sm:inline">上一题</span>
                </button>

                {isShowMode && !showAnswerForQ[currentQ.id] ? (
                    <button
                        onClick={handleSubmitSingleAnswer}
                        disabled={!myAnswer || (Array.isArray(myAnswer) && myAnswer.length === 0)}
                        className="flex-[2] flex justify-center items-center px-6 py-4 sm:py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg disabled:shadow-none"
                    >
                        确认答案
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        className={`flex-[2] flex justify-center items-center px-6 py-4 sm:py-3 font-bold rounded-2xl transition-all shadow-md hover:shadow-lg ${currentIndex < questions.length - 1
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                            : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                    >
                        {currentIndex < questions.length - 1 ? (
                            <><span>下一题</span> <FiArrowRight className="ml-2" /></>
                        ) : (
                            <>交卷查看结果 <FiCheckCircle className="ml-2" /></>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}
