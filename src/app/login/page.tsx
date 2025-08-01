// src/app/login/page.tsx
'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    // --- DÉBUT DE LA CORRECTION ---
    // On définit une fonction asynchrone à l'intérieur de useEffect
    const getSessionAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/') // Redirige vers l'accueil si l'utilisateur est déjà connecté
      }
    }

    // On appelle cette fonction
    getSessionAndRedirect()
    // --- FIN DE LA CORRECTION ---

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.refresh() // On utilise router.refresh() pour recharger les données du serveur
        router.push('/') // Redirige vers l'accueil après une connexion réussie
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [supabase, router])


  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ width: '320px' }}>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
          localization={{
            variables: {
              sign_in: { email_label: 'Adresse email', password_label: 'Mot de passe', button_label: 'Se connecter', social_provider_text: 'Se connecter avec {{provider}}', link_text: 'Déjà un compte ? Connectez-vous' },
              sign_up: { email_label: 'Adresse email', password_label: 'Mot de passe', button_label: 'S\'inscrire', social_provider_text: 'S\'inscrire avec {{provider}}', link_text: 'Pas encore de compte ? Inscrivez-vous' },
              forgotten_password: { email_label: 'Adresse email', button_label: 'Envoyer les instructions', link_text: 'Mot de passe oublié ?' },
            },
          }}
        />
      </div>
    </div>
  )
}