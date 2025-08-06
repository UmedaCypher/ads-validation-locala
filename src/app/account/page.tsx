'use client'

// --- MODIFICATION 1 : Remplacer l'importation ---
import { createBrowserClient } from '@supabase/ssr'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useEffect, useState, FormEvent } from 'react'
import { updateUserProfile } from '@/app/actions'
import Link from 'next/link'

// --- MODIFICATION 2 : Créer le client une seule fois, en dehors du composant ---
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AccountPage() {
  // La création du client a été déplacée.
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [fullName, setFullName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        if (profile?.full_name) {
          setFullName(profile.full_name)
        }
      } else {
        router.push('/login')
      }
      setLoading(false)
    }
    fetchProfile()
  }, [router]) // --- MODIFICATION 3 : 'supabase' est retiré des dépendances car il est maintenant stable.

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return

    const formData = new FormData(event.currentTarget)
    const result = await updateUserProfile(user.id, formData)

    if (result.error) {
      setMessage(`Erreur : ${result.error}`)
    } else {
      setMessage('Profil mis à jour avec succès !')
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Chargement...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-xl p-8 mx-auto">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          &larr; Retour au Tableau de Bord
        </Link>
        <div className="p-6 mt-4 bg-white border rounded-lg shadow-sm border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">Mon Compte</h1>
          <p className="mt-2 text-slate-600">Mettez à jour vos informations personnelles.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="block w-full p-2 mt-1 rounded-md shadow-sm text-slate-500 bg-slate-100 border-slate-300"
              />
            </div>


            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">Nom complet</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="block w-full p-2 mt-1 border rounded-md shadow-sm text-slate-900 border-slate-300 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {message && <p className="text-sm text-center text-green-600">{message}</p>}
            <button
              type="submit"
              className="w-full px-4 py-2 font-bold text-white transition-opacity rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Mettre à jour
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}