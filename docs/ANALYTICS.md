# Post views and Arabic search

View recording is a server POST, not a browser/localStorage counter. A PostgreSQL unique constraint deduplicates post / daily visitor hash / UTC day. An HttpOnly SameSite visitor cookie lasts one day. Before the first cookie arrives, a daily HMAC of the trusted forwarded source and user-agent provides a stable temporary identifier, preventing concurrent first requests from creating two counts. Raw addresses and user agents are not stored in the view table.

Known bot/crawler/preview/headless user agents are omitted. This reduces automated traffic; it cannot identify all bots. Clients may block cookies or calls, and shared source/user-agent visitors may be merged. Counts are recorded views under this policy, never unique people. HMAC secret rotation changes deduplication identities. Local non-Vercel requests share a fallback source; configure a trusted ingress before changing this behavior.

Raw daily hashes are deleted after 30 days. Daily numeric aggregates persist and provide total counts, per-post counts, daily dashboard totals, weekly trends and trending API results. Anonymous aggregate reads are SECURITY INVOKER with RLS limiting rows to published public posts. They expose no raw hash or administration data.

Search indexes weighted title, excerpt and original plain-text content with PostgreSQL `simple` full-text search plus Arabic normalization (alef forms, diacritics, tatweel, final ya). Normalization affects the index/query, not the original publication. Section/author filters, chronological sorting and pagination are independent of AI.

Tests cover normalized Arabic forms and original text preservation. This implementation is token search, not Arabic stemming, root extraction, typo tolerance or semantic search. Searching a bare token and a token with a definite article can differ; that limitation should inform later search-quality work. Query inputs are validated and values passed through the Supabase client.
