-- Cleanup duplicate Slovenia marina naming (Portoroz vs Portorož).
delete from public.marinas
where country = 'Slovenia'
  and name = 'Marina Portoroz'
  and exists (
    select 1
    from public.marinas m2
    where m2.country = 'Slovenia'
      and m2.name = 'Marina Portorož'
  );
