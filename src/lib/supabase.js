import { createClient } from "@supabase/supabase-js";

/* .env.local 에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 를 넣으면 공유 저장소를 써요.
 * 없으면 null이고, 앱은 이 기기(브라우저) 저장소로 동작해요. */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;
export const PHOTO_BUCKET = "photos";
