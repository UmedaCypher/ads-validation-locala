'use client'; // <-- La directive est ici, en toute première ligne.

import { useState, useTransition } from 'react';
import { updateUserRole } from '@/app/actions'; // On importe l'action depuis le fichier central

export default function RoleSelector({ userId, currentRole }: { userId: string, currentRole: string }) {
  const [role, setRole] = useState(currentRole);
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (newRole: string) => {
    startTransition(async () => {
      setRole(newRole);
      const result = await updateUserRole(userId, newRole);
      if (result?.error) {
        console.error(result.error);
        // En cas d'erreur, on revient au rôle initial
        setRole(currentRole);
      }
    });
  };

  return (
    <select
      value={role}
      onChange={(e) => handleRoleChange(e.target.value)}
      disabled={isPending}
      className={`p-1 text-sm border rounded-md border-slate-300 focus:ring-blue-500 ${isPending ? 'opacity-50' : ''}`}
    >
      <option value="client">Client</option>
      <option value="interne">Interne</option>
      <option value="admin">Admin</option>
    </select>
  );
}
