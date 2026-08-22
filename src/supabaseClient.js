import { createClient } from "@supabase/supabase-js";
 
const supabaseUrl = "https://eeyhumcgqcshzasaeqpu.supabase.co";
const supabaseKey = "sb_publishable_zA-xlz0i-jmg2YAToSwqcg_VIyo4txl";
 
export const supabase = createClient(supabaseUrl, supabaseKey);