-- SINILAI: penyimpanan dokumen milik pengguna untuk sinkronisasi web <-> HP.
--
-- Kelas akses: owner_scoped_private. Setiap baris dimiliki auth.uid() dan RLS
-- menolak pembacaan pengguna lain, sehingga kunci publik di peramban tidak dapat
-- membuka data nilai sekolah.
--
-- Satu tabel "records" dipakai untuk semua jenis data aplikasi (sekolah, kelas,
-- mata pelajaran, komponen penilaian, siswa, nilai, pengaturan). Isi tiap baris
-- disimpan sebagai jsonb apa adanya, sehingga penambahan kolom baru di aplikasi
-- tidak memerlukan migrasi database.

create table if not exists public.records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection text not null,
  id text not null,
  parent_id text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, collection, id)
);

create index if not exists records_user_collection_idx
  on public.records (user_id, collection);

create index if not exists records_user_updated_idx
  on public.records (user_id, updated_at);

alter table public.records enable row level security;

drop policy if exists "Pengguna membaca datanya sendiri" on public.records;
create policy "Pengguna membaca datanya sendiri"
  on public.records
  for select
  using (auth.uid() = user_id);

drop policy if exists "Pengguna menambah datanya sendiri" on public.records;
create policy "Pengguna menambah datanya sendiri"
  on public.records
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Pengguna mengubah datanya sendiri" on public.records;
create policy "Pengguna mengubah datanya sendiri"
  on public.records
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Pengguna menghapus datanya sendiri" on public.records;
create policy "Pengguna menghapus datanya sendiri"
  on public.records
  for delete
  using (auth.uid() = user_id);

-- Pengguna anonim tidak boleh menyentuh tabel ini sama sekali.
revoke all on table public.records from anon;
grant select, insert, update, delete on table public.records to authenticated;

-- Perubahan langsung dikirim ke perangkat lain yang sedang terbuka.
do $$
begin
  alter publication supabase_realtime add table public.records;
exception
  when duplicate_object then null;
end
$$;
