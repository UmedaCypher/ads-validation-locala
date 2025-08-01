import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { deleteCreativeGroup } from '@/app/actions';
import UploadForm from '@/components/UploadForm';

export const dynamic = 'force-dynamic';

// L'interface ProjectPageProps a été supprimée.

type Creative = {
  id: string;
  file_url: string;
  version: number;
  status: string;
};

type CreativeGroup = {
  id: string;
  name: string;
  creatives: Creative[];
};

// Le type des props est maintenant défini "en ligne", directement ici.
// C'est la méthode la plus sûre pour éviter les conflits de types sur Vercel.
export default async function ProjectPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const { data: { user } } = await supabase.auth.getUser();
  const projectId = params.id;

  const { data: project } = await supabase
    .from('projects')
    .select()
    .eq('id', projectId)
    .single();

  if (!project) {
    notFound();
  }

  const { data: creativeGroups } = await supabase
    .from('creative_groups')
    .select('*, creatives(*)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  let userRole = 'client';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile) {
      userRole = profile.role;
    }
  }

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
                              <Image
                                src={latestVersion.file_url}
                                alt={group.name}
                                width={96}
                                height={64}
                                className="object-cover w-full h-full"
                              />
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
