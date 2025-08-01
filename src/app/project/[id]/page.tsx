
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { deleteCreativeGroup } from '@/app/actions';
import UploadForm from '@/components/UploadForm';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // --- NOUVELLE CORRECTION : Approche plus robuste avec gestion d'erreurs ---

  // 1. Authentifier l'utilisateur et vérifier les erreurs
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error("Erreur d'authentification Supabase:", userError.message);
  }
  // Log pour vérifier si l'utilisateur est bien connecté côté serveur
  console.log("Utilisateur authentifié (ID):", user ? user.id : 'Aucun utilisateur connecté.');

  // 2. Récupérer le projet
  const projectId = params.id;
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select()
    .eq('id', projectId)
    .single();

  if (projectError) {
    console.error(`Erreur lors de la récupération du projet (${projectId}):`, projectError.message);
  }
  if (!project) {
    console.log(`Projet avec ID ${projectId} non trouvé. Affichage de la page 404.`);
    notFound();
  }

  // 3. Récupérer les groupes et leurs créations associées
  const { data: creativeGroups, error: groupsError } = await supabase
    .from('creative_groups')
    .select('*, creatives(*)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  
  if (groupsError) {
    console.error("Erreur lors de la récupération des groupes de créations:", groupsError.message);
  }
  // Log pour vérifier si des groupes sont trouvés
  console.log("Nombre de groupes trouvés:", creativeGroups ? creativeGroups.length : 0);

  // 4. Récupérer le rôle de l'utilisateur (si l'utilisateur existe)
  let userRole = 'client';
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error("Erreur lors de la récupération du profil utilisateur:", profileError.message);
    }
    if (profile) {
      userRole = profile.role;
    }
  }
  // Log pour vérifier le rôle final de l'utilisateur
  console.log("Rôle de l'utilisateur:", userRole);
  // --- FIN DE LA CORRECTION ---

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl p-8 mx-auto">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          &larr; Retour au Tableau de Bord
        </Link>

        <div className="mt-4">
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-lg text-gray-500">{project.client_name}</p>
        </div>

        <div className="mt-8 space-y-6">
          <UploadForm projectId={projectId} />

          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Créations</h2>
            <div className="space-y-4">
              {creativeGroups && creativeGroups.length > 0 ? (
                creativeGroups.map(group => {
                  const groupCreatives = group.creatives || [];
                  if (groupCreatives.length === 0) return null;

                  const latestVersion = [...groupCreatives].sort((a, b) => b.version - a.version)[0];
                  if (!latestVersion) return null;

                  return (
                    <div key={group.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <Link href={`/creative/${latestVersion.id}`} className="flex items-center flex-grow transition-opacity hover:opacity-75">
                        <div>
                          <h3 className="font-semibold text-gray-800">{group.name}</h3>
                          <p className="text-sm text-gray-500">
                            Dernière version : v{latestVersion.version} - <span className="font-medium">{latestVersion.status}</span>
                          </p>
                        </div>
                        {latestVersion.file_url && (
                          <div className="w-24 h-16 ml-auto overflow-hidden bg-gray-100 rounded-md">
                            {latestVersion.file_url.endsWith('.mp4') ? (
                              <video src={latestVersion.file_url} muted playsInline className="object-cover w-full h-full" />
                            ) : (
                              <img src={latestVersion.file_url} alt={group.name} className="object-cover w-full h-full" />
                            )}
                          </div>
                        )}
                      </Link>

                      {(userRole === 'interne' || userRole === 'admin') && (
                        <form action={deleteCreativeGroup.bind(null, group.id, projectId)} className="ml-4 flex-shrink-0">
                          <button type="submit" className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-100 rounded-full hover:bg-red-200">
                            Supprimer
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center text-gray-500">
                  <p>Aucune création pour ce projet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
