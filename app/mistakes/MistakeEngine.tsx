'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FiCheckCircle, FiArrowRight, FiArrowLeft, FiClock, FiTrash2 } from 'react-icons/fi'

const safeParse = (val: any, fallback: any) => {
    if (val === null || val === undefined) return fallback;
    if (typeof val !== 'string') return val;
    try {
        return JSON.parse(val);
    } catch (e) {
        return val;
    }
}

export default function MistakeEngine({ initialMistakes, userId }: { initialMistakes: any[], userId: string }) {
    const [questions, setQuestions] = useState(initialMistakes)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | string[]>>({})
    const [showAnswer, setShowAnswer] = useState(false)
    const [isCorrectCurrent, setIsCorrectCurrent] = useState<boolean | null>(null)

    const supabase = createClient()

    if (questions.length === 0) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">该组错题已清空</h2>
                <p className="text-gray-500">所有的重练都回答正确了，请刷新页面或返回首页。</p>
            </div>
        )
    }

    const currentQ = questions[currentIndex]

    const handleSelectOption = (value: string) => {
        if (showAnswer) return

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

    const handleSubmitAnswer = async () => {
        setShowAnswer(true)

        const userAnswer = selectedAnswers[currentQ.id]
        const parsedAnswer = safeParse(currentQ.answer, '');
        const isCorrect = Array.isArray(userAnswer)
            ? JSON.stringify([...userAnswer].sort()) === JSON.stringify((parsedAnswer || []).sort())
            : userAnswer === parsedAnswer

        setIsCorrectCurrent(isCorrect)

        if (isCorrect) {
            // Remove from mistakes
            await supabase.from('user_mistakes').delete().eq('id', currentQ.mistake_id)
        }
    }

    const handleNext = () => {
        // If was correct, it's removed from local list
        if (isCorrectCurrent) {
            const newQs = questions.filter(q => q.id !== currentQ.id)
            setQuestions(newQs)
            if (currentIndex >= newQs.length) {
                setCurrentIndex(Math.max(0, newQs.length - 1))
            }
        } else {
            if (currentIndex < questions.length - 1) {
                setCurrentIndex(currentIndex + 1)
            }
        }

        setShowAnswer(false)
        setIsCorrectCurrent(null)
    }

    const options = safeParse(currentQ.options, []);
    const correctAnswer = safeParse(currentQ.answer, '');
    const myAnswer = selectedAnswers[currentQ.id]
    const isMultiple = currentQ.type === 'multiple'

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                    <FiClock className="mr-2" /> 错题进度：{currentIndex + 1} / {questions.length}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
                <div className="p-6 sm:p-8">
                    <div className="flex items-start mb-6">
                        <span className="shrink-0 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs font-bold px-3 py-1 rounded-md mr-3 uppercase mt-1 flex items-center">
                            {currentQ.type === 'multiple' ? '多选' : currentQ.type === 'judge' ? '判断' : '单选'}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-relaxed">
                            {currentQ.title}
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {options.map((opt: any) => {
                            const checked = isMultiple
                                ? ((myAnswer as string[]) || []).includes(opt.value)
                                : myAnswer === opt.value

                            let stateClass = "border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600 cursor-pointer"

                            if (checked) {
                                stateClass = "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 cursor-pointer"
                            }

                            if (showAnswer) {
                                const isOptCorrect = isMultiple
                                    ? (correctAnswer as string[]).includes(opt.value)
                                    : correctAnswer === opt.value

                                if (isOptCorrect) {
                                    stateClass = "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 cursor-default"
                                } else if (checked && !isOptCorrect) {
                                    stateClass = "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 cursor-default"
                                } else {
                                    stateClass = "border-gray-200 dark:border-gray-700 opacity-50 cursor-default"
                                }
                            }

                            return (
                                <div
                                    key={opt.value}
                                    onClick={() => handleSelectOption(opt.value)}
                                    className={`border-2 rounded-xl p-4 transition-all duration-200 flex items-center ${stateClass}`}
                                >
                                    <div className={`w-6 h-6 rounded flex items-center justify-center mr-4 border ${checked ? 'bg-current border-current' : 'border-gray-300 dark:border-gray-600'}`}>
                                        {checked && <FiCheckCircle className="w-4 h-4 text-white" />}
                                    </div>
                                    <span className="font-medium text-lg min-w-[2rem]">{opt.label}.</span>
                                    <span className="text-gray-700 dark:text-gray-300 leading-relaxed break-words">{opt.value}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {showAnswer && (
                    <div className="bg-gray-50 dark:bg-gray-750 p-6 sm:p-8 border-t border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-4">
                        <div className="flex items-center mb-4">
                            {isCorrectCurrent ? (
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                                    <FiCheckCircle className="mr-1" /> 回答正确，已移出错题本
                                </span>
                            ) : (
                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                                    <FiTrash2 className="mr-1" /> 回答依然错误，保留在错题本中
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center mb-3">
                            <span className="text-blue-500 mr-2">🎯</span> 答案解析
                        </h3>
                        <p className="font-mono text-xl mb-4 text-green-600 dark:text-green-400 font-bold">正确答案: {Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer}</p>
                        <div className="prose prose-blue dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                            {currentQ.parse || "暂无详细解析"}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center">
                <button
                    onClick={() => {
                        if (currentIndex > 0) {
                            setCurrentIndex(currentIndex - 1)
                            setShowAnswer(false)
                        }
                    }}
                    disabled={currentIndex === 0 || showAnswer} // Disable back while showing answer to prevent logic conflict
                    className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FiArrowLeft className="mr-2" /> 上一题
                </button>

                {!showAnswer ? (
                    <button
                        onClick={handleSubmitAnswer}
                        disabled={!myAnswer || (Array.isArray(myAnswer) && myAnswer.length === 0)}
                        className="flex items-center px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                    >
                        提交答案
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        className="flex items-center px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow"
                    >
                        下一题 <FiArrowRight className="ml-2" />
                    </button>
                )}
            </div>
        </div>
    )
}
