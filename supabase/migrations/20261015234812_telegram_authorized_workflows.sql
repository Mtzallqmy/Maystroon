create or replace function public.telegram_create_link(p_hash text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.actor_active(auth.uid()) or p_hash !~ '^[a-f0-9]{64}$' then raise exception 'FORBIDDEN' using errcode='42501';end if;
 delete from private.telegram_link_tokens where user_id=auth.uid();
 insert into private.telegram_link_tokens(token_hash,user_id,session_id,issued_at,expires_at) values(p_hash,auth.uid(),(auth.jwt()->>'session_id')::uuid,(auth.jwt()->>'iat')::bigint,now()+interval '5 minutes');
 insert into public.audit_logs(actor_id,action,entity_type) values(auth.uid(),'TELEGRAM_LINK_REQUESTED','telegram');
end $$;
revoke all on function public.telegram_create_link(text) from public,anon;grant execute on function public.telegram_create_link(text) to authenticated;
create or replace function public.telegram_unlink() returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.actor_active(auth.uid()) then raise exception 'FORBIDDEN';end if;
 delete from public.telegram_links where user_id=auth.uid();delete from private.telegram_link_tokens where user_id=auth.uid();delete from private.telegram_states where user_id=auth.uid();
 update public.telegram_deliveries set status='dead',body='{}',last_error='UNLINKED' where user_id=auth.uid() and status<>'sent';
 insert into public.audit_logs(actor_id,action,entity_type) values(auth.uid(),'TELEGRAM_UNLINKED','telegram');
end $$;
revoke all on function public.telegram_unlink() from public,anon;grant execute on function public.telegram_unlink() to authenticated;
create or replace function private.telegram_actor(p_telegram_id bigint) returns public.telegram_links language plpgsql security definer set search_path='' as $$
declare link public.telegram_links;
begin
 select * into link from public.telegram_links where telegram_id=p_telegram_id and enabled;
 if not found then raise exception 'TELEGRAM_NOT_LINKED' using errcode='42501';end if;
 perform set_config('request.jwt.claim.sub',link.user_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',link.user_id,'session_id',link.session_id,'iat',link.issued_at,'aal','aal1','role','authenticated')::text,true);
 -- No sensitive proof is ever delegated to Telegram.
 perform set_config('request.headers','{}',true);
 if not private.actor_active(link.user_id) then raise exception 'TELEGRAM_SESSION_EXPIRED' using errcode='42501';end if;
 return link;
end $$;
revoke all on function private.telegram_actor(bigint) from public,anon,authenticated;
create or replace function public.telegram_consume_link(p_hash text,p_telegram_id bigint) returns uuid language plpgsql security definer set search_path='' as $$
declare token private.telegram_link_tokens;link public.telegram_links;
begin
 if p_telegram_id<=0 then raise exception 'INVALID_LINK';end if;
 select * into token from private.telegram_link_tokens where token_hash=p_hash for update;
 if not found or token.expires_at<=now() or token.consumed_at is not null then raise exception 'INVALID_LINK';end if;
 perform set_config('request.jwt.claim.sub',token.user_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',token.user_id,'session_id',token.session_id,'iat',token.issued_at,'role','authenticated')::text,true);
 if not private.actor_active(token.user_id) then raise exception 'INVALID_LINK';end if;
 if exists(select 1 from public.telegram_links where telegram_id=p_telegram_id and user_id<>token.user_id) then raise exception 'TELEGRAM_ALREADY_LINKED';end if;
 insert into public.telegram_links(user_id,telegram_id,session_id,issued_at) values(token.user_id,p_telegram_id,token.session_id,token.issued_at)
 on conflict(user_id) do update set telegram_id=excluded.telegram_id,session_id=excluded.session_id,issued_at=excluded.issued_at,linked_at=now(),enabled=true;
 update private.telegram_link_tokens set consumed_at=now() where token_hash=p_hash;
 insert into public.audit_logs(actor_id,action,entity_type) values(token.user_id,'TELEGRAM_LINKED','telegram');return token.user_id;
end $$;
revoke all on function public.telegram_consume_link(text,bigint) from public,anon,authenticated;grant execute on function public.telegram_consume_link(text,bigint) to service_role;
create or replace function public.telegram_ingest(p_update_id bigint,p_telegram_id bigint,p_payload jsonb) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_update_id<0 or p_telegram_id<=0 or octet_length(p_payload::text)>100000 then raise exception 'INVALID_UPDATE';end if;
 insert into public.telegram_updates(update_id,telegram_id,payload) values(p_update_id,p_telegram_id,p_payload) on conflict do nothing;
 if not found then return false;end if;
 insert into public.automation_jobs(kind,dedupe_key,payload) values('telegram','tg:'||p_update_id,jsonb_build_object('update_id',p_update_id,'telegram_id',p_telegram_id)) on conflict do nothing;return true;
end $$;
revoke all on function public.telegram_ingest(bigint,bigint,jsonb) from public,anon,authenticated;grant execute on function public.telegram_ingest(bigint,bigint,jsonb) to service_role;
create or replace function public.telegram_read(p_telegram_id bigint,p_action text,p_args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare link public.telegram_links;post public.posts;result jsonb;
begin
 link=private.telegram_actor(p_telegram_id);
 if p_action='identity' then return public.admin_identity()||jsonb_build_object('user_id',link.user_id,'permission_fingerprint',md5(public.admin_identity()::text),'state',coalesce((select state from private.telegram_states where user_id=link.user_id and expires_at>now()),'{}'::jsonb),'state_version',coalesce((select version from private.telegram_states where user_id=link.user_id),0));
 elsif p_action='posts' then
 if not private.has_permission('posts.read') then raise exception 'FORBIDDEN';end if;
 return coalesce((select jsonb_agg(x) from(select p.id,p.title,p.slug,p.excerpt,p.status,p.version,p.scheduled_at,p.author_id,p.primary_category_id from public.posts p where p.deleted_at is null and private.can_post(p,'posts.read') and (coalesce(p_args->>'status','')='' or p.status=p_args->>'status') and (coalesce(p_args->>'q','')='' or p.title ilike '%'||left(p_args->>'q',100)||'%') and (not p_args?'author_id' or p.author_id=(p_args->>'author_id')::uuid) and (not p_args?'category_id' or exists(select 1 from public.post_categories where post_id=p.id and category_id=(p_args->>'category_id')::uuid)) order by p.updated_at desc,p.id limit 10 offset least(greatest(coalesce((p_args->>'page')::int,1),1),1000)*10-10)x),'[]');
 elsif p_action='post' then select * into post from public.posts where id=(p_args->>'id')::uuid and deleted_at is null;if not found or not private.can_post(post,'posts.read') then raise exception 'FORBIDDEN';end if;return to_jsonb(post);
 elsif p_action='ai_source' then select * into post from public.posts where id=(p_args->>'id')::uuid and deleted_at is null;if not found or not private.can_post(post,'posts.update') then raise exception 'FORBIDDEN';end if;return jsonb_build_object('title',post.title,'content',post.content,'status',post.status,'visibility',post.visibility);
 elsif p_action='categories' then
 if not private.has_permission('posts.read') and not private.has_permission('posts.create') and not private.has_permission('categories.manage') then raise exception 'FORBIDDEN';end if;
 return coalesce((select jsonb_agg(x) from(select id,name from public.categories c where is_active and deleted_at is null and (exists(select 1 from public.admin_memberships a where a.user_id=link.user_id and a.scope_mode='all') or exists(select 1 from public.admin_memberships a where a.user_id=link.user_id and c.id=any(a.category_ids))) order by sort_order limit 30)x),'[]');
 elsif p_action='authors' then
 if not private.has_permission('posts.create') and not private.has_permission('posts.read') then raise exception 'FORBIDDEN';end if;
 return coalesce((select jsonb_agg(x) from(select id,display_name from public.authors where is_active and deleted_at is null order by sort_order limit 30)x),'[]');
 elsif p_action='comments' then
 if not private.has_permission('comments.moderate') then raise exception 'FORBIDDEN';end if;
 return coalesce((select jsonb_agg(x) from(select c.id,c.body,c.guest_name,c.created_at,p.title,p.slug,p.id post_id from public.comments c join public.posts p on p.id=c.post_id where c.status='pending' and c.deleted_at is null and private.can_post(p,'comments.moderate') order by c.created_at limit 10)x),'[]');
 elsif p_action='dashboard' then return public.admin_dashboard();
 elsif p_action='notifications' then
 if not private.has_permission('notifications.read') then raise exception 'FORBIDDEN';end if;
 return coalesce((select jsonb_agg(x) from(select id,title,href,priority from public.admin_notifications where user_id=link.user_id and archived_at is null order by created_at desc limit 10)x),'[]');
 elsif p_action='comment' then
 if not private.has_permission('comments.moderate') then raise exception 'FORBIDDEN';end if;
 select jsonb_build_object('id',c.id,'body',c.body,'guest_name',c.guest_name,'created_at',c.created_at,'title',p.title,'slug',p.slug,'post_id',p.id) into result from public.comments c join public.posts p on p.id=c.post_id where c.id=(p_args->>'id')::uuid and c.status='pending' and c.deleted_at is null and private.can_post(p,'comments.moderate');if result is null then raise exception 'NOT_FOUND';end if;return result;
 elsif p_action='preferences' then return link.preferences;
 else raise exception 'INVALID_ACTION';end if;
end $$;
revoke all on function public.telegram_read(bigint,text,jsonb) from public,anon,authenticated;grant execute on function public.telegram_read(bigint,text,jsonb) to service_role;
create or replace function public.telegram_execute(p_telegram_id bigint,p_update_id bigint,p_command text,p_args jsonb,p_state jsonb default null,p_state_version bigint default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare link public.telegram_links;result jsonb;current_state private.telegram_states;
begin
 link=private.telegram_actor(p_telegram_id);
 if not exists(select 1 from public.telegram_updates where update_id=p_update_id and telegram_id=p_telegram_id) then raise exception 'INVALID_UPDATE';end if;
 perform pg_advisory_xact_lock(hashtextextended('telegram:'||link.user_id,0));
 select r.result into result from private.telegram_receipts r where update_id=p_update_id and command_key=p_command;
 if found then
 if p_command in ('save','transition') and not exists(select 1 from public.posts p where p.id=(result->>'id')::uuid and private.can_post(p,'posts.read')) then raise exception 'FORBIDDEN';end if;
 return result;end if;
 select * into current_state from private.telegram_states where user_id=link.user_id for update;
 if p_state_version is not null and coalesce(current_state.version,0)<>p_state_version then raise exception 'STATE_CONFLICT';end if;
 if p_command='save' then result=to_jsonb(public.cms_save_post(nullif(p_args->>'id','')::uuid,p_args->'patch',nullif(p_args->>'version','')::bigint));
 elsif p_command='transition' then result=to_jsonb(public.cms_transition_post((p_args->>'id')::uuid,p_args->>'action',(p_args->>'version')::bigint,nullif(p_args->>'scheduled_at','')::timestamptz));
 elsif p_command='comment' then perform public.cms_moderate_comment((p_args->>'id')::uuid,p_args->>'action');result='{"ok":true}';
 elsif p_command='media' then result=to_jsonb(public.cms_register_media(p_args));
 elsif p_command='preferences' then
 if not private.allowed_keys(p_args,array['enabled','kinds','priorities','quiet_start','quiet_end','daily_digest']) or jsonb_typeof(p_args->'enabled')<>'boolean' or jsonb_typeof(p_args->'kinds')<>'array' or jsonb_typeof(p_args->'priorities')<>'array' or jsonb_typeof(p_args->'daily_digest')<>'boolean' or coalesce((p_args->>'quiet_start')::int,0) not between 0 and 23 or coalesce((p_args->>'quiet_end')::int,0) not between 0 and 23 then raise exception 'INVALID_PREFERENCES';end if;
 update public.telegram_links set preferences=p_args where user_id=link.user_id;result='{"ok":true}';
 elsif p_command='state' then result='{"ok":true}';
 else raise exception 'INVALID_COMMAND';end if;
 if p_state is not null then
 if p_command='save' and p_state?'draft' then p_state=jsonb_set(jsonb_set(jsonb_set(p_state,'{draft,id}',result->'id'),'{draft,version}',result->'version'),'{draft,slug}',result->'slug');end if;
 if octet_length(p_state::text)>300000 then raise exception 'STATE_TOO_LARGE';end if;
 insert into private.telegram_states(user_id,state) values(link.user_id,p_state) on conflict(user_id) do update set state=excluded.state,version=private.telegram_states.version+1,updated_at=now(),expires_at=now()+interval '7 days';
 end if;
 insert into private.telegram_receipts values(p_update_id,p_command,link.user_id,result,now());
 insert into public.audit_logs(actor_id,action,entity_type,metadata) values(link.user_id,'TELEGRAM_COMMAND','telegram',jsonb_build_object('command',p_command,'update_id',p_update_id));
 return result;
end $$;
revoke all on function public.telegram_execute(bigint,bigint,text,jsonb,jsonb,bigint) from public,anon,authenticated;grant execute on function public.telegram_execute(bigint,bigint,text,jsonb,jsonb,bigint) to service_role;
