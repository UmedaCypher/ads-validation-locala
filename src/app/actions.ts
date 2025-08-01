'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation' // Ajout de l'import pour redirect

// --- NOUVELLES ACTIONS AJOUTÉES ---

/**
 * Déconnecte l'utilisateur et le redirige vers la page de connexion.
 */
export async function signOutAction() {
  const supabase = createServerActionClient({ cookies: () => cookies() });
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Crée un nouveau projet.
 */
export async function createProjectAction(formData: FormData) {
  const name = formData.get('name') as string;
  const client_name = formData.get('client_name') as string;

  if (!name || !client_name) {
    return { error: 'Le nom du projet et du client sont requis.' };
  }

  const supabase = createServerActionClient({ cookies: () => cookies() });
  const { error } = await supabase.from('projects').insert({ name, client_name });

  if (error) {
    console.error('ERREUR SUPABASE (createProjectAction):', error);
    return { error: 'Une erreur est survenue lors de la création du projet.' };
  }

  revalidatePath('/');
  return { success: true };
}


// --- VOS ACTIONS EXISTANTES (CONSERVÉES ET STANDARDISÉES) ---

/**
 * Ajoute un nouveau commentaire à une création.
 */
export async function addComment(creativeId: string, userId: string, formData: FormData) {
  const supabase = createServerActionClient({ cookies: () => cookies() })
  const text_content = formData.get('commentText') as string;
  
  if (!text_content) {
    return { error: 'Le texte du commentaire ne peut pas être vide.' };
  }

  const position_x = formData.get('position_x') ? Number(formData.get('position_x')) : null;
  const position_y = formData.get('position_y') ? Number(formData.get('position_y')) : null;

  const { data, error } = await supabase.from('comments').insert({
    creative_id: creativeId,
    user_id: userId,
    text_content,
    position_x,
    position_y,
  }).select().single();

  if (error) {
    console.error('Erreur Supabase (addComment):', error);
    return { error: error.message };
  }
  
  revalidatePath(`/creative/${creativeId}`);
  return { data };
}

/**
 * Met à jour le statut d'une création.
 */
export async function updateCreativeStatus(creativeId: number, status: string) {
  const supabase = createServerActionClient({ cookies: () => cookies() })
  const { error } = await supabase.from('creatives').update({ status: status }).eq('id', creativeId)

  if (error) {
    console.error('Erreur Supabase (updateCreativeStatus):', error);
    return { error: error.message };
  }

  revalidatePath(`/creative/${creativeId}`);
  return { success: true };
}

/**
 * Marque un commentaire comme résolu ou non résolu.
 */
export async function toggleCommentResolved(commentId: number, isResolved: boolean, creativeId: string) {
  const supabase = createServerActionClient({ cookies: () => cookies() })
  const { data, error } = await supabase.from('comments').update({ is_resolved: isResolved }).eq('id', commentId).select().single();

  if (error) return { error: error.message };

  revalidatePath(`/creative/${creativeId}`);
  return { data };
}

/**
 * Supprime un commentaire.
 */
export async function deleteComment(commentId: number, creativeId: string) {
  const supabase = createServerActionClient({ cookies: () => cookies() })
  const { data, error } = await supabase.from('comments').delete().eq('id', commentId).select().single();
  
  if (error) return { error: error.message };

  revalidatePath(`/creative/${creativeId}`);
  return { data };
}

/**
 * Met à jour la position d'un commentaire localisé sur une création.
 */
export async function updateCommentPosition(commentId: number, x: number, y: number, creativeId: string) {
  const supabase = createServerActionClient({ cookies: () => cookies() })
  await supabase.from('comments').update({ position_x: x, position_y: y }).eq('id', commentId);
  revalidatePath(`/creative/${creativeId}`);
}


/**
 * Met à jour le nom complet d'un utilisateur.
 */
export async function updateUserProfile(userId: string, formData: FormData) {
  const supabase = createServerActionClient({ cookies: () => cookies() });
  const fullName = formData.get('fullName') as string;

  if (!fullName) {
    return { error: 'Le nom ne peut pas être vide.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/account'); // Rafraîchit la page du compte
  return { success: true };
}



/**
 * Supprime un groupe de créations et toutes les versions associées.
 */
export async function deleteCreativeGroup(groupId: number, projectId: string) {
  const supabase = createServerActionClient({ cookies: () => cookies() });
  
  const { error } = await supabase
    .from('creative_groups')
    .delete()
    .eq('id', groupId);

  if (error) {
    console.error('Erreur lors de la suppression du groupe de créations:', error);
    return { error: error.message };
  }

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}


/**
 * Met à jour le rôle d'un utilisateur (action réservée aux admins).
 */
export async function updateUserRole(userId: string, newRole: string) {
  const supabase = createServerActionClient({ cookies: () => cookies() });
  
  // On vérifie que le rôle est valide
  if (!['client', 'interne', 'admin'].includes(newRole)) {
    return { error: 'Rôle non valide.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) {
    console.error('Erreur lors de la mise à jour du rôle:', error);
    return { error: error.message };
  }

  revalidatePath('/admin/users');
  return { success: true };
}
