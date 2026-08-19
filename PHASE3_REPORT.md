# LÉVANCE — Phase 3 Report
## Private AI Showroom + Monarch Private Salon

**Date:** 2026-08-19  
**Stop conditions honored:** No live CJ API; no invented provider endpoints; unconfigured AI/voice clearly marked; no fabricated catalogue data.

---

## 1. AI architecture

```
UI (Showroom / Salon)
  → Server Actions (membership-gated)
  → lib/ai/* (concierge, search, memory, collections, recommendations)
  → lib/integrations/ai (provider-agnostic adapter)
  → Optional HTTP chat-completions compatible API (AI_API_BASE_URL)
  → Real Supabase catalogue via lib/catalog (never raw SQL from the model)
```

- **Provider abstraction:** `AiProvider` interface (`chat`, optional `streamChat`, `transcribe`, `synthesizeSpeech`)
- **Unconfigured provider** throws / offline mode returns catalogue-grounded messages without claiming live AI
- **Compatible adapter** uses configurable `AI_API_BASE_URL` + `AI_API_KEY` + `AI_MODEL` (OpenAI-compatible shape only; no hard-coded vendor)

---

## 2. New routes

| Route | Access |
|-------|--------|
| `/showroom` | PREMIUM or MONARCH (`requireShowroomAccess`) |
| `/monarch` | MONARCH only (`requireMonarchAccess`) |
| `/account/ai-memory` | PREMIUM+ |
| `/admin/ai` | Admin layout (`requireAdmin`) |

Layouts enforce membership server-side. Middleware only coarse-auth redirects.

---

## 3. Database migrations

**`0011_ai_system.sql`**

Tables:
- `ai_usage` — request/token tracking
- `ai_memories` — structured memory (STYLE, SHOPPING, EXPLICIT, AI_CONTEXT; explicit vs inferred)
- `ai_conversations` / `ai_messages`
- `ai_collections` / `ai_collection_items`
- `product_views` — recommendation signal
- `ai_user_settings` — personalization / memory / voice toggles

---

## 4. RLS policies

All AI tables: **owner-only** read/write via `auth.uid() = user_id` (messages/items via parent ownership).  
`ai_usage` also allows admin **select** for operational overview (not full conversation dump on admin AI page).

---

## 5. Premium Showroom features

- Personal greeting, membership badge
- Chosen For You (hybrid recommendations from real products)
- Saved collections + collection builder (catalogue-grounded)
- Concierge panel (text; offline-aware)
- Voice status foundation (unavailable without provider)
- Links: wishlist, AI memory, membership
- No fake recommendation content when empty

---

## 6. Monarch Salon features

- Distinct dark luxury shell
- Private Picks, Private Collections, Personal Archive links
- Early access panel explicitly non-fabricated
- Monarch-context concierge (same safety rules; higher quota config)
- Not linked from public storefront nav

---

## 7. Memory system

- Structured keys/values by category + source (`explicit` | `inferred`)
- Confidence on inferred only
- `/account/ai-memory`: list, forget one, clear all, add explicit preference, toggles
- Context sent to provider excludes PII dumps; respects `memory_enabled`

---

## 8. Voice architecture

- UI states: idle / listening / thinking / speaking / muted / error
- `VoiceStatus` component — **does not simulate** working voice
- Provider hooks reserved on `AiProvider`; status via `VOICE_PROVIDER` / `VOICE_API_KEY`

---

## 9. AI provider requirements

To enable live concierge chat:
1. `AI_PROVIDER` (label)
2. `AI_API_KEY`
3. `AI_API_BASE_URL` (e.g. `https://api.example.com/v1`)
4. `AI_MODEL`

Optional voice: `VOICE_PROVIDER`, `VOICE_API_KEY` (adapter not fully implemented — boundary only).

---

## 10. Environment variables

See `.env.example` — AI_*, VOICE_*, AI_FEATURE_*, AI_QUOTA_* added. All server-only except existing NEXT_PUBLIC_*.

---

## 11. Security model

- Membership gates on layouts + Server Actions
- AI cannot grant membership, alter payments, or access other users’ data
- Product answers from `searchProductsStructured` → catalog layer only
- Quotas via `ai_usage` + tier config
- Service role never exposed to client or AI browser code
- Conversations/memories RLS owner-scoped

---

## 12. Feature flags

`AI_CONCIERGE`, `AI_MEMORY`, `AI_RECOMMENDATIONS`, `AI_VOICE`, `AI_COLLECTION_BUILDER`, `AI_VISUAL_SEARCH`  
Voice & visual search default **off**; others follow provider configuration unless forced.

Visual search: architecture reserved (flag + future boundary only) — **no fake image analysis**.

---

## 13. Tests performed

| Check | Method | Result in this environment |
|-------|--------|------------------------------|
| COMMON cannot access /showroom | Code: `requireShowroomAccess` + tier rank | Implemented; not live-E2E tested here |
| PREMIUM can access /showroom | Same | Implemented |
| Non-MONARCH cannot access /monarch | `requireMonarchAccess` | Implemented |
| Cross-user AI data isolation | RLS policies in 0011 | Implemented; requires live Supabase to verify |
| AI offline mode | Unconfigured provider path | Implemented |

Live membership E2E was **not** executed in this sandbox (no Supabase credentials).

---

## 14. Validation results

| Command | Result |
|---------|--------|
| `npm install` | Not reliably completed in sandbox |
| `npm run typecheck` | **NOT RUN** |
| `npm run lint` | **NOT RUN** |
| `npm test` | **NOT RUN** (no test runner) |
| `npm run build` | **NOT RUN** |

Run all of the above locally after `npm install` and applying migration `0011`.

---

## 15. Remaining configuration

1. Apply `0011_ai_system.sql`
2. Set AI provider env vars for live chat
3. Optional: implement full voice adapter against a chosen provider
4. Optional: visual search provider boundary + UI upload flow
5. Generate updated Supabase types
6. Guest/showroom analytics and deeper comparison UI
7. Admin audited access to a single customer’s AI data (intentionally not in overview)

---

## 16. Recommended Phase 4

1. Local typecheck/build + migration apply  
2. Wire and test a real AI provider end-to-end  
3. CJ Dropshipping live sync (deferred from Phase 3)  
4. Visual search provider  
5. Production monitoring for AI cost/quotas  

---

**STOP.** Phase 3 complete. Phase 4 not started.
