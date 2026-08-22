import { createClient } from '@supabase/supabase-js'

// INSTRUÇÕES PARA O BANCO DE DADOS (SUPABASE):
// 1. Crie uma conta/projeto no Supabase (https://supabase.com)
// 2. Vá em 'Project Settings' > 'API' e copie a URL e a chave 'anon/public'
// 3. Substitua as chaves abaixo com os seus dados
// 4. No SQL Editor do Supabase, crie uma tabela chamada 'servidores_atualizacao' com as seguintes colunas:
//    - id (uuid, primary key)
//    - nome (text)
//    - cpf (text)
//    - ure (text)
//    - dependentes (text)
//    - observacoes (text)
//    - atualizado_em (timestamp)

const supabaseUrl = 'https://ldmuedmayykjofujfdmh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkbXVlZG1heXlram9mdWpmZG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MjYxMDIsImV4cCI6MjEwMzAwMjEwMn0.ndE4g36nNiBMkNjRcifGQasEz9deRjYtg338Y_54m1k'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
