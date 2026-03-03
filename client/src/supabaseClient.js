import { createClient } from '@supabase/supabase-js'

// Substitua pelos seus dados reais do painel do Supabase
const supabaseUrl = 'https://xblafaojnpusvkbuyuib.supabase.co'
const supabaseAnonKey = 'sb_publishable_LYaRg2Nkmjnn2-YMttPJ3Q_UO7y_LMi'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)