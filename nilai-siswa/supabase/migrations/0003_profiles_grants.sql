-- Rapikan izin tabel profiles: anonim tidak boleh menyentuhnya sama sekali,
-- pengguna yang sudah masuk hanya boleh membaca/mengubah profilnya sendiri.
revoke all on table public.profiles from anon;
grant select, insert, update on table public.profiles to authenticated;
