
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import Header from '@/components/Header'
import Card from '@/components/Card'
import CreateProjectForm from '@/components/CreateProjectForm'

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = createServerComponentClient({ cookies: () => cookies() })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center bg-slate-50">
        <h1 className="text-4xl font-bold text-brand-dark-blue">Bienvenue sur l'outil de validation</h1>
        <p className="mt-2 text-lg text-slate-600">Veuillez vous connecter pour accéder à votre tableau de bord.</p>
        <Link href="/login" className="px-6 py-3 mt-8 text-lg font-semibold text-white transition-opacity bg-brand-dark-blue rounded-lg shadow-sm hover:bg-opacity-90">
          Se connecter
        </Link>
      </div>
    )
  }

  // On récupère le profil de l'utilisateur pour connaître son rôle
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (projectsError) {
    console.error("Erreur lors de la récupération des projets:", projectsError);
  }

  const handleSignOut = async () => {
    'use server'
    await createServerComponentClient({ cookies: () => cookies() }).auth.signOut()
    redirect('/login')
  }

  const createProject = async (formData: FormData) => {
    'use server'
    const name = formData.get('name') as string
    const client_name = formData.get('client_name') as string
    if (!name || !client_name) return

    const supabase = createServerComponentClient({ cookies: () => cookies() })
    const { error } = await supabase.from('projects').insert({ name, client_name })

    if (error) {
      console.error('ERREUR SUPABASE:', error)
      return
    }
    
    revalidatePath('/') 
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-5xl p-8 mx-auto">
        {/* On passe le rôle au Header */}
        <Header user={session.user} userRole={profile?.role || null} handleSignOut={handleSignOut} />
        
        <div className="mt-8 space-y-8">
          <Card title="Créer un nouveau projet">
            <CreateProjectForm handleCreateProject={createProject} />
          </Card>
          <Card title="Vos projets">
            <div className="space-y-4">
              {projects && projects.length > 0 ? (
                projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-4 transition-colors border rounded-lg border-slate-200 hover:bg-slate-50">
                    <div>
                      <h3 className="font-semibold text-slate-800">{project.name}</h3>
                      <p className="text-sm text-slate-500">{project.client_name}</p>
                    </div>
                    <Link 
                      href={`/project/${project.id}`} 
                      className="px-4 py-2 text-sm font-semibold transition-colors border rounded-lg shadow-sm text-slate-700 bg-white border-slate-300 hover:bg-slate-100"
                    >
                      Gérer
                    </Link>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-slate-500">
                  <p>Vous n'avez pas encore de projet. Créez-en un ci-dessus !</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
