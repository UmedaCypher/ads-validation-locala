import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Link from 'next/link'

import Header from '@/components/Header'
import Card from '@/components/Card'
import CreateProjectForm from '@/components/CreateProjectForm'
import { signOutAction, createProjectAction } from '@/app/actions'

export const dynamic = 'force-dynamic';

export default async function Home() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center bg-slate-50">
        <h1 className="text-4xl font-bold text-brand-dark-blue">Bienvenue sur l&apos;outil de validation</h1>
        <p className="mt-2 text-lg text-slate-600">Veuillez vous connecter pour accéder à votre tableau de bord.</p>
        <Link href="/login" className="px-6 py-3 mt-8 text-lg font-semibold text-white transition-opacity bg-brand-dark-blue rounded-lg shadow-sm hover:bg-opacity-90">
          Se connecter
        </Link>
      </div>
    )
  }

  const [
    { data: profile },
    { data: projects, error: projectsError }
  ] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('projects').select('*').order('created_at', { ascending: false })
  ]);
  
  if (projectsError) {
    console.error("Erreur lors de la récupération des projets:", projectsError);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-5xl p-8 mx-auto">
        <Header user={user} userRole={profile?.role || null} handleSignOut={signOutAction} />
        
        <div className="mt-8 space-y-8">
          <Card title="Créer un nouveau projet">
            <CreateProjectForm handleCreateProject={createProjectAction} />
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
                  <p>Vous n&apos;avez pas encore de projet. Créez-en un ci-dessus !</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
