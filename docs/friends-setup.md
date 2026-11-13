# إعداد ميزة الأصدقاء

هذه الميزة تحتاج تطبيق ملف SQL واحد على مشروع Supabase **قبل** استخدام صفحة
«الأصدقاء». الملف هو:

```
supabase/migrations/20261115000000_friends_rpc.sql
```

الملف يضيف دالتين للقراءة فقط (`search_profiles` و`list_my_friendships`) ولا يعدّل أي
جدول أو سياسة RLS، لذلك لا يؤثر على بقية التطبيق.

---

## 1. تطبيق SQL (مرة واحدة)

1. افتح [Supabase Dashboard](https://supabase.com/dashboard) لمشروعك.
2. من القائمة الجانبية اختر **SQL Editor** ثم **New query**.
3. انسخ **كامل** محتوى الملف `supabase/migrations/20261115000000_friends_rpc.sql`
   والصقه في المحرر.
4. اضغط **Run**.

الملف يستخدم `create or replace function`، فإعادة تشغيله آمنة ولا تُنشئ تكراراً.

### محتوى الملف (للنسخ المباشر)

```sql
-- =============================================================================
-- Jambaza — friends read functions
-- =============================================================================
-- The friends feature needs to:
--   1. find users by username before any friendship exists, and
--   2. show the counterpart's profile for pending requests.
--
-- The profiles RLS policy ("profiles_select_self_or_friend" in
-- 20261112000000_init.sql) intentionally only exposes your own profile and
-- accepted friends' profiles. Instead of weakening that policy, this migration
-- adds two narrow, read-only, security-definer functions that expose only the
-- four public profile columns and only for the rows the caller is allowed to
-- see. No table, column or existing policy is changed.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- search_profiles(p_query text)
-- Case-insensitive prefix search by username, excluding the caller, max 20 rows.
-- LIKE wildcards in the input are escaped so "%" and "_" are matched literally.
-- -----------------------------------------------------------------------------
create or replace function public.search_profiles(p_query text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select btrim(coalesce(p_query, '')) as value
  ),
  p as (
    select
      replace(replace(replace(value, '\', '\\'), '%', '\%'), '_', '\_') || '%'
        as like_pattern
    from q
    where value <> ''
  )
  select
    pr.id,
    pr.username,
    pr.display_name,
    pr.avatar_url
  from public.profiles pr
  join p on pr.username ilike p.like_pattern escape '\'
  where pr.id <> (select auth.uid())
  order by pr.username
  limit 20;
$$;

comment on function public.search_profiles(text) is
  'Username prefix search for the friends feature: id, username, display_name and avatar_url for up to 20 profiles, excluding the caller.';

revoke execute on function public.search_profiles(text) from public, anon;
grant execute on function public.search_profiles(text) to authenticated;

-- -----------------------------------------------------------------------------
-- list_my_friendships()
-- Every friendship the caller participates in, with the other participant's
-- four public profile columns and a direction computed from the caller's side.
-- -----------------------------------------------------------------------------
create or replace function public.list_my_friendships()
returns table (
  friendship_id uuid,
  status text,
  direction text,
  friend_id uuid,
  friend_username text,
  friend_display_name text,
  friend_avatar_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    f.id as friendship_id,
    f.status as status,
    case
      when f.status = 'accepted' then 'accepted'
      when f.addressee_id = (select auth.uid()) then 'incoming'
      else 'outgoing'
    end as direction,
    other_profile.id as friend_id,
    other_profile.username as friend_username,
    other_profile.display_name as friend_display_name,
    other_profile.avatar_url as friend_avatar_url,
    f.created_at as created_at
  from public.friendships f
  join public.profiles other_profile
    on other_profile.id = case
      when f.requester_id = (select auth.uid()) then f.addressee_id
      else f.requester_id
    end
  where f.requester_id = (select auth.uid())
     or f.addressee_id = (select auth.uid())
  order by f.created_at desc;
$$;

comment on function public.list_my_friendships() is
  'Friendships the caller participates in, joined with the other participant''s public profile fields.';

revoke execute on function public.list_my_friendships() from public, anon;
grant execute on function public.list_my_friendships() to authenticated;
```

### التحقق من نجاح التطبيق

```sql
select proname
from pg_proc
where proname in ('search_profiles', 'list_my_friendships');
```

المتوقع: صفّان بالضبط:

| proname |
| --- |
| `list_my_friendships` |
| `search_profiles` |

للتحقق من الصلاحيات (اختياري): `anon` يجب ألا يملك `execute`:

```sql
select p.proname, r.rolname, has_function_privilege(r.oid, p.oid, 'execute') as can_execute
from pg_proc p
cross join pg_roles r
where p.proname in ('search_profiles', 'list_my_friendships')
  and r.rolname in ('anon', 'authenticated')
order by p.proname, r.rolname;
```

المتوقع: `anon` → `false` و`authenticated` → `true` للدالتين.

انتهى الإعداد. لا حاجة لأي خطوة إضافية، ولا توجد مفاتيح جديدة: التطبيق يستخدم
`NEXT_PUBLIC_SUPABASE_URL` و`NEXT_PUBLIC_SUPABASE_ANON_KEY` فقط.

---

## 2. اختبارات SQL للتحقق من السلوك

هذه الاختبارات تحاكي مستخدماً مسجّلاً من داخل محرّر SQL، بدون تسجيل دخول حقيقي.

### الحصول على معرّفات الحسابات

```sql
select id, username
from public.profiles
order by created_at;
```

خذ `id` (UUID) و`username` لحسابين: أحدهما «أنت».

### قالب العمل

نفّذ كل كتلة كما هي في تشغيل واحد، لأن `set local` و`set_config(..., true)` مرتبطان
بالمعاملة الحالية. **لا تنسَ `rollback`** حتى لا يبقى الدور أو الادعاء مفعّلاً.

```sql
begin;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '<UUID_الحساب>', 'role', 'authenticated')::text,
  true
);

-- استعلام الاختبار هنا

rollback;
```

### الاختبار 1: البحث لا يُرجع المستخدم نفسه

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '<UUID_الحساب>', 'role', 'authenticated')::text, true);

select * from public.search_profiles('<اسم_المستخدم_الخاص_بك>');

rollback;
```

**المتوقع:** 0 صفوف. جرّب أيضاً البحث عن الجزء الأول من اسمك؛ يجب ألا يظهر حسابك في
النتائج أبداً.

### الاختبار 2: `%` و`_` تُطابَق حرفياً

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '<UUID_الحساب>', 'role', 'authenticated')::text, true);

-- (أ) المتوقع: 0 صفوف
select * from public.search_profiles('%');

-- (ب) المتوقع: 0 صفوف
select * from public.search_profiles('_');

-- (ج) الثلاثة التالية تستخدم أول حرف من اسم مستخدم موجود فعلاً (مثلاً 'a'):
--     (ج1) بادئة حقيقية => صفوف
select * from public.search_profiles('a');
--     (ج2) نفس الحرف متبوعاً بـ % => 0 صفوف، لأن % حرفية
select * from public.search_profiles('a%');
--     (ج3) نفس الحرف متبوعاً بـ _ => 0 صفوف إلا إذا وُجد اسم يبدأ حرفياً بـ "a_"
select * from public.search_profiles('a_');

rollback;
```

**المتوقع:** `%` و`_` لا تعيدان أي مستخدم. بدون الهروب في الدالة كانت `%` ستعيد أول
20 مستخدماً، و`_` كذلك.

البحث **غير حسّاس لحالة الأحرف**: `select * from public.search_profiles('A')` يعيد
نفس نتائج `'a'`.

### الاختبار 3: `list_my_friendships` يعرض صداقاتك فقط

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '<UUID_الحساب>', 'role', 'authenticated')::text, true);

-- (أ) القائمة
select * from public.list_my_friendships();

-- (ب) المتوقع: 0
select count(*) as rows_outside_my_friendships
from public.list_my_friendships() c
where not exists (
  select 1
  from public.friendships f
  where f.id = c.friendship_id
    and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
);

-- (ج) المتوقع: 0
select count(*) as bad_direction
from public.list_my_friendships() c
join public.friendships f on f.id = c.friendship_id
where (f.status = 'accepted' and c.direction <> 'accepted')
   or (f.status = 'pending' and f.addressee_id = auth.uid() and c.direction <> 'incoming')
   or (f.status = 'pending' and f.requester_id = auth.uid() and c.direction <> 'outgoing');

rollback;
```

**المتوقع:** `rows_outside_my_friendships = 0` و`bad_direction = 0`، والاتجاهات:
`incoming` للطلبات الواردة إليك، `outgoing` لما أرسلته، `accepted` للصداقات المقبولة.

### الاختبار 4: `anon` ممنوع

```sql
begin;
set local role anon;

select * from public.search_profiles('a');

rollback;
```

**المتوقع:** خطأ `permission denied for function search_profiles`.
وكرّر نفس الشيء مع `list_my_friendships()`؛ المتوقع `permission denied for function
list_my_friendships`.

---

## 3. الاختبار اليدوي بحسابين

جهّز حسابين مؤكَّدين: **أ** و**ب**. استخدم نافذتين: عادية وأخرى خاصة (Private) حتى
تكون الجلستان منفصلتين.

| # | الحساب | الخطوة | المتوقع |
| --- | --- | --- | --- |
| 1 | أ | افتح `/friends` واكتب بداية اسم مستخدم **ب** (أو بأحرف كبيرة) | يظهر **ب** في نتائج البحث مع زر «أضف صديق» |
| 2 | أ | اضغط «أضف صديق» | تظهر رسالة «تم إرسال طلب الصداقة.»، ويظهر **ب** في قسم «طلبات مرسلة» مع زر «إلغاء الطلب» والشارة «طلب مرسل» في نتائج البحث |
| 3 | ب | حدّث `/friends` | يظهر **أ** في قسم «طلبات واردة» مع زرّي «قبول» و«رفض» |
| 4 | ب | اضغط «قبول» | رسالة «تم قبول طلب الصداقة.»، وينتقل **أ** إلى «أصدقائي» |
| 5 | أ | حدّث الصفحة | يظهر **ب** في «أصدقائي» (القبول من الطرف الآخر يكفي) |
| 6 | أ | ابحث عن اسمك أنت | لا يظهر حسابك في النتائج إطلاقاً |
| 7 | أ | ابحث عن `%` ثم `_` | لا تظهر أي نتيجة، ورسالة «لا يوجد مستخدمون بهذا الاسم.» |

### إزالة صديق (مع تأكيد)

1. من «أصدقائي» في حساب **أ** اضغط «إزالة» بجانب **ب**.
2. يظهر حوار «إزالة الصديق؟» يذكر اسم **ب**، وفيه زرّا «إلغاء» و«إزالة الصديق».
3. اضغط «إزالة الصديق» → رسالة «تمت إزالة الصديق.» ويختفي **ب** من القائمة.
4. حدّث صفحة **ب** → يختفي **أ** من «أصدقائي» أيضاً.
5. تأكد أن «إلغاء» في الحوار يغلق النافذة دون حذف، وأن مفتاح `Esc` يفعل الشيء نفسه.

### رفض طلب وارد

1. **أ** يرسل طلباً جديداً إلى **ب**.
2. **ب** يضغط «رفض» في «طلبات واردة» → رسالة «تم رفض طلب الصداقة.».
3. حدّث صفحة **أ** → اختفى الطلب من «طلبات مرسلة»، ولا توجد صداقة بينهما.

### إلغاء طلب مرسل

1. **أ** يرسل طلباً جديداً إلى **ب**.
2. **أ** يضغط «إلغاء الطلب» في «طلبات مرسلة» → رسالة «تم إلغاء طلب الصداقة.».
3. حدّث صفحة **ب** → لا يوجد طلب وارد من **أ**.

### حالات يجب أن تفشل بلطف

| الحالة | المتوقع |
| --- | --- |
| إرسال طلبين متتاليين إلى نفس المستخدم | رسالة عربية: «توجد صداقة أو طلب صداقة مع هذا المستخدم بالفعل.» |
| إرسال طلب بعد القبول (من نتائج البحث) | لا يظهر زر الإضافة، بل شارة «صديق» |
| البحث أثناء وجود طلب وارد من نفس الشخص | شارة «لديك طلب وارد»، فيمكن قبوله من قسم «طلبات واردة» |
| البحث بدون نص أو بمسافات فقط | لا استعلام شبكي، ولا رسالة خطأ |
| الشبكة مقطوعة أثناء البحث | رسالة «تعذّر البحث عن المستخدمين. حاول مرة أخرى.» |

---

## 4. استكشاف الأخطاء

| الرسالة / العَرَض | السبب المحتمل | الحل |
| --- | --- | --- |
| `permission denied for function search_profiles` | الملف لم يُطبَّق، أو نُفّذ في مشروع آخر | أعد تنفيذ القسم 1 وتأكد من `select proname ...` |
| `Could not find the function public.search_profiles(p_query)` | اسم المعامل أو الدالة غير مطابق | تأكد أنك نسخت الملف كاملاً دون تعديل |
| قسم «أصدقائي» فارغ دائماً مع وجود صداقات | الجلسة منتهية | أعد تسجيل الدخول |
| البحث لا يعيد أي نتيجة | أنت تبحث عن اسمك، أو أن البادئة لا تطابق أي اسم مستخدم | جرّب `select id, username from public.profiles;` للتأكد من الأسماء |

هذه الميزة لا تستخدم أي مفتاح سري أو `service_role`؛ كل شيء يمرّ عبر RLS
و`NEXT_PUBLIC_SUPABASE_ANON_KEY`.
