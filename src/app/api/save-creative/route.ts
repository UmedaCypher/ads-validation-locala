import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { project_id, file_url, group_name } = await request.json()
  const supabase = createRouteHandlerClient({ cookies })

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // --- NOUVELLE LOGIQUE DE GROUPES ---

  // 1. Chercher si un groupe avec ce nom existe déjà pour ce projet
  let { data: existingGroup } = await supabase
    .from('creative_groups')
    .select('id')
    .eq('project_id', project_id)
    .eq('name', group_name)
    .single();

  // 2. Si le groupe n'existe pas, on le crée
  if (!existingGroup) {
    const { data: newGroup, error: createGroupError } = await supabase
      .from('creative_groups')
      .insert({ project_id, name: group_name })
      .select('id')
      .single();
    
    if (createGroupError) return NextResponse.json({ error: createGroupError.message }, { status: 500 });
    existingGroup = newGroup;
  }

  const groupId = existingGroup.id;

  // 3. Trouver la dernière version dans ce groupe
  const { data: latestCreative } = await supabase
    .from('creatives')
    .select('version')
    .eq('creative_group_id', groupId)
    .order('version', { ascending: false })
    .limit(1)
    .single();
  
  const newVersion = latestCreative ? latestCreative.version + 1 : 1;

  // 4. Insérer la nouvelle création (version) en la liant au groupe
  const { error: insertCreativeError } = await supabase.from('creatives').insert({
    creative_group_id: groupId,
    file_url: file_url,
    version: newVersion,
    status: 'En relecture',
  });

  if (insertCreativeError) {
    return NextResponse.json({ error: insertCreativeError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
