import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
    }

    const { project_id, file_url, group_name } = await request.json();

    if (!project_id || !file_url || !group_name) {
      return new NextResponse(JSON.stringify({ error: 'Données manquantes' }), { status: 400 });
    }

    // --- CORRECTION : Remplacer 'let' par 'const' ---
    const { data: existingGroup } = await supabase
      .from('creative_groups')
      .select('id')
      .eq('project_id', project_id)
      .eq('name', group_name)
      .single();

    let groupId: number;
    let newVersion: number = 1;

    if (existingGroup) {
      groupId = existingGroup.id;
      const { data: latestCreative, error: versionError } = await supabase
        .from('creatives')
        .select('version')
        .eq('creative_group_id', groupId)
        .order('version', { ascending: false })
        .limit(1)
        .single();
      
      if (versionError && versionError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw versionError;
      }
      if (latestCreative) {
        newVersion = latestCreative.version + 1;
      }

    } else {
      const { data: newGroup, error: newGroupError } = await supabase
        .from('creative_groups')
        .insert({ project_id: project_id, name: group_name })
        .select('id')
        .single();

      if (newGroupError) throw newGroupError;
      groupId = newGroup.id;
    }

    const { error: insertError } = await supabase
      .from('creatives')
      .insert({
        file_url: file_url,
        creative_group_id: groupId,
        version: newVersion,
        status: 'En relecture',
      });

    if (insertError) throw insertError;
    
    revalidatePath(`/project/${project_id}`);

    return NextResponse.json({ success: true, message: 'Création sauvegardée avec succès.' });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Une erreur inattendue est survenue";
    console.error('Erreur dans /api/save-creative:', error);
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}