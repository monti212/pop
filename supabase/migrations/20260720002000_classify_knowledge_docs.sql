-- Activate the knowledge base for the serving path (get_pinned_context / uhuru-llm-api-v4).
--
-- After the Sonnet backfill populated summaries for 171 docs, they were still
-- invisible to the model: get_pinned_context only pulls docs that are
-- always_include = true OR document_type = 'syllabus' (with matching
-- grade/subject). Everything was flat 'methodology / All / All' and nothing was
-- pinned, so only KG-Curriculum ever reached the prompt.
--
-- This migration:
--   1. Deduplicates exact-title copies (keeps the highest-quality one).
--   2. Deactivates two seeded test docs ("Human Digestive System", high_school/biology).
--   3. Types the 18 NaCCA curriculum docs as 'syllabus' with grade band + subject.
--   4. Pins the PoP core docs (always_include) into every cached prefix.
--
-- NOTE: grade/subject scoping is dormant until the frontend (src/services/chatService.ts)
-- sends gradeLevel/subject to uhuru-llm-api-v4. Until then get_pinned_context runs
-- with null/null and packs pinned + a budget-limited subset of all syllabus docs.
-- Idempotent: safe to re-run.

-- 1. Deduplicate: deactivate all but the best copy of each exact-title group
with ranked as (
  select id,
    row_number() over (partition by btrim(title)
      order by extraction_quality_score desc nulls last, processed_at desc nulls last, id) as rn
  from admin_knowledge_documents
  where is_active and processing_status = 'completed'
)
update admin_knowledge_documents d
set is_active = false, updated_at = now()
from ranked r
where d.id = r.id and r.rn > 1;

-- 2. Deactivate the two seeded test docs
update admin_knowledge_documents
set is_active = false, updated_at = now()
where title ilike 'Human Digestive System%';

-- 3. Type curriculum docs as syllabus + grade/subject
update admin_knowledge_documents
set document_type = 'syllabus',
    grade_level = case
      when title ilike '%B1-B3%' or title ilike '%LOWER-PRIMARY%' then 'B1-B3'
      when title ilike '%B4-B6%' or title ilike '%UPPER-PRIMARY%' then 'B4-B6'
      when title ilike '%B1-B6%' then 'B1-B6' end,
    subject = case
      when title ilike 'ENGLISH-%' then 'English'
      when title ilike 'MATHS-%' then 'Mathematics'
      when title ilike 'SCIENCE-%' then 'Science'
      when title ilike 'CREATIVE-ARTS-%' then 'Creative Arts'
      when title ilike 'COMPUTING-%' then 'Computing'
      when title ilike 'GHANAIAN-LANGUAGE-%' then 'Ghanaian Language'
      when title ilike 'OUR-WORLD-AND-OUR-PEOPLE-%' then 'Our World and Our People'
      when title ilike 'HISTORY-%' then 'History'
      when title ilike 'RELIGIOUS-AND-MORAL-EDUCATION-%' then 'Religious and Moral Education'
      when title ilike 'PHYSICAL-EDUCATION-%' then 'Physical Education' end,
    updated_at = now()
where title ilike 'ENGLISH-%' or title ilike 'MATHS-%' or title ilike 'SCIENCE-%'
   or title ilike 'CREATIVE-ARTS-%' or title ilike 'COMPUTING-%'
   or title ilike 'GHANAIAN-LANGUAGE-%' or title ilike 'OUR-WORLD-AND-OUR-PEOPLE-%'
   or title ilike 'HISTORY-%' or title ilike 'RELIGIOUS-AND-MORAL-EDUCATION-%'
   or title ilike 'PHYSICAL-EDUCATION-%';

-- 4. Pin the PoP core docs (always in the cached prefix)
update admin_knowledge_documents
set always_include = true,
    pinned_order = case
      when title ilike 'Pencils of Promise%' then 1
      when title ilike 'PoP SEL%' then 2
      when btrim(title) ilike 'SEED Manual' then 3 end,
    updated_at = now()
where title ilike 'Pencils of Promise%' or title ilike 'PoP SEL%' or btrim(title) ilike 'SEED Manual';
