import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ExamEngine from './ExamEngine'
import { FiAlertCircle } from 'react-icons/fi'
import Link from 'next/link'

export default async function ExamPage({ searchParams }: { searchParams: { orgId?: string, bankId?: string, type?: string, mode?: string, count?: string } }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const tmpParams = await searchParams;
    const orgId = tmpParams.orgId;
    const bankId = tmpParams.bankId; // required
    const type = tmpParams.type || 'all';
    const mode = tmpParams.mode || 'show';
    const count = parseInt(tmpParams.count as string) || 10;

    if (!orgId || !bankId) {
        redirect('/')
    }

    // Verify access to organization
    const { data: access } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .single()

    if (!access) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20 px-4">
                <FiAlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">无法访问权限</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">您不属于该组织或权限已被撤回。</p>
                <Link href="/" className="text-blue-600 hover:text-blue-500 font-medium">返回首页</Link>
            </div>
        )
    }

    // Next step: verify the bank is associated with the org and is active.
    const { data: bankAccess } = await supabase
        .from('organization_banks')
        .select('bank_id, question_banks!inner(is_active)')
        .eq('organization_id', orgId)
        .eq('bank_id', bankId)
        .eq('question_banks.is_active', true)
        .single()

    if (!bankAccess) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20 px-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">题库不可用</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">该题库未授权给本组织或已被管理员停用。</p>
                <Link href="/" className="text-blue-600 hover:text-blue-500 font-medium">返回首页</Link>
            </div>
        )
    }

    // Fetch questions
    // Note: using Postgres RPC or order by random() would be better for real random tests.
    let query = supabase.from('questions').select('*').eq('bank_id', bankId)

    if (type !== 'all') {
        query = query.eq('type', type)
    }

    // limit based on count
    query = query.limit(count)

    const { data: questions } = await query;

    if (!questions || questions.length === 0) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">题库中暂无题目</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">管理员上传题目后方可开始练习。</p>
                <Link href="/" className="text-blue-600 hover:text-blue-500 font-medium">返回首页</Link>
            </div>
        )
    }

    return <ExamEngine initialQuestions={questions} userId={user.id} mode={mode} />
}
