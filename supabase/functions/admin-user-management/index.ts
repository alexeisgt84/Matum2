import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

class HttpError extends Error {
  status: number;
  details?: string | null;

  constructor(status: number, message: string, details: string | null = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError(401, 'Sesión no encontrada. Por favor, inicia sesión nuevamente.');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token || token.split('.').length !== 3) {
      throw new HttpError(401, 'Sesión inválida o expirada. Por favor, cierra sesión e inicia sesión nuevamente.');
    }

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

    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !adminUser) {
      console.error("Auth Error:", authError);
      throw new HttpError(401, 'Tu sesión ha expirado. Por favor, cierra sesión e inicia sesión nuevamente.');
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
      throw new HttpError(403, 'No se pudo verificar el rol de administrador.');
    }

    if (profile?.role !== 'admin') {
      console.warn("User is not admin:", profile?.role);
      throw new HttpError(403, 'Acceso denegado: solo los administradores pueden realizar esta acción.');
    }

    const { action, userId, password } = await req.json();

    if (!userId) throw new HttpError(400, 'El ID de usuario es obligatorio.');

    let result;

    if (action === 'delete_user') {
      // 1. Eliminar de auth.users (esto también debería activar cascada si está configurado,
      // pero por si acaso eliminamos del perfil también si no hay cascada)
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteAuthError) throw new HttpError(deleteAuthError.status || 400, deleteAuthError.message);

      // 2. Eliminar de la tabla pública por si acaso no hay disparadores
      await supabaseAdmin.from('users').delete().eq('id', userId);

      result = { message: 'Usuario eliminado correctamente' };

    } else if (action === 'change_password') {
      if (typeof password !== 'string' || password.length < 6) {
        throw new HttpError(400, 'La contraseña debe tener al menos 6 caracteres.');
      }

      const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      );

      if (updateError) {
        console.error("Update Password Error:", updateError);
        throw new HttpError(updateError.status || 400, updateError.message || 'No se pudo actualizar la contraseña.');
      }
      result = { message: 'Contraseña actualizada correctamente', user: data.user };

    } else {
      throw new HttpError(400, 'Acción no válida.');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error("Admin Management Error:", error?.message || error);
    const status = typeof error?.status === 'number' && error.status >= 400 ? error.status : 400;
    return new Response(JSON.stringify({
      error: error?.message || 'Error inesperado en la gestión de usuarios.',
      details: error?.details || error?.hint || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status
    });
  }
});
