import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import HomeClient from './HomeClient'

export default async function HomePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch organizations user belongs to
    const { data: orgs } = await supabase
        .from('organization_members')
        .select(`
            organization_id,
            organizations (
                id,
                name,
                allow_join
            )
        `)
        .eq('user_id', user.id)

    const userOrgs = orgs?.map((o: any) => o.organizations) || []

    return <HomeClient user={user} initialOrgs={userOrgs} />
}
