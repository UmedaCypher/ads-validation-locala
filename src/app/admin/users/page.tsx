// Ce fichier est un Composant Serveur. Il ne doit PAS contenir 'use client'.

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import RoleSelector from '@/components/RoleSelector'; // On importe le composant client séparé

export const dynamic = 'force-dynamic';

// --- Composant Principal de la Page (Serveur) ---
export default async function AdminUsersPage() {
  const supabase = createServerComponentClient({ cookies: () => cookies() });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  // Sécurité : Seuls les admins et internes peuvent voir cette page
  if (profile?.role !== 'admin' && profile?.role !== 'interne') {
    notFound();
  }

  // --- CORRECTION FINALE ---
  // On interroge la nouvelle vue `user_profiles` qui contient déjà les données jointes.
  // C'est plus simple, plus robuste et cela va corriger l'erreur.
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
                {users?.map((u: any) => (
                  <tr key={u.id} className="bg-white border-b hover:bg-slate-50">
                    {/* On accède directement à `u.email` car la vue a aplati les données */}
                    <td className="px-6 py-4 font-medium text-slate-900">{u.email || 'Email non trouvé'}</td>
                    <td className="px-6 py-4">{u.full_name || '-'}</td>
                    <td className="px-6 py-4">
                      {/* On utilise le composant client importé ici */}
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
