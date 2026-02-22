import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MistakeEngine from './MistakeEngine'
import { FiCheckCircle } from 'react-icons/fi'
import Link from 'next/link'

export default async function MistakesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch mistakes with their associated questions
    const { data: mistakesData } = await supabase
        .from('user_mistakes')
        .select(`
      id,
      question_id,
      questions (*)
    `)
        .eq('user_id', user.id)

    const mistakes = mistakesData?.map((m: any) => ({
        mistake_id: m.id,
        ...m.questions
    })) || []

    if (mistakes.length === 0) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                    <FiCheckCircle className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">太棒了！错题本是空的</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
                    您目前没有需要复习的错题，继续保持好成绩！可以选择一个组织去刷题。
                </p>
                <Link href="/" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                    去刷题
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-3xl p-8 sm:p-12 text-white shadow-xl">
                <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">
                    我的错题本
                </h1>
                <p className="text-red-100 text-lg sm:text-xl max-w-2xl">
                    目前收录了 {mistakes.length} 道错题，温故而知新，攻克弱点就在今天。
                </p>
            </div>

            <MistakeEngine initialMistakes={mistakes} userId={user.id} />
        </div>
    )
}
