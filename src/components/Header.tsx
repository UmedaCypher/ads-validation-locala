import { User } from '@supabase/supabase-js'
import Link from 'next/link'

type Props = {
  user: User | null;
  userRole: string | null; // Le rôle peut être null au début
  handleSignOut: () => Promise<void>;
}

export default function Header({ user, userRole, handleSignOut }: Props) {
  
  return (
    <header className="flex flex-col items-start justify-between pb-4 border-b md:flex-row md:items-center border-slate-200">
      
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tableau de Bord</h1>
        {user && <p className="text-slate-500">Bienvenue, {user.email}</p>}
      </div>
      <div className="flex items-center gap-4 mt-4 md:mt-0">
        {/* On affiche le lien Admin UNIQUEMENT si le rôle est 'admin' */}
        {userRole === 'admin' && (
          <Link href="/admin/users" className="text-sm font-semibold text-slate-600 hover:text-blue-600">
            Admin
          </Link>
        )}
        <Link href="/account" className="text-sm font-semibold text-slate-600 hover:text-blue-600">
          Mon Compte
        </Link>

        <form action={handleSignOut}>
          <button 
            type="submit" 
            className="px-4 py-2 text-sm font-semibold rounded-lg shadow-sm text-slate-700 bg-slate-100 hover:bg-slate-200"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </header>
  )
}