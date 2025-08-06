'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
// --- MODIFICATION 1 : Remplacer l'importation ---
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

type Props = {
  projectId: string;
};

// --- MODIFICATION 2 : Créer le client une seule fois ici ---
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UploadForm({ projectId }: Props) {
  // La création du client a été déplacée en dehors du composant.
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [groupName, setGroupName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file || !groupName) return;

    setIsUploading(true);
    setError(null);

    try {
      // Le reste de la logique est inchangé car l'API de Supabase est la même.
      const filePath = `public/project_${projectId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('creatives')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('creatives')
        .getPublicUrl(filePath);

      const publicUrl = data?.publicUrl;

      if (!publicUrl) {
        throw new Error("Impossible d'obtenir l'URL publique du fichier.");
      }

      const response = await fetch('/api/save-creative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          file_url: publicUrl,
          group_name: groupName,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Erreur lors de la sauvegarde.");
      }

      router.refresh();
      setFile(null);
      setGroupName('');
      const fileInput = document.getElementById('creative-file') as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Une erreur inattendue est survenue.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Ajouter une création / une nouvelle version
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-lg">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="groupName" className="block mb-1 text-sm font-medium text-slate-700">
            Nom de la création (ex: Banner 600x500)
          </label>
          <input
            id="groupName"
            type="text"
            value={groupName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setGroupName(e.target.value)}
            placeholder="Si le nom existe, une nouvelle version sera ajoutée."
            required
            className="block w-full p-2 text-slate-900 border rounded-md shadow-sm border-slate-300 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="creative-file" className="block mb-1 text-sm font-medium text-slate-700">
            Fichier
          </label>
          <input
            id="creative-file"
            name="creativeFile"
            type="file"
            required
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <button
          type="submit"
          className="self-start px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400"
          disabled={!file || !groupName || isUploading}
        >
          {isUploading ? "Upload en cours..." : "Uploader la création"}
        </button>
      </form>
    </div>
  );
}