-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run 하세요. (한 번만 실행하면 돼요)

-- 1) 일정/여행지/멤버/사진 정보를 담는 표
create table if not exists public.docs (
  col  text  not null,          -- 'events' | 'trips' | 'members' | 'photos' | 'meta'
  id   text  not null,
  data jsonb not null default '{}'::jsonb,
  primary key (col, id)
);

-- 2) 로그인 없이 링크만 있으면 읽고 쓸 수 있게 (셋이서만 쓰는 용도)
alter table public.docs enable row level security;

create policy "docs: anyone can read"   on public.docs for select to anon, authenticated using (true);
create policy "docs: anyone can insert" on public.docs for insert to anon, authenticated with check (true);
create policy "docs: anyone can update" on public.docs for update to anon, authenticated using (true) with check (true);
create policy "docs: anyone can delete" on public.docs for delete to anon, authenticated using (true);

-- 3) 변경이 실시간으로 다른 사람 화면에 반영되도록
alter publication supabase_realtime add table public.docs;

-- 4) 사진 저장소 (공개 읽기 버킷)
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "photos: anyone can read"   on storage.objects for select to anon, authenticated using (bucket_id = 'photos');
create policy "photos: anyone can upload" on storage.objects for insert to anon, authenticated with check (bucket_id = 'photos');
create policy "photos: anyone can delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'photos');
