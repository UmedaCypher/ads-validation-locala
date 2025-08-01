// Ce fichier est un Composant Serveur.

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import RoleSelector from '@/components/RoleSelector';

export const dynamic = 'force-dynamic';

// On définit un type pour les données de notre vue `user_profiles`
type UserProfileView = {
  id: string;
  role: string;
  full_name: string | null;
  email: string | null;
}

export default async function AdminUsersPage() {
  const supabase = createServerComponentClient({ cookies: () => cookies() });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'interne') {
    notFound();
  }

  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('*');
  
  if (error) {
    console.error("Erreur de chargement des utilisateurs:", error);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-4xl p-8 mx-auto">
        <Link href="/" className="text-sm text-blue-600 hover:underline">&larr; Retour au Tableau de Bord</Link>
        <div className="p-6 mt-4 bg-white border rounded-lg shadow-sm border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Utilisateurs</h1>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500">
              <thead className="text-xs uppercase bg-slate-50 text-slate-700">
                <tr>
                  <th scope="col" className="px-6 py-3">Email</th>
                  <th scope="col" className="px-6 py-3">Nom</th>
                  <th scope="col" className="px-6 py-3">Rôle</th>
                </tr>
              </thead>
              <tbody>
                {/* On utilise notre type UserProfileView ici */}
                {users?.map((u: UserProfileView) => (
                  <tr key={u.id} className="bg-white border-b hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{u.email || 'Email non trouvé'}</td>
                    <td className="px-6 py-4">{u.full_name || '-'}</td>
                    <td className="px-6 py-4">
                      <RoleSelector userId={u.id} currentRole={u.role} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
