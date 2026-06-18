-- Remote schema_migrations around the known drift gap
select version, name
from supabase_migrations.schema_migrations
where version::int between 238 and 272
order by version::int;
