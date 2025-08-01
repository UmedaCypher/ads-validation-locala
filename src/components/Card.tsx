import React from 'react'

type Props = {
  title: string;
  children: React.ReactNode;
}

export default function Card({ title, children }: Props) {
  return (
    // On utilise une bordure gris clair (slate-200) et une ombre subtile
    <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
      {/* On applique la couleur bleu foncé (text-slate-900) pour le titre */}
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
      <div>
        {children}
      </div>
    </div>
  )
}