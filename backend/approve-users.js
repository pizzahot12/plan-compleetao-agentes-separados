import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qrtiwmyxdzthecxqdpzo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydGl3bXl4ZHp0aGVjeHFkcHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY5MjM3OSwiZXhwIjoyMDg3MjY4Mzc5fQ._FftJGUThn2Pg06Mraluxb5XoWLhaWLOgnOo3Vd8U2Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runApproval() {
    console.log('Obteniendo usuarios de Google registrados...');
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    if (!users || users.length === 0) {
        console.log('No hay usuarios registrados aún.');
        return;
    }

    for (const user of users) {
        console.log(`\n🔍 Procesando: ${user.email} (ID: ${user.id})`);

        // Tratando de auto-crear y auto-aprobar su perfil
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split('@')[0],
            avatar: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
            is_approved: true // ¡LA MAGIA AQUI!
        });

        if (profileError) {
            console.error('❌ Error aprobando perfil:', profileError.message);
        } else {
            console.log('✅ ¡Perfil forzado, creado y APROBADO EXITOSAMENTE!');
        }
    }
}

runApproval();
