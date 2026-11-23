-- Koreksi alur 23 Nov 2026: satu rekomendasi aktif per evaluasi.
-- Baris lama tidak dihapus; hanya ditandai non-aktif agar riwayat tetap ada.
-- Snapshot yang sudah finalized menyimpan salinan sendiri sehingga tidak terpengaruh.

alter table public.development_recommendations
  add column if not exists is_active boolean not null default true;

with ranked as (
  select id,
    row_number() over (
      partition by evaluation_id
      order by (status = 'approved') desc, created_at desc, id desc
    ) as rn
  from public.development_recommendations
)
update public.development_recommendations as recommendation
set is_active = false
from ranked
where recommendation.id = ranked.id and ranked.rn > 1;

create unique index if not exists development_recommendations_one_active_per_evaluation
  on public.development_recommendations (evaluation_id) where is_active;

comment on column public.development_recommendations.is_active is
  'Baris aktif yang dipakai aplikasi. Satu evaluasi hanya boleh memiliki satu baris aktif.';
