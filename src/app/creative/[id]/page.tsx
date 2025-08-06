'use client'
// src/app/creative/[id]/page.tsx

// --- MODIFICATION 1 : Changer l'importation ---
import { createBrowserClient } from '@supabase/ssr';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useState, MouseEvent, FormEvent, useRef, ChangeEvent } from 'react';
import { User } from '@supabase/supabase-js';
import { addComment, toggleCommentResolved, deleteComment, updateCommentPosition, updateCreativeStatus } from '@/app/actions';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

// --- Types (inchangés) ---
type Creative = { id: number; file_url: string; version: number; status: string; creative_groups: { id: number; name: string; project_id: number; } | null; };
type Profile = { id: string; role: string; full_name: string | null; };
type Comment = {
  id: number; created_at: string; text_content: string; user_id: string;
  position_x: number | null; position_y: number | null; is_resolved: boolean;
  profiles: { full_name: string | null } | null;
};
type CreativeVersion = { id: number; version: number; };

// --- MODIFICATION 2 : Créer le client ici, une seule fois. ---
// C'est plus performant et évite des rendus inutiles.
const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Composant Principal ---
export default function CreativePage() {
  const params = useParams();
  const router = useRouter();
  const creativeId = params.id as string;
  // La ligne de création du client est déplacée en dehors du composant.

  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [creative, setCreative] = useState<Creative | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [allVersions, setAllVersions] = useState<CreativeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState<{ x: number, y: number } | null>(null);
  const [draggingPin, setDraggingPin] = useState<number | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) setUserProfile(profile as Profile);
      }

      const { data: creativeData } = await supabase.from('creatives').select('*, creative_groups(id, name, project_id)').eq('id', creativeId).single();
      if (!creativeData) { router.push('/'); return; }
      setCreative(creativeData as Creative);

      if (creativeData.creative_groups?.id) {
        const { data: versionsData } = await supabase.from('creatives').select('id, version').eq('creative_group_id', creativeData.creative_groups.id).order('version', { ascending: true });
        if (versionsData) setAllVersions(versionsData);
      }

      const { data: commentsData } = await supabase.from('comments').select('*, profiles(full_name)').eq('creative_id', creativeId).order('created_at', { ascending: true });
      if (commentsData) setComments(commentsData as Comment[]);
      
      setLoading(false);
    };
    if (creativeId) fetchData();
  }, [creativeId, router]); // 'supabase' a été retiré des dépendances car il est maintenant stable (défini hors du composant)

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !userProfile) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const result = await addComment(creativeId, user.id, formData);

    if (result?.data) {
      const newCommentWithProfile = { ...result.data, profiles: { full_name: userProfile.full_name } };
      setComments(prev => [...prev, newCommentWithProfile as Comment]);
    } else if (result?.error) {
      alert(`Erreur : ${result.error}`);
    }
    form.reset();
    setNewComment(null);
  };
  
  const handleToggleResolved = async (comment: Comment) => {
    const result = await toggleCommentResolved(comment.id, !comment.is_resolved, creativeId);
    if (result?.data) {
        setComments(prev => prev.map(c => c.id === result.data.id ? result.data as Comment : c));
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    const result = await deleteComment(commentId, creativeId);
    if (result?.data) {
        setComments(prev => prev.filter(c => c.id !== result.data.id));
    }
  };

  const handleImageClick = (e: MouseEvent<HTMLDivElement>) => {
    if (newComment || draggingPin) return;
    const target = e.target as HTMLElement;
    // Clic autorisé uniquement sur l'image elle-même, pas sur les épingles
    if (!imageContainerRef.current?.contains(target) || target.tagName !== 'IMG') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setNewComment({ x, y });
  };
  
  const handleDragStart = (commentId: number, e: MouseEvent) => {
    e.stopPropagation();
    if(user?.id === comments.find(c => c.id === commentId)?.user_id) {
        setDraggingPin(commentId);
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (draggingPin === null || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setComments(prev => prev.map(c => c.id === draggingPin ? { ...c, position_x: x, position_y: y } : c));
  };
  
  const handleMouseUp = async () => {
    if (draggingPin === null) return;
    const commentToUpdate = comments.find(c => c.id === draggingPin);
    if (commentToUpdate?.position_x && commentToUpdate?.position_y) {
      await updateCommentPosition(draggingPin, commentToUpdate.position_x, commentToUpdate.position_y, creativeId);
    }
    setDraggingPin(null);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!creative) return;
    const result = await updateCreativeStatus(creative.id, newStatus);
    if (result.success) {
        setCreative(prev => prev ? { ...prev, status: newStatus } : null);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-50">Chargement...</div>;
  if (!creative) return null;

  const isVideo = creative.file_url.endsWith('.mp4');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Validé': return 'bg-green-100 text-green-800 border-green-200';
      case 'Modifications demandées': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Attente client': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 md:flex-row" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <main className="relative flex items-center justify-center flex-1 p-4 overflow-hidden bg-gray-800 md:p-8">
        {isVideo ? (
          <video controls autoPlay src={creative.file_url} className="object-contain w-full h-full rounded-lg" />
        ) : (
          <div ref={imageContainerRef} className="relative w-full h-full cursor-crosshair" onClick={handleImageClick}>
            <img 
              src={creative.file_url} 
              alt={`Création ${creative.id}`} 
              className="object-contain w-full h-full" 
            />
            
            {comments.filter(c => c.position_x != null).map(comment => (
              <div 
                key={`pin-${comment.id}`} 
                className={`absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 border-2 border-white rounded-full group shadow-lg ${comment.is_resolved ? 'bg-green-500' : 'bg-red-500'} ${comment.user_id === user?.id ? 'cursor-grab' : 'cursor-default'}`} 
                style={{ left: `${comment.position_x}%`, top: `${comment.position_y}%`, zIndex: draggingPin === comment.id ? 10 : 1 }}
                onMouseDown={(e) => handleDragStart(comment.id, e)}
              >
                <div className="absolute hidden p-2 text-sm text-white bg-gray-900 rounded-md -top-2 left-1/2 -translate-x-1/2 -translate-y-full group-hover:block whitespace-nowrap">
                  {comment.text_content}
                </div>
              </div>
            ))}
            
            {newComment && (
              <div className="absolute p-2 bg-white rounded-lg shadow-xl" style={{ left: `${newComment.x}%`, top: `${newComment.y}%`, zIndex: 20 }}>
                <form onSubmit={handleCommentSubmit}>
                  <input type="hidden" name="position_x" value={newComment.x} />
                  <input type="hidden" name="position_y" value={newComment.y} />
                  <textarea name="commentText" className="w-full p-1 text-sm border rounded-md" placeholder="Votre retour..." rows={2} required autoFocus />
                  <div className="flex justify-end gap-2 mt-1">
                      <button type="button" onClick={() => setNewComment(null)} className="px-2 py-1 text-xs text-gray-600">Annuler</button>
                      <button type="submit" className="px-2 py-1 text-xs font-semibold text-white bg-blue-600 rounded-md">Envoyer</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

      <aside className="flex flex-col w-full h-screen p-6 bg-white border-l border-gray-200 md:w-96">
        <div className="flex-shrink-0">
          <Link href={`/project/${creative?.creative_groups?.project_id}`} className="text-sm text-blue-600 hover:underline">
            &larr; Retour au projet
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{creative?.creative_groups?.name}</h1>
          <div className="flex items-center gap-4 mt-2">
            {/* --- SÉLECTEUR DE VERSION --- */}
            <div className="relative inline-block text-left group">
              <div className="flex items-center cursor-pointer">
                <p className="text-sm text-gray-500">Version {creative.version}</p>
                {allVersions.length > 1 && <ChevronDownIcon className="w-4 h-4 ml-1 text-gray-400" />}
              </div>
              {allVersions.length > 1 && (
                <div className="absolute left-0 z-10 hidden w-40 mt-2 origin-top-left bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 group-hover:block">
                  <div className="py-1">
                    {allVersions.map(v => (
                      <Link key={v.id} href={`/creative/${v.id}`} className={`block px-4 py-2 text-sm ${v.id === creative.id ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}`}>
                        Version {v.version}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* --- SÉLECTEUR DE STATUT (CORRIGÉ) --- */}
            {(userProfile?.role === 'interne' || userProfile?.role === 'admin') ? (
              <select
                value={creative.status}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => handleStatusUpdate(e.target.value)}
                className={`font-bold p-1 rounded-md text-xs border ${getStatusColor(creative.status)} focus:ring-2 focus:ring-blue-500`}
              >
                <option value="En relecture">En relecture</option>
                <option value="Attente client">Attente client</option>
                <option value="Modifications demandées">Modifications demandées</option>
                <option value="Validé">Validé</option>
              </select>
            ) : (
              <span className={`font-bold p-1 rounded-md text-xs ${getStatusColor(creative.status)}`}>
                {creative.status}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 mt-4 overflow-y-auto space-y-4">
          {comments.length > 0 ? (
            comments.map(comment => (
              <div key={comment.id} className={`p-3 text-sm rounded-lg transition-colors ${comment.is_resolved ? 'bg-green-50 text-gray-500' : 'bg-gray-100 text-gray-800'}`}>
                <p className={comment.is_resolved ? 'line-through' : ''}>{comment.text_content}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-400">
                    Par {comment.profiles?.full_name || 'Anonyme'}
                    , {formatDistanceToNow(new Date(comment.created_at), { locale: fr, addSuffix: true })}
                  </p>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      title="Marquer comme résolu"
                      checked={comment.is_resolved} 
                      onChange={() => handleToggleResolved(comment)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                    />
                    {comment.user_id === user?.id && (
                      <button onClick={() => handleDeleteComment(comment.id)} className="font-bold text-red-400 hover:text-red-600 transition-colors" title="Supprimer le commentaire">
                        &times;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="py-10 text-sm text-center text-gray-400">Aucun commentaire pour le moment.</p>
          )}
        </div>

        <div className="flex-shrink-0 pt-6 mt-auto border-t">
          <form onSubmit={handleCommentSubmit}>
            <textarea 
              name="commentText"
              className="w-full p-2 text-sm border rounded-md focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Laisser un commentaire général..."
              rows={3}
              required
            ></textarea>
            <button type="submit" className="w-full px-4 py-2 mt-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              Envoyer
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}