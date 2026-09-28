// ============================================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================================

const SUPABASE_URL = "https://sqmszafuoxmmegytcugz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_sHj4zxRBnCY4hNmgrx8JCQ_jdAS0ogt";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// E-mail que terá permissão para publicar novos ebooks
const ADMIN_EMAIL = "adminssitee@gmail.com"; 