create table if not exists private.gateway_nonces(nonce_hash text primary key,created_at timestamptz not null default now());
alter table private.gateway_nonces enable row level security;revoke all on private.gateway_nonces from public,anon,authenticated;
create or replace function public.automation_nonce(p_hash text) returns boolean language plpgsql security definer set search_path='' as $$
begin if p_hash !~ '^[a-f0-9]{64}$' then return false;end if;delete from private.gateway_nonces where created_at<now()-interval '10 minutes';insert into private.gateway_nonces values(p_hash,now()) on conflict do nothing;return found;end $$;
revoke all on function public.automation_nonce(text) from public,anon,authenticated;grant execute on function public.automation_nonce(text) to service_role;
create or replace function public.automation_claim(p_limit int default 2) returns setof public.automation_jobs language plpgsql security definer set search_path='' as $$
begin
 update public.automation_jobs set status='dead',last_error='LEASE_EXHAUSTED',finished_at=now() where attempts>=5 and status='running' and lease_until<now();
 return query update public.automation_jobs j set status='running',attempts=j.attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '90 seconds' where j.id in(select id from public.automation_jobs where attempts<5 and available_at<=now() and(status='pending' or(status='running' and lease_until<now())) order by created_at,id for update skip locked limit least(greatest(p_limit,1),5)) returning j.*;
end $$;
revoke all on function public.automation_claim(int) from public,anon,authenticated;grant execute on function public.automation_claim(int) to service_role;
create or replace function public.automation_finish(p_id uuid,p_lease uuid,p_success boolean,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.automation_jobs set status=case when p_success then 'done' when attempts>=5 then 'dead' else 'pending' end,finished_at=case when p_success or attempts>=5 then now() end,last_error=case when p_success then null else left(regexp_replace(coalesce(p_error,'FAILED'),'[^A-Z0-9_]','','g'),80) end,available_at=now()+make_interval(secs=>least(900,15*power(2,attempts)::int)),lease_until=null where id=p_id and lease_token=p_lease and status='running' and lease_until>now();
 if not found then raise exception 'STALE_LEASE';end if;
end $$;
revoke all on function public.automation_finish(uuid,uuid,boolean,text) from public,anon,authenticated;grant execute on function public.automation_finish(uuid,uuid,boolean,text) to service_role;
create or replace function public.telegram_complete_update(p_id uuid,p_lease uuid,p_update bigint,p_body jsonb) returns void language plpgsql security definer set search_path='' as $$
declare item public.telegram_updates;link public.telegram_links;
begin
 if not exists(select 1 from public.automation_jobs where id=p_id and lease_token=p_lease and kind='telegram' and(payload->>'update_id')::bigint=p_update and status='running' and lease_until>now() for update) then raise exception 'STALE_LEASE';end if;
 select * into item from public.telegram_updates where update_id=p_update;
 select * into link from public.telegram_links where telegram_id=item.telegram_id;
 if octet_length(p_body::text)>60000 then raise exception 'REPLY_TOO_LARGE';end if;
 insert into public.telegram_deliveries(dedupe_key,user_id,telegram_id,body) values('reply:'||p_update,link.user_id,item.telegram_id,p_body) on conflict do nothing;
 update public.telegram_updates set processed_at=now(),payload='{}' where update_id=p_update;
 perform public.automation_finish(p_id,p_lease,true,null);
end $$;
revoke all on function public.telegram_complete_update(uuid,uuid,bigint,jsonb) from public,anon,authenticated;grant execute on function public.telegram_complete_update(uuid,uuid,bigint,jsonb) to service_role;
create or replace function public.telegram_claim_deliveries() returns setof public.telegram_deliveries language plpgsql security definer set search_path='' as $$
declare item public.telegram_deliveries;link public.telegram_links;allowed boolean;
begin
 for item in select * from public.telegram_deliveries where attempts<5 and available_at<=now() and(status='pending' or(status='sending' and lease_until<now())) order by created_at for update skip locked limit 5 loop
 allowed=true;
 if item.user_id is not null then
 begin
 link=private.telegram_actor(item.telegram_id);
 if link.user_id<>item.user_id then allowed=false;end if;
 if item.body?'auth_fingerprint' and item.body->>'auth_fingerprint'<>md5(public.admin_identity()::text) then allowed=false;end if;
 if coalesce(item.body->>'permission','')<>'' and not private.has_permission(item.body->>'permission') then allowed=false;end if;
 if exists(select 1 from jsonb_array_elements_text(coalesce(item.body->'post_ids','[]')) ids where not exists(select 1 from public.posts p where p.id=ids::uuid and private.can_post(p,coalesce(nullif(item.body->>'permission',''),'posts.read')))) then allowed=false;end if;
 exception when others then allowed=false;
 end;
 end if;
 if not allowed then update public.telegram_deliveries set status='dead',body='{}',last_error='ACCESS_REVOKED' where id=item.id;continue;end if;
 update public.telegram_deliveries set status='sending',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '60 seconds' where id=item.id returning * into item;return next item;
 end loop;
 update public.telegram_deliveries set status='dead',body='{}',last_error='DELIVERY_EXHAUSTED' where attempts>=5 and status='sending' and lease_until<now();
end $$;
revoke all on function public.telegram_claim_deliveries() from public,anon,authenticated;grant execute on function public.telegram_claim_deliveries() to service_role;
create or replace function public.telegram_ack_delivery(p_id uuid,p_lease uuid,p_message_id bigint,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.telegram_deliveries set status=case when p_error is null then 'sent' when attempts>=5 then 'dead' else 'pending' end,message_id=p_message_id,sent_at=case when p_error is null then now() end,body=case when p_error is null or attempts>=5 then '{}'::jsonb else body end,last_error=case when p_error is null then null else 'TELEGRAM_DELIVERY_FAILED' end,available_at=now()+make_interval(secs=>least(900,15*power(2,attempts)::int)),lease_until=null where id=p_id and lease_token=p_lease and status='sending';
 if not found then raise exception 'STALE_LEASE';end if;
end $$;
revoke all on function public.telegram_ack_delivery(uuid,uuid,bigint,text) from public,anon,authenticated;grant execute on function public.telegram_ack_delivery(uuid,uuid,bigint,text) to service_role;
create or replace function private.ai_post_changed() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.ai_chunks where post_id=new.id;delete from private.ai_summary_cache where post_id=new.id;
 insert into public.automation_jobs(kind,dedupe_key,payload) values('index','index:'||new.id||':'||new.version,jsonb_build_object('post_id',new.id,'version',new.version)) on conflict do nothing;return new;
end $$;
revoke all on function private.ai_post_changed() from public,anon,authenticated;
drop trigger if exists ai_post_changed on public.posts;create trigger ai_post_changed after insert or update of title,excerpt,content,status,visibility,deleted_at,published_at,version on public.posts for each row execute function private.ai_post_changed();
create or replace function public.ai_replace_chunks(p_post uuid,p_version bigint,p_model text,p_chunks jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare post public.posts;chunk jsonb;dim int;profile_dim int;
begin
 select * into post from public.posts where id=p_post for update;
 if not found or post.status<>'published' or post.visibility<>'public' or post.deleted_at is not null or post.published_at>now() or post.version<>p_version then return false;end if;
 if jsonb_typeof(p_chunks)<>'array' or jsonb_array_length(p_chunks) not between 1 and 250 or length(p_model) not between 1 and 200 then raise exception 'INVALID_CHUNKS';end if;
 dim=jsonb_array_length(p_chunks->0->'embedding');
 insert into public.ai_embedding_profiles(model_id,dimensions) values(p_model,dim) on conflict do nothing;
 select dimensions into profile_dim from public.ai_embedding_profiles where model_id=p_model;
 if dim<>profile_dim then raise exception 'EMBEDDING_DIMENSION_MISMATCH';end if;
 delete from public.ai_chunks where post_id=p_post;
 for chunk in select value from jsonb_array_elements(p_chunks) loop
 if jsonb_array_length(chunk->'embedding')<>dim then raise exception 'EMBEDDING_DIMENSION_MISMATCH';end if;
 insert into public.ai_chunks(document_id,post_id,chunk_index,chunk_text,embedding,dimensions,embedding_model,content_hash,source_version,source_url,published_at)
 values(p_post,p_post,(chunk->>'index')::int,chunk->>'text',(chunk->'embedding')::text::extensions.vector,dim,p_model,chunk->>'hash',p_version,'/posts/'||post.slug,post.published_at);
 end loop;return true;
end $$;
revoke all on function public.ai_replace_chunks(uuid,bigint,text,jsonb) from public,anon,authenticated;grant execute on function public.ai_replace_chunks(uuid,bigint,text,jsonb) to service_role;
create or replace function public.ai_retrieve(p_query text,p_embedding extensions.vector default null,p_model text default '',p_post uuid default null,p_limit int default 6) returns jsonb language sql stable security definer set search_path='' as $$
 with eligible as materialized(select c.*,p.title from public.ai_chunks c join public.posts p on p.id=c.post_id where p.status='published' and p.visibility='public' and p.deleted_at is null and p.published_at<=now() and p.version=c.source_version and(p_post is null or p.id=p_post)),
 ranked as(select e.*,ts_rank_cd(search_vector,websearch_to_tsquery('simple',public.normalize_arabic(left(p_query,1000)))) keyword_score,case when p_embedding is not null and embedding_model=p_model and dimensions=extensions.vector_dims(p_embedding) then 1-(embedding operator(extensions.<=>) p_embedding) end semantic_score from eligible e),
 result as(select post_id,title,source_url,source_version,chunk_text,chunk_index,(case when keyword_score>0 then 1.0/(60+rank() over(order by keyword_score desc)) else 0 end + case when semantic_score>0.2 then 1.0/(60+rank() over(order by semantic_score desc nulls last)) else 0 end) score from ranked where keyword_score>0 or semantic_score>0.2 or p_post is not null)
 select coalesce(jsonb_agg(x),'[]') from(select * from result order by score desc,post_id,chunk_index limit least(greatest(p_limit,1),8))x
$$;
revoke all on function public.ai_retrieve(text,extensions.vector,text,uuid,int) from public,anon,authenticated;grant execute on function public.ai_retrieve(text,extensions.vector,text,uuid,int) to service_role;
create or replace function public.ai_reserve(p_id uuid,p_session text,p_visitor text,p_user uuid,p_provider text,p_model text,p_type text,p_tokens int) returns void language plpgsql security definer set search_path='' as $$
declare config public.ai_configuration;day_start timestamptz=date_trunc('day',now());
begin
 select * into config from public.ai_configuration where singleton for share;
 if not config.enabled then raise exception 'AI_DISABLED';end if;
 if p_session !~ '^[a-f0-9]{64}$' or p_visitor !~ '^[a-f0-9]{64}$' or p_tokens not between 1 and 100000 or length(p_model)>200 then raise exception 'INVALID_USAGE';end if;
 perform pg_advisory_xact_lock(hashtextextended('maystroon-ai-quota',0));
 if (select count(*) from public.ai_usage where created_at>=day_start)>=config.daily_requests or(select count(*) from public.ai_usage where created_at>=date_trunc('month',now()))>=config.monthly_requests or(select coalesce(sum(reserved_tokens),0) from public.ai_usage where created_at>=day_start)+p_tokens>config.daily_tokens or(select count(*) from public.ai_usage where session_hash=p_session and created_at>=day_start)>=config.session_requests or(p_user is null and(select count(*) from public.ai_usage where visitor_hash=p_visitor and created_at>=day_start)>=config.visitor_requests) or(p_user is not null and(select count(*) from public.ai_usage where user_id=p_user and created_at>=day_start)>=config.admin_requests) then raise exception 'AI_QUOTA_EXCEEDED';end if;
 insert into public.ai_usage(request_id,provider_id,model_id,request_type,user_id,session_hash,visitor_hash,reserved_tokens) values(p_id,p_provider,p_model,left(p_type,40),p_user,p_session,p_visitor,p_tokens);
end $$;
revoke all on function public.ai_reserve(uuid,text,text,uuid,text,text,text,int) from public,anon,authenticated;grant execute on function public.ai_reserve(uuid,text,text,uuid,text,text,text,int) to service_role;
create or replace function public.ai_cache_get(p_key text,p_post uuid,p_version bigint) returns jsonb language sql stable security definer set search_path='' as $$ select c.result from private.ai_summary_cache c join public.posts p on p.id=c.post_id where c.cache_key=p_key and p.id=p_post and p.version=p_version and p.version=c.source_version and c.expires_at>now() and p.status='published' and p.visibility='public' and p.deleted_at is null and p.published_at<=now() $$;
create or replace function public.ai_cache_put(p_key text,p_post uuid,p_version bigint,p_model text,p_result jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.posts where id=p_post and version=p_version and status='published' and visibility='public' and deleted_at is null and published_at<=now()) then
 insert into private.ai_summary_cache(cache_key,post_id,source_version,model_id,result) values(p_key,p_post,p_version,p_model,p_result) on conflict(cache_key) do update set result=excluded.result,expires_at=now()+interval '1 day';end if;
end $$;
revoke all on function public.ai_cache_get(text,uuid,bigint),public.ai_cache_put(text,uuid,bigint,text,jsonb) from public,anon,authenticated;grant execute on function public.ai_cache_get(text,uuid,bigint),public.ai_cache_put(text,uuid,bigint,text,jsonb) to service_role;
create or replace function public.ai_admin_settings(p_value jsonb,p_version bigint) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_permission('integrations.manage');
 if not private.allowed_keys(p_value,array['enabled','provider','model','embedding_model','streaming','max_output_tokens','daily_requests','monthly_requests','daily_tokens','session_requests','visitor_requests','admin_requests','allow_private_editorial','language']) then raise exception 'INVALID_SETTINGS';end if;
 update public.ai_configuration set enabled=(p_value->>'enabled')::boolean,provider=p_value->>'provider',model=left(p_value->>'model',200),embedding_model=left(p_value->>'embedding_model',200),streaming=(p_value->>'streaming')::boolean,max_output_tokens=(p_value->>'max_output_tokens')::int,daily_requests=(p_value->>'daily_requests')::int,monthly_requests=(p_value->>'monthly_requests')::int,daily_tokens=(p_value->>'daily_tokens')::bigint,session_requests=(p_value->>'session_requests')::int,visitor_requests=(p_value->>'visitor_requests')::int,admin_requests=(p_value->>'admin_requests')::int,allow_private_editorial=(p_value->>'allow_private_editorial')::boolean,language=p_value->>'language',version=version+1,updated_at=now() where singleton and version=p_version;
 if not found then raise exception 'VERSION_CONFLICT';end if;
 insert into public.audit_logs(actor_id,action,entity_type,metadata) values(auth.uid(),'INTEGRATION_CHANGED','ai',jsonb_build_object('version',p_version+1));
end $$;
revoke all on function public.ai_admin_settings(jsonb,bigint) from public,anon;grant execute on function public.ai_admin_settings(jsonb,bigint) to authenticated;
create or replace function public.ai_admin_overview(p_action text,p_page int default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.has_permission(case when p_action='usage' then 'analytics.read' else 'integrations.manage' end) then raise exception 'FORBIDDEN';end if;
 if p_page not between 1 and 10000 then raise exception 'INVALID_PAGE';end if;
 if p_action='settings' then return(select to_jsonb(c) from public.ai_configuration c where singleton);
 elsif p_action='usage' then return jsonb_build_object('rows',(select coalesce(jsonb_agg(x),'[]') from(select request_id,provider_id,model_id,request_type,input_tokens,output_tokens,token_accuracy,latency_ms,status,estimated_cost,created_at from public.ai_usage order by created_at desc limit 25 offset (p_page-1)*25)x),'total',(select count(*) from public.ai_usage));
 elsif p_action='knowledge' then return jsonb_build_object('profiles',(select coalesce(jsonb_agg(p),'[]') from public.ai_embedding_profiles p),'chunks',(select count(*) from public.ai_chunks),'jobs',(select coalesce(jsonb_agg(x),'[]') from(select id,kind,status,attempts,last_error,created_at from public.automation_jobs order by created_at desc limit 25 offset (p_page-1)*25)x));
 else raise exception 'INVALID_ACTION';end if;
end $$;
revoke all on function public.ai_admin_overview(text,int) from public,anon;grant execute on function public.ai_admin_overview(text,int) to authenticated;
create or replace function public.ai_reindex() returns int language plpgsql security definer set search_path='' as $$
declare n int;
begin
 perform private.require_permission('integrations.manage');
 insert into public.automation_jobs(kind,dedupe_key,payload) select 'index','index:'||id||':'||version,jsonb_build_object('post_id',id,'version',version) from public.posts where status='published' and visibility='public' and deleted_at is null and published_at<=now() on conflict(dedupe_key) do update set status='pending',attempts=0,available_at=now(),lease_token=null,lease_until=null where public.automation_jobs.status in ('done','dead');
 get diagnostics n=row_count;insert into public.audit_logs(actor_id,action,entity_type) values(auth.uid(),'AI_REINDEX_REQUESTED','ai');return n;
end $$;
revoke all on function public.ai_reindex() from public,anon;grant execute on function public.ai_reindex() to authenticated;
create or replace function private.telegram_notify() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.automation_jobs(kind,dedupe_key,payload) values('notification','notification:'||new.id,jsonb_build_object('notification_id',new.id)) on conflict do nothing;return new;
end $$;
revoke all on function private.telegram_notify() from public,anon,authenticated;
drop trigger if exists telegram_notify on public.admin_notifications;create trigger telegram_notify after insert on public.admin_notifications for each row execute function private.telegram_notify();
create or replace function public.automation_retention() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.telegram_updates where received_at<now()-interval '7 days';delete from private.telegram_states where expires_at<now();delete from private.telegram_link_tokens where expires_at<now()-interval '1 day';
 delete from public.telegram_deliveries where created_at<now()-interval '7 days';delete from public.ai_usage where created_at<now()-interval '90 days';delete from private.ai_summary_cache where expires_at<now();delete from public.automation_jobs where status in ('done','dead') and created_at<now()-interval '30 days';
end $$;
revoke all on function public.automation_retention() from public,anon,authenticated;grant execute on function public.automation_retention() to service_role;
notify pgrst,'reload schema';

create or replace function public.ai_editorial_source(p_post uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare post public.posts;
begin select * into post from public.posts where id=p_post and deleted_at is null;if not found or not private.can_post(post,'posts.update') then raise exception 'FORBIDDEN';end if;return jsonb_build_object('title',post.title,'content',post.content,'status',post.status,'visibility',post.visibility);end $$;
revoke all on function public.ai_editorial_source(uuid) from public,anon;grant execute on function public.ai_editorial_source(uuid) to authenticated;
create table if not exists public.ai_index_staging(job_id uuid not null references public.automation_jobs(id) on delete cascade,chunk_index int not null,chunk_text text not null,embedding extensions.vector not null,content_hash text not null,primary key(job_id,chunk_index));
alter table public.ai_index_staging enable row level security;revoke all on public.ai_index_staging from public,anon,authenticated;grant all on public.ai_index_staging to service_role;
create or replace function public.ai_stage_batch(p_id uuid,p_lease uuid,p_model text,p_chunks jsonb,p_done boolean) returns boolean language plpgsql security definer set search_path='' as $$
declare job public.automation_jobs;post public.posts;chunk jsonb;all_chunks jsonb;
begin
 select * into job from public.automation_jobs where id=p_id and lease_token=p_lease and kind='index' and status='running' and lease_until>now() for update;if not found then raise exception 'STALE_LEASE';end if;
 select * into post from public.posts where id=(job.payload->>'post_id')::uuid for update;
 if not found or post.status<>'published' or post.visibility<>'public' or post.deleted_at is not null or post.published_at>now() or post.version<>(job.payload->>'version')::bigint then delete from public.ai_index_staging where job_id=p_id;perform public.automation_finish(p_id,p_lease,true,null);return false;end if;
 if job.payload->>'model_key' is distinct from p_model then raise exception 'INDEX_MODEL_CHANGED';end if;
 if jsonb_array_length(p_chunks)>16 then raise exception 'BATCH_TOO_LARGE';end if;
 for chunk in select value from jsonb_array_elements(p_chunks) loop
 insert into public.ai_index_staging values(p_id,(chunk->>'index')::int,chunk->>'text',(chunk->'embedding')::text::extensions.vector,chunk->>'hash') on conflict(job_id,chunk_index) do update set chunk_text=excluded.chunk_text,embedding=excluded.embedding,content_hash=excluded.content_hash;end loop;
 if p_done then
 select jsonb_agg(jsonb_build_object('index',chunk_index,'text',chunk_text,'hash',content_hash,'embedding',embedding::text::jsonb) order by chunk_index) into all_chunks from public.ai_index_staging where job_id=p_id;
 if all_chunks is not null then perform public.ai_replace_chunks(post.id,post.version,p_model,all_chunks);end if;
 delete from public.ai_index_staging where job_id=p_id;perform public.automation_finish(p_id,p_lease,true,null);
 else
 update public.automation_jobs set status='pending',attempts=0,available_at=now(),lease_until=null,payload=jsonb_set(payload,'{cursor}',to_jsonb((select coalesce(max(chunk_index),-1)+1 from public.ai_index_staging where job_id=p_id))) where id=p_id;
 end if;return true;
end $$;
revoke all on function public.ai_stage_batch(uuid,uuid,text,jsonb,boolean) from public,anon,authenticated;grant execute on function public.ai_stage_batch(uuid,uuid,text,jsonb,boolean) to service_role;
create or replace function public.automation_defer(p_id uuid,p_lease uuid) returns void language plpgsql security definer set search_path='' as $$
begin update public.automation_jobs set status='pending',attempts=greatest(attempts-1,0),available_at=now()+interval '15 minutes',lease_until=null,last_error='UNCONFIGURED' where id=p_id and lease_token=p_lease and status='running' and lease_until>now();if not found then raise exception 'STALE_LEASE';end if;end $$;
revoke all on function public.automation_defer(uuid,uuid) from public,anon,authenticated;grant execute on function public.automation_defer(uuid,uuid) to service_role;

alter table public.admin_notifications add column if not exists context jsonb not null default '{}';
create or replace function private.control_notify() returns trigger language plpgsql security definer set search_path='' as $$
declare required text;link text;heading text;post public.posts;recipient record;
begin
 if tg_table_name='posts' then
 if new.status<>'review' or (tg_op='UPDATE' and old.status='review') then return new;end if;required='posts.publish';link='/admin/posts/'||new.id||'/edit';heading='تدوينة تنتظر المراجعة';post=new;
 elsif tg_table_name='comments' then
 if new.status<>'pending' then return new;end if;required='comments.moderate';link='/admin/comments';heading='تعليق ينتظر الموافقة';select * into post from public.posts where id=new.post_id;
 elsif tg_table_name='publishing_runs' then
 if new.status<>'failed' then return new;end if;required='posts.schedule';link='/admin/scheduled';heading='فشل نشر مجدول';select * into post from public.posts where id=new.post_id;
 else return new;end if;
 for recipient in select user_id,scope_mode,category_ids from public.admin_memberships where enabled loop
 if private.permission_scope_for(recipient.user_id,required) is not null and (private.permission_scope_for(recipient.user_id,required)='all' or post.created_by=recipient.user_id) and (recipient.scope_mode='all' or not exists(select 1 from public.post_categories pc where pc.post_id=post.id and not pc.category_id=any(recipient.category_ids))) then
 insert into public.admin_notifications(user_id,kind,title,href,priority,context) values(recipient.user_id,tg_table_name,heading,link,case when tg_table_name='publishing_runs' then 'high' else 'normal' end,jsonb_build_object('post_id',post.id,'comment_id',case when tg_table_name='comments' then new.id else null end));end if;end loop;return new;
end $$;
create or replace function public.automation_daily() returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.automation_retention();
 insert into public.automation_jobs(kind,dedupe_key,payload) select 'digest','digest:'||user_id||':'||(now() at time zone 'Asia/Aden')::date,jsonb_build_object('telegram_id',telegram_id) from public.telegram_links where enabled and(preferences->>'enabled')::boolean and(preferences->>'daily_digest')::boolean on conflict do nothing;
end $$;
revoke all on function public.automation_daily() from public,anon,authenticated;grant execute on function public.automation_daily() to service_role;
do $$begin if exists(select 1 from pg_namespace where nspname='cron') then perform cron.schedule('maystroon-automation-daily','0 17 * * *','select public.automation_daily();');end if;end $$;

create or replace function public.ai_index_prepare(p_id uuid,p_lease uuid,p_model text) returns int language plpgsql security definer set search_path='' as $$
declare job public.automation_jobs;
begin
 select * into job from public.automation_jobs where id=p_id and lease_token=p_lease and kind='index' and status='running' and lease_until>now() for update;if not found then raise exception 'STALE_LEASE';end if;
 if job.payload->>'model_key' is distinct from p_model then
 delete from public.ai_index_staging where job_id=p_id;
 update public.automation_jobs set payload=payload||jsonb_build_object('model_key',p_model,'cursor',0) where id=p_id;return 0;end if;
 return coalesce((job.payload->>'cursor')::int,0);
end $$;
revoke all on function public.ai_index_prepare(uuid,uuid,text) from public,anon,authenticated;grant execute on function public.ai_index_prepare(uuid,uuid,text) to service_role;

create or replace function private.automation_failed_notification() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='dead' and old.status<>'dead' and new.kind in ('index','telegram') then
 insert into public.admin_notifications(user_id,kind,title,href,priority,context) select user_id,'automation','فشل مهمة تكامل بعد المحاولات المحدودة','/admin/ai/knowledge','high',jsonb_build_object('job_id',new.id) from public.admin_memberships where enabled and private.permission_scope_for(user_id,'integrations.manage') is not null;
 end if;return new;
end $$;
revoke all on function private.automation_failed_notification() from public,anon,authenticated;
drop trigger if exists automation_failed_notification on public.automation_jobs;
create trigger automation_failed_notification after update of status on public.automation_jobs for each row execute function private.automation_failed_notification();
