-- Make get_pinned_context tolerant so callers don't have to send exact band strings.
--   kb_grade_bands('Basic 2'|'B2'|'KG1'|'B1-B3'|...) -> doc grade_level labels it should match,
--     with band containment (a 'B1-B6' curriculum shows for a B1-B3 or B4-B6 query).
--   kb_subject_canon('Maths'|'RME'|'OWOP'|...) -> canonical subject for case/synonym-insensitive match.
-- NOTE: lower() must run BEFORE the [^a-z0-9] strip, or uppercase letters (K, G, B...) are
-- removed and e.g. 'KG1' collapses to '1' and is misread as grade 1.

create or replace function public.kb_grade_bands(q text)
returns text[] language plpgsql immutable as $$
declare s text; n int;
begin
  if q is null then return null; end if;
  s := regexp_replace(lower(q), '[^a-z0-9]', '', 'g');
  if s = '' then return array[]::text[]; end if;
  if s ~ 'kg' or s ~ 'kindergarten' or s in ('k1','k2') then return array['KG']; end if;
  if s = 'b1b3' or s = 'lowerprimary' then return array['B1-B3','B1-B6']; end if;
  if s = 'b4b6' or s = 'upperprimary' then return array['B4-B6','B1-B6']; end if;
  if s = 'b1b6' then return array['B1-B3','B4-B6','B1-B6']; end if;
  n := nullif(substring(s from '([1-6])'), '')::int;
  if n is null then return array[]::text[]; end if;
  if n <= 3 then return array['B1-B3','B1-B6']; else return array['B4-B6','B1-B6']; end if;
end;
$$;

create or replace function public.kb_subject_canon(s text)
returns text language sql immutable as $$
  select case
    when s is null then null
    when lower(btrim(s)) in ('maths','math','mathematics') then 'mathematics'
    when lower(btrim(s)) in ('english','english language','literacy') then 'english'
    when lower(btrim(s)) in ('science','integrated science') then 'science'
    when lower(btrim(s)) in ('creative arts','creative art','arts') then 'creative arts'
    when lower(btrim(s)) in ('computing','ict','computing/ict') then 'computing'
    when lower(btrim(s)) in ('ghanaian language','local language','ghanaian languages') then 'ghanaian language'
    when lower(btrim(s)) in ('our world and our people','owop','owp') then 'our world and our people'
    when lower(btrim(s)) in ('history') then 'history'
    when lower(btrim(s)) in ('religious and moral education','rme','r.m.e','r m e') then 'religious and moral education'
    when lower(btrim(s)) in ('physical education','pe','p.e','p e') then 'physical education'
    else lower(btrim(s))
  end;
$$;

create or replace function public.get_pinned_context(p_grade_level text default null::text, p_subject text default null::text, p_max_tokens integer default 12000)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_rec       record;
  v_docs      jsonb := '[]'::jsonb;
  v_total     integer := 0;
  v_dropped   integer := 0;
  v_degraded  integer := 0;
  v_content   text;
  v_tokens    integer;
  v_tier      text;
  v_fp_input  text := '';
begin
  for v_rec in
    select
      d.id, d.title, d.document_type, d.grade_level, d.subject, d.updated_at,
      d.always_include, d.pinned_order,
      d.standard_summary, d.standard_token_count,
      d.micro_summary,    d.micro_token_count,
      d.ai_summary,       d.original_content
    from admin_knowledge_documents d
    where d.is_active
      and (
            d.always_include
         or (
              d.document_type = 'syllabus'
              and (p_grade_level is null or d.grade_level is null or d.grade_level = 'All'
                   or lower(btrim(d.grade_level)) = lower(btrim(p_grade_level))
                   or d.grade_level = any (public.kb_grade_bands(p_grade_level)))
              and (p_subject is null or d.subject is null or d.subject = 'All'
                   or public.kb_subject_canon(d.subject) = public.kb_subject_canon(p_subject))
            )
      )
    order by d.always_include desc, d.pinned_order asc nulls last, d.id asc
  loop
    if v_rec.standard_summary is not null and length(v_rec.standard_summary) > 0 then
      v_content := v_rec.standard_summary;
      v_tokens  := coalesce(v_rec.standard_token_count, ceil(length(v_rec.standard_summary) / 4.0)::integer);
      v_tier    := 'standard';
    elsif v_rec.micro_summary is not null and length(v_rec.micro_summary) > 0 then
      v_content := v_rec.micro_summary;
      v_tokens  := coalesce(v_rec.micro_token_count, ceil(length(v_rec.micro_summary) / 4.0)::integer);
      v_tier    := 'micro';
    elsif v_rec.ai_summary is not null and length(v_rec.ai_summary) > 0 then
      v_content := v_rec.ai_summary;
      v_tokens  := ceil(length(v_rec.ai_summary) / 4.0)::integer;
      v_tier    := 'ai_summary';
    else
      v_content := coalesce(v_rec.original_content, '');
      v_tokens  := ceil(length(coalesce(v_rec.original_content, '')) / 4.0)::integer;
      v_tier    := 'original';
    end if;

    if v_total + v_tokens > p_max_tokens
       and v_tier <> 'micro'
       and v_rec.micro_summary is not null
       and length(v_rec.micro_summary) > 0 then
      v_content  := v_rec.micro_summary;
      v_tokens   := coalesce(v_rec.micro_token_count, ceil(length(v_rec.micro_summary) / 4.0)::integer);
      v_tier     := 'micro';
      v_degraded := v_degraded + 1;
    end if;

    if v_total + v_tokens > p_max_tokens then
      v_dropped := v_dropped + 1;
      continue;
    end if;

    v_total := v_total + v_tokens;

    v_docs := v_docs || jsonb_build_object(
      'id',            v_rec.id,
      'title',         v_rec.title,
      'document_type', v_rec.document_type,
      'grade_level',   v_rec.grade_level,
      'subject',       v_rec.subject,
      'pinned',        v_rec.always_include,
      'tier',          v_tier,
      'tokens',        v_tokens,
      'content',       v_content
    );

    v_fp_input := v_fp_input || v_rec.id::text || ':' || v_tier || ':'
                  || coalesce(extract(epoch from v_rec.updated_at)::bigint::text, '0') || '|';
  end loop;

  return jsonb_build_object(
    'documents',      v_docs,
    'document_count', jsonb_array_length(v_docs),
    'total_tokens',   v_total,
    'max_tokens',     p_max_tokens,
    'truncated',      v_dropped > 0,
    'dropped_count',  v_dropped,
    'degraded_count', v_degraded,
    'fingerprint',    md5(v_fp_input),
    'scope', jsonb_build_object('grade_level', p_grade_level, 'subject', p_subject)
  );
end;
$function$;