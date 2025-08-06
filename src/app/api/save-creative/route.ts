import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  // --- MODIFICATION: Utilisation du nouveau client serveur de @supabase/ssr ---
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
    // Check if the user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { project_id, file_url, group_name } = await request.json();

    if (!project_id || !file_url || !group_name) {
      return new NextResponse(JSON.stringify({ error: 'Missing required data' }), { status: 400 });
    }

    // 1. Look for an existing creative group
    let { data: existingGroup } = await supabase
      .from('creative_groups')
      .select('id')
      .eq('project_id', project_id)
      .eq('name', group_name)
      .single();

    let groupId: number;
    let newVersion: number = 1;

    if (existingGroup) {
      // 2a. If the group exists, find the latest version number
      groupId = existingGroup.id;
      const { data: latestCreative, error: versionError } = await supabase
        .from('creatives')
        .select('version')
        .eq('creative_group_id', groupId)
        .order('version', { ascending: false })
        .limit(1)
        .single();
      
      // Ignore the error if no rows are found, which is expected for a new group
      if (versionError && versionError.code !== 'PGRST116') {
        throw versionError;
      }
      if (latestCreative) {
        newVersion = latestCreative.version + 1;
      }

    } else {
      // 2b. If the group does not exist, create it
      const { data: newGroup, error: newGroupError } = await supabase
        .from('creative_groups')
        .insert({ project_id: project_id, name: group_name })
        .select('id')
        .single();

      if (newGroupError) throw newGroupError;
      groupId = newGroup.id;
    }

    // 3. Insert the new creative with the correct version and group ID
    const { error: insertError } = await supabase
      .from('creatives')
      .insert({
        file_url: file_url,
        creative_group_id: groupId,
        version: newVersion,
        status: 'En relecture', // Default status
      });

    if (insertError) throw insertError;

    // 4. Invalidate the project page cache to show the update immediately
    revalidatePath(`/project/${project_id}`);

    return NextResponse.json({ success: true, message: 'Creative saved successfully.' });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error('Error in /api/save-creative:', error);
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}