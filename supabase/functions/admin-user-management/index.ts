import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No Authorization header');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !adminUser) {
      console.error("Auth Error:", authError);
      throw new Error('Unauthorized');
    }

    console.log("Admin User attempting action:", adminUser.id);

    // Verificar si el usuario es realmente admin en la tabla de perfiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (profileError) {
      console.error("Profile Query Error:", profileError);
      throw new Error('Could not verify admin status');
    }

    if (profile?.role !== 'admin') {
      console.warn("User is not admin:", profile?.role);
      throw new Error('Access forbidden: Admins only');
    }

    const { action, userId, password } = await req.json();

    if (!userId) throw new Error('User ID is required');

    let result;

    if (action === 'delete_user') {
      // 1. Eliminar de auth.users (esto también debería activar cascada si está configurado, 
      // pero por si acaso eliminamos del perfil también si no hay cascada)
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteAuthError) throw deleteAuthError;

      // 2. Eliminar de la tabla pública por si acaso no hay disparadores
      await supabaseAdmin.from('users').delete().eq('id', userId);
      
      result = { message: 'Usuario eliminado correctamente' };

    } else if (action === 'change_password') {
      if (!password) throw new Error('Password is required');

      const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: password }
      );

      if (updateError) throw updateError;
      result = { message: 'Contraseña actualizada correctamente', user: data.user };

    } else {
      throw new Error('Invalid action');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error("Admin Management Error:", error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.details || error.hint || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
