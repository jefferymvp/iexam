import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ExamEngine from './ExamEngine'
import { FiAlertCircle, FiSearch } from 'react-icons/fi'
import Link from 'next/link'

export default async function ExamPage({ searchParams }: { searchParams: { orgId?: string, bankId?: string, type?: string, mode?: string, count?: string, keyword?: string, parseFilter?: string } }) {
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
    const keyword = tmpParams.keyword || '';
    const parseFilter = tmpParams.parseFilter || 'all';

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

    // Fetch user role from profiles
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    const userRole = profile?.role || 'user'

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

    // Fetch questions - fetch all matching, then shuffle randomly and slice
    let query = supabase.from('questions').select('*').eq('bank_id', bankId)

    if (type !== 'all') {
        query = query.eq('type', type)
    }

    if (keyword) {
        query = query.ilike('title', `%${keyword}%`)
    }

    if (parseFilter === 'with') {
        query = query.not('parse', 'is', null).neq('parse', '')
    } else if (parseFilter === 'without') {
        query = query.or('parse.is.null,parse.eq.""')
    }

    const { data: allQuestions } = await query;

    if (!allQuestions || allQuestions.length === 0) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">题库中暂无题目</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">管理员上传题目后方可开始练习。</p>
                <Link href="/" className="text-blue-600 hover:text-blue-500 font-medium">返回首页</Link>
            </div>
        )
    }

    // Fisher-Yates shuffle for random order
    const shuffled = [...allQuestions]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const questions = shuffled.slice(0, count)

    return <ExamEngine initialQuestions={questions} userId={user.id} mode={mode} userRole={userRole} />
}
