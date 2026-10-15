
-- Global comment rules apply to direct server RPC calls too.
create or replace function public.submit_guest_comment(p_post_id uuid,p_parent_id uuid,p_name text,p_email text,p_body text) returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid=gen_random_uuid();parent public.comments;level int=0;policy jsonb;pub jsonb;published timestamptz;
begin
 select value into policy from public.site_settings where key='comments';select value into pub from public.site_settings where key='publishing';
 if coalesce((policy->>'enabled')::boolean,true)=false then raise exception 'COMMENTS_CLOSED';end if;
 if length(trim(p_body)) not between 1 and 5000 or length(trim(p_name)) not between 1 and 100 or p_body ~ '(?i)(https?://|<[^>]+>)' then raise exception 'INVALID_COMMENT';end if;
 if exists(select 1 from jsonb_array_elements_text(coalesce(policy->'blocked_words','[]')) w where strpos(lower(p_body),lower(w))>0) or exists(select 1 from jsonb_array_elements_text(coalesce(policy->'blocked_emails','[]')) e where lower(p_email)=lower(e)) then raise exception 'COMMENT_BLOCKED';end if;
 select published_at into published from public.posts where id=p_post_id and status='published' and visibility='public' and published_at<=now() and deleted_at is null and allow_comments and (comments_close_at is null or comments_close_at>now());
 if not found or (coalesce((pub->>'comments_close_days')::int,0)>0 and published<now()-make_interval(days=>(pub->>'comments_close_days')::int)) then raise exception 'COMMENTS_CLOSED';end if;
 if p_parent_id is not null then
 if not coalesce((policy->>'replies')::boolean,true) then raise exception 'REPLIES_CLOSED';end if;
 select * into parent from public.comments where id=p_parent_id and post_id=p_post_id and status='approved' and deleted_at is null;if not found or parent.depth>=coalesce((policy->>'max_depth')::int,3) then raise exception 'INVALID_PARENT';end if;level=parent.depth+1;end if;
 insert into public.comments(id,post_id,parent_id,depth,guest_name,body,status) values(new_id,p_post_id,p_parent_id,level,p_name,p_body,case when coalesce((policy->>'pre_moderation')::boolean,true) then 'pending' else 'approved' end);
 insert into private.comment_contacts(comment_id,email) values(new_id,nullif(p_email,''));return new_id;
end $$;
create or replace function public.comment_policy_server() returns jsonb language sql stable security definer set search_path='' as $$ select value from public.site_settings where key='comments' $$;
revoke all on function public.comment_policy_server() from public,anon,authenticated;grant execute on function public.comment_policy_server() to service_role;
-- Scoped aggregates never transfer raw visitor identifiers to an administrator.
create or replace function public.admin_dashboard() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;today date=(now() at time zone 'Asia/Aden')::date;
begin
 if not private.has_permission('dashboard.read') then raise exception 'FORBIDDEN' using errcode='42501';end if;
 select jsonb_build_object('posts',count(*),'published',count(*) filter(where status='published'),'draft',count(*) filter(where status='draft'),'review',count(*) filter(where status='review'),'scheduled',count(*) filter(where status='scheduled')) into result from public.posts p where p.deleted_at is null and private.can_post(p,'posts.read');
 if private.has_permission('analytics.read') then
 result=result||jsonb_build_object('views',(select coalesce(sum(v.views),0) from public.post_view_daily v join public.posts p on p.id=v.post_id where private.can_post(p,'analytics.read')),'today_views',(select coalesce(sum(v.views),0) from public.post_view_daily v join public.posts p on p.id=v.post_id where v.day>=current_date and private.can_post(p,'analytics.read')),'week_views',(select coalesce(sum(v.views),0) from public.post_view_daily v join public.posts p on p.id=v.post_id where v.day>=current_date-6 and private.can_post(p,'analytics.read')),'month_views',(select coalesce(sum(v.views),0) from public.post_view_daily v join public.posts p on p.id=v.post_id where v.day>=date_trunc('month',now())::date and private.can_post(p,'analytics.read')));end if;
 if private.has_permission('comments.moderate') then result=result||jsonb_build_object('pending_comments',(select count(*) from public.comments c join public.posts p on p.id=c.post_id where c.status='pending' and c.deleted_at is null and private.can_post(p,'comments.moderate')));end if;
 if private.has_permission('authors.manage') then result=result||jsonb_build_object('authors',(select count(*) from public.authors where deleted_at is null));end if;
 if private.has_permission('users.manage') then result=result||jsonb_build_object('admins',(select count(*) from public.admin_memberships where enabled and private.scope_contains_user(user_id)));end if;
 return result;
end $$;
create or replace function public.admin_analytics(p_from date,p_to date,p_page int default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.has_permission('analytics.read') then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>365 or p_page not between 1 and 10000 then raise exception 'INVALID_PERIOD';end if;
 return jsonb_build_object(
 'days',coalesce((select jsonb_agg(x) from(select v.day,sum(v.views) views from public.post_view_daily v join public.posts p on p.id=v.post_id where v.day between p_from and p_to and private.can_post(p,'analytics.read') group by v.day order by v.day) x),'[]'::jsonb),
 'posts',coalesce((select jsonb_agg(x) from(select p.id,p.title,p.status,p.published_at,(select coalesce(sum(v.views),0) from public.post_view_daily v where v.post_id=p.id and v.day between p_from and p_to) views,(select count(*) from public.comments c where c.post_id=p.id and c.deleted_at is null) comments from public.posts p where p.deleted_at is null and private.can_post(p,'analytics.read') order by views desc,p.id limit 25 offset(p_page-1)*25) x),'[]'::jsonb),
 'total',(select count(*) from public.posts p where p.deleted_at is null and private.can_post(p,'analytics.read')),
 'categories',coalesce((select jsonb_agg(x) from(select c.id,c.name,coalesce(sum(v.views),0) views from public.categories c join public.post_categories pc on pc.category_id=c.id join public.posts p on p.id=pc.post_id left join public.post_view_daily v on v.post_id=p.id and v.day between p_from and p_to where private.can_post(p,'analytics.read') group by c.id,c.name order by views desc,c.id limit 25) x),'[]'::jsonb),
 'authors',coalesce((select jsonb_agg(x) from(select a.id,a.display_name,count(distinct p.id) posts,count(distinct p.id) filter(where p.status='published') published,count(distinct p.id) filter(where p.status='draft') drafts,count(distinct p.id) filter(where p.status='scheduled') scheduled,coalesce(sum(v.views),0) views from public.authors a join public.posts p on p.author_id=a.id left join public.post_view_daily v on v.post_id=p.id and v.day between p_from and p_to where private.can_post(p,'analytics.read') group by a.id,a.display_name order by views desc,a.id limit 25) x),'[]'::jsonb)
 );
end $$;
revoke all on function public.admin_dashboard(),public.admin_analytics(date,date,int) from public,anon;
grant execute on function public.admin_dashboard(),public.admin_analytics(date,date,int) to authenticated;
-- Notifications contain generic titles and scoped links, never content or secrets.
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
 insert into public.admin_notifications(user_id,kind,title,href,priority) values(recipient.user_id,tg_table_name,heading,link,case when tg_table_name='publishing_runs' then 'high' else 'normal' end);end if;end loop;return new;
end $$;
revoke all on function private.control_notify() from public,anon,authenticated;
drop trigger if exists control_notify on public.posts;create trigger control_notify after insert or update of status on public.posts for each row execute function private.control_notify();
drop trigger if exists control_notify on public.comments;create trigger control_notify after insert on public.comments for each row execute function private.control_notify();
drop trigger if exists control_notify on public.publishing_runs;create trigger control_notify after insert on public.publishing_runs for each row execute function private.control_notify();
insert into public.integration_settings(id) values('supabase'),('vercel'),('telegram'),('botkeep'),('ai'),('analytics') on conflict do nothing;
notify pgrst,'reload schema';
