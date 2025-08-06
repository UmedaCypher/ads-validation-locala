// src/components/CreateProjectForm.tsx

// --- MODIFICATION : Mettre à jour le type de retour de la fonction ---
type Props = {
  handleCreateProject: (formData: FormData) => Promise<{ success: boolean; error?: string } | { success?: undefined; error: string } | void>;
}

export default function CreateProjectForm({ handleCreateProject }: Props) {
  // Le reste du composant ne change pas
  return (
    <form action={handleCreateProject} className="flex flex-col gap-4">
      <div>
        <label htmlFor="name" className="block mb-1 text-sm font-medium text-gray-700">Nom du projet</label>
        <input 
          type="text" 
          name="name" 
          id="name" 
          required 
          className="block w-full p-2 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
        />
      </div>
      <div>
        <label htmlFor="client_name" className="block mb-1 text-sm font-medium text-gray-700">Nom du client</label>
        <input 
          type="text" 
          name="client_name" 
          id="client_name" 
          required 
          className="block w-full p-2 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
        />
      </div>
      <button 
        type="submit" 
        className="self-start px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Créer le projet
      </button>
    </form>
  )
}