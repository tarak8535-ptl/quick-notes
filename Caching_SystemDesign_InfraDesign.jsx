import { useState } from "react";

const CmdBlock = ({ children }) => (
  <pre style={{ background: "#060B18", border: "1px solid #1a2744", borderRadius: 7, padding: "12px 14px", fontSize: 11.5, lineHeight: 1.65, fontFamily: "'JetBrains Mono', monospace", color: "#7DD3FC", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "8px 0" }}>{children}</pre>
);

const Diagram = ({ children, title }) => (
  <div style={{ background: "#060B18", border: "1px solid #1E3A5F", borderRadius: 9, padding: "12px 14px", margin: "10px 0" }}>
    {title && <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>{title}</div>}
    <pre style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, fontFamily: "'JetBrains Mono', monospace", color: "#94A3B8", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{children}</pre>
  </div>
);

const Callout = ({ type = "info", children }) => {
  const s = { info: ["#3B82F6", "💡"], tip: ["#10B981", "✅"], warn: ["#F59E0B", "⚠️"], scenario: ["#A78BFA", "🎬"], key: ["#EC4899", "🔑"] };
  const [c, i] = s[type] || s.info;
  return <div style={{ padding: "10px 14px", background: c + "10", borderLeft: `3px solid ${c}`, borderRadius: "0 8px 8px 0", margin: "8px 0", fontSize: 12.5, lineHeight: 1.7, color: "#CBD5E1" }}><span style={{ color: c, fontWeight: 700 }}>{i} </span>{children}</div>;
};

const ScenarioCard = ({ num, title, answer, details, color }) => (
  <div style={{ margin: "8px 0", background: "#0a1628", border: "1px solid #1a2744", borderRadius: 9, overflow: "hidden" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #111d33" }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: color + "20", color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{num}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", lineHeight: 1.4 }}>{title}</div>
    </div>
    <div style={{ padding: "10px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 13 }}>✅</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{answer}</span>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.7, color: "#94A3B8" }}>{details}</div>
    </div>
  </div>
);

// ==================== TABS ====================
const TABS = [
  { id: "caching", label: "Caching", icon: "⚡" },
  { id: "sysdesign", label: "System Design", icon: "🏗️" },
  { id: "infradesign", label: "Infrastructure Design", icon: "☁️" },
];

// ==================== CACHING DATA ====================
const cachingSections = [
  {
    id: "overview", title: "Caching Fundamentals", icon: "📚",
    content: [
      {
        title: "What is Caching & Why It Matters",
        body: "Caching stores frequently accessed data in a fast-access layer (memory) to reduce latency and load on the origin (database, API). A well-designed caching layer can reduce database load by 80-95% and improve response times from 50ms to <1ms.",
        diagram: `Without Cache:
  Client → API → Database (50ms query)
  Every request hits the database
  1000 req/s = 1000 DB queries/s

With Cache:
  Client → API → Cache HIT (0.5ms) → return
                  Cache MISS → Database (50ms) → store in cache → return
  
  95% cache hit rate:
  1000 req/s = 50 DB queries/s + 950 cache reads
  Database load reduced by 95%!

Where to Cache:
  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ Browser  │ →  │   CDN    │ →  │ App-level│ →  │ Database │
  │ Cache    │    │ (Edge)   │    │  Cache   │    │  Cache   │
  │ <1ms     │    │ ~5ms     │    │ ~1ms     │    │ ~5ms     │
  └──────────┘    └──────────┘    └──────────┘    └──────────┘
  HTTP headers    CloudFront      Redis/Memcached   Query cache
  localStorage    API Gateway     DAX               Aurora cache
  Service Worker  cache           In-process cache   Buffer pool`,
      },
      {
        title: "Cache Strategies — Read Patterns",
        body: "Different strategies for how the application reads from the cache:",
        diagram: `1. CACHE-ASIDE (Lazy Loading) — Most Common
   App checks cache first; on miss, loads from DB and stores in cache.

   Read:  App → Cache? HIT → return data
                       MISS → DB → store in cache → return data

   Pros: Only requested data is cached (efficient)
   Cons: First request always slow (cold start / cache miss)
   When: General-purpose, most web applications

2. READ-THROUGH
   Cache itself loads from DB on miss (cache library handles it).

   Read:  App → Cache? HIT → return data
                       MISS → Cache loads from DB → return data

   Pros: App code is simpler (cache handles loading)
   Cons: Cache library must support it
   When: Simple key-value lookups, CDN patterns

3. REFRESH-AHEAD (Predictive)
   Cache proactively refreshes data BEFORE it expires.

   Read:  App → Cache → always HIT (cache refreshes in background)

   Pros: No cache miss penalty, always fast
   Cons: Wastes resources refreshing rarely-accessed data
   When: Hot data that's read constantly (stock prices, leaderboards)`,
        callouts: [
          { type: "key", text: "Cache-Aside is the strategy you'll use 90% of the time. In an interview, describe it as: 'Application checks Redis first. On a hit, return immediately. On a miss, query the database, store the result in Redis with a TTL, then return. Subsequent requests for the same data hit Redis at microsecond latency.'" }
        ]
      },
      {
        title: "Cache Strategies — Write Patterns",
        body: "How to keep the cache consistent when data changes:",
        diagram: `1. WRITE-THROUGH
   Write to cache AND database simultaneously.

   Write: App → Cache + DB (both updated)
   Read:  App → Cache (always fresh)

   Pros: Cache is always consistent with DB
   Cons: Write latency increased (two writes)
   When: Data consistency is critical (financial data)

2. WRITE-BEHIND (Write-Back)
   Write to cache first, async write to DB later.

   Write: App → Cache (immediate) → background job → DB
   Read:  App → Cache (always fresh)

   Pros: Fastest writes (async DB write)
   Cons: Risk of data loss if cache crashes before DB write
   When: High write throughput, data loss acceptable (analytics)

3. WRITE-AROUND
   Write directly to DB, invalidate cache.

   Write: App → DB → delete cache key
   Read:  App → Cache MISS → DB → populate cache

   Pros: Cache only has read-heavy data
   Cons: Next read is a miss (cold cache)
   When: Write-heavy data that's rarely re-read immediately

4. CACHE INVALIDATION (most common with cache-aside)
   On write: delete the cache key. Next read refills it.

   Write: App → DB → cache.delete(key)
   Read:  Cache MISS → DB → cache.set(key, data, TTL)

   This is the standard pattern for most applications.`,
        callouts: [
          { type: "warn", text: "Never UPDATE the cache on write. Always DELETE (invalidate). Why? If two writes happen simultaneously: Write A sets cache=10, Write B sets cache=20, but if B reaches DB first and A reaches cache last, cache=10 but DB=20 — inconsistency! Deleting the key and letting the next read refill avoids this race condition." },
          { type: "scenario", text: "Interview question: 'How do you handle cache consistency?' → 'I use cache-aside with invalidation. On write, I update the database, then delete the cache key. The next read fills the cache from the database. TTL provides a safety net — even if invalidation fails, stale data expires after the TTL window.'" }
        ]
      },
    ]
  },
  {
    id: "eviction", title: "Eviction, TTL & Problems", icon: "🔄",
    content: [
      {
        title: "Eviction Policies",
        body: "When cache memory is full, which data do we remove?",
        diagram: `Eviction Policies:

  LRU (Least Recently Used) — DEFAULT for Redis
  Remove the key that hasn't been accessed for the longest time.
  Best for: general-purpose caching (most apps)

  LFU (Least Frequently Used)
  Remove the key that's been accessed the fewest times.
  Best for: when some keys are consistently popular

  TTL-based
  Remove keys that have expired.
  Best for: session data, tokens, temporary data

  Random
  Remove a random key.
  Best for: when all keys have similar access patterns

  FIFO (First In First Out)
  Remove the oldest key regardless of access.
  Rarely used in production.

  Redis maxmemory-policy options:
  allkeys-lru     → LRU across ALL keys (recommended default)
  volatile-lru    → LRU across keys WITH expiry set
  allkeys-lfu     → LFU across all keys
  allkeys-random  → Random eviction
  noeviction      → Return error when full (careful!)`,
        callouts: [
          { type: "tip", text: "Set maxmemory-policy to allkeys-lru for most Redis use cases. Set TTL on every key (e.g., 1 hour, 24 hours). Monitor eviction rate — if too high, your cache is too small." }
        ]
      },
      {
        title: "Cache Problems — Stampede, Penetration, Avalanche",
        body: "Three critical cache failure patterns you MUST know for interviews:",
        diagram: `1. CACHE STAMPEDE (Thundering Herd)
   Popular key expires → 1000 requests simultaneously hit DB

   Timeline:
   Cache: [product:123 TTL=0 EXPIRED]
   Request 1 → MISS → hit DB
   Request 2 → MISS → hit DB   ← All at the same time!
   Request 3 → MISS → hit DB
   ...
   Request 1000 → MISS → hit DB  ← DB overloaded!

   Solutions:
   a) Locking: first request acquires lock, others wait
      Request 1 → MISS → LOCK → DB → set cache → UNLOCK
      Request 2 → MISS → wait for lock → cache HIT
   b) Refresh-ahead: refresh cache BEFORE expiry
   c) Jittered TTL: TTL = 3600 + random(0,300) seconds
      Keys don't all expire at the same time

2. CACHE PENETRATION
   Requests for data that NEVER exists (not in cache OR DB)
   
   Request for user:9999999 → MISS → DB → not found → no cache
   Next request → MISS → DB → not found → no cache (forever!)
   Attacker sends 1M requests for non-existent IDs → DB crushed

   Solutions:
   a) Cache null results: cache.set("user:9999999", null, TTL=60)
   b) Bloom filter: check if key MIGHT exist before querying
   c) Input validation: reject obviously invalid IDs before cache

3. CACHE AVALANCHE
   Large portion of cache expires simultaneously → massive DB load

   Cause: bulk-loaded data with same TTL, or cache server crash

   Solutions:
   a) Jittered TTL: add random offset to prevent synchronized expiry
   b) Multi-tier cache: L1 (in-process) + L2 (Redis) — L1 survives L2 crash
   c) Circuit breaker: if DB load > threshold, serve stale cache data
   d) Cache warming: pre-load critical data on startup/restart`,
        callouts: [
          { type: "key", text: "Interview gold: 'How do you prevent cache stampede?' → 'I use a distributed lock (Redis SETNX). On cache miss, the first request acquires the lock and rebuilds the cache. Concurrent requests wait and then read from the refreshed cache. I also add random jitter to TTLs to prevent synchronized expiry.'" },
          { type: "scenario", text: "Real scenario: Black Friday sale starts at midnight. At 11:59 PM you pre-loaded 10,000 product pages into cache with TTL=3600s. At 12:59 AM, ALL 10,000 keys expire simultaneously → database crushed. Fix: TTL = 3600 + random(0, 600) → keys expire over 10-minute window instead of all at once." }
        ]
      }
    ]
  },
  {
    id: "aws-cache", title: "AWS Caching Services", icon: "☁️",
    content: [
      {
        title: "ElastiCache (Redis) vs ElastiCache (Memcached) vs DAX vs CloudFront",
        body: "",
        diagram: `┌──────────────┬──────────────┬──────────────┬──────────────┐
│              │ Redis        │ Memcached    │ DAX          │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ Type         │ In-memory    │ In-memory    │ DynamoDB     │
│              │ data store   │ cache only   │ cache layer  │
│ Data structs │ Strings,     │ Strings only │ DynamoDB     │
│              │ Lists, Sets, │              │ items/queries│
│              │ Sorted Sets, │              │              │
│              │ Hashes, etc  │              │              │
│ Persistence  │ Yes (RDB/AOF)│ No           │ No           │
│ Replication  │ Yes (cluster)│ No           │ Yes (multi-  │
│              │              │              │ node cluster)│
│ Multi-AZ     │ Yes          │ No           │ Yes          │
│ Pub/Sub      │ Yes          │ No           │ No           │
│ Lua scripts  │ Yes          │ No           │ No           │
│ Max memory   │ Up to 6.1 TB │ Up to 4.7 TB│ Varies       │
│ Latency      │ <1ms         │ <1ms         │ <0.5ms       │
│ Use case     │ General cache│ Simple cache │ DynamoDB     │
│              │ sessions,    │ ephemeral,   │ acceleration │
│              │ leaderboards,│ large pool   │ only         │
│              │ queues, rate │              │              │
│              │ limiting     │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┘

CloudFront (CDN) — Edge Caching:
  ┌────────┐     ┌─────────────┐     ┌────────┐
  │ User   │ →   │ CloudFront  │ →   │ Origin │
  │ Tokyo  │ ←   │ Edge Tokyo  │     │ (S3/ALB│
  │        │     │ Cached copy │     │ us-e-1)│
  └────────┘     └─────────────┘     └────────┘
  First request: ~150ms (to origin)
  Subsequent:    ~5ms (from edge)

API Gateway Caching:
  Client → API Gateway → Cache HIT → return (no Lambda invoked!)
  Cache size: 0.5 GB to 237 GB
  TTL: 0 to 3600 seconds
  Per-stage, per-method configuration
  Saves Lambda invocations + reduces latency`,
        callouts: [
          { type: "tip", text: "Decision tree: Need DynamoDB caching? → DAX. Need CDN/static content? → CloudFront. Need API response caching? → API Gateway cache. Need general-purpose application cache? → ElastiCache Redis. Need simple, ephemeral, multi-threaded cache? → ElastiCache Memcached." }
        ]
      },
      {
        title: "ElastiCache Redis — Deep Dive with Examples",
        body: "",
        code: `# Redis Data Structures — each solves a specific problem

# 1. STRING — basic key-value (sessions, simple cache)
SET user:session:abc123 '{"userId":42,"role":"admin"}' EX 3600
GET user:session:abc123

# 2. HASH — object fields (user profiles, product details)
HSET product:123 name "Widget" price 29.99 stock 150
HGET product:123 price        # → "29.99"
HINCRBY product:123 stock -1  # Atomic decrement (purchase)

# 3. SORTED SET — ranked data (leaderboards, priority queues)
ZADD leaderboard 1500 "player:alice"
ZADD leaderboard 2300 "player:bob"
ZADD leaderboard 1800 "player:carol"
ZREVRANGE leaderboard 0 9 WITHSCORES  # Top 10 players
ZRANK leaderboard "player:alice"       # Alice's rank

# 4. LIST — queues, recent items
LPUSH notifications:user:42 "New order received"
RPOP notifications:user:42  # Process oldest notification

# 5. SET — unique collections (tags, online users)
SADD online:users "user:42" "user:56" "user:78"
SCARD online:users           # Count: 3
SISMEMBER online:users "user:42"  # Is user online? true

# 6. Rate Limiting Pattern
# Allow max 100 requests per minute per IP
MULTI
  INCR ratelimit:192.168.1.1
  EXPIRE ratelimit:192.168.1.1 60
EXEC
# If INCR result > 100 → reject request (429 Too Many Requests)

# 7. Distributed Lock (prevent cache stampede)
SET lock:product:123 "owner:pod-a" NX EX 10
# NX = only set if NOT exists (acquire lock)
# EX 10 = auto-expire in 10s (prevent deadlock)
# Returns OK if acquired, nil if someone else holds it`,
        scenarios: [
          { num: 1, title: "E-commerce: product pages viewed 10K times/minute, data changes hourly", answer: "Redis cache-aside + 30 min TTL", details: "Cache product data as Redis HASH. On write (admin updates product), invalidate the key. 30-min TTL as safety net. Cache hit ratio >99% at this read/write ratio. Reduces DB queries by 99%." },
          { num: 2, title: "Gaming: real-time leaderboard for 50M players, top-100 in <10ms", answer: "Redis Sorted Set", details: "ZADD for score updates (O(log N)). ZREVRANGE 0 99 for top 100 (O(log N + 100)). Player rank: ZREVRANK (O(log N)). Single Redis cluster handles 50M members. No database query needed — all in memory." },
          { num: 3, title: "Auth service: validate JWT tokens, 100K validations/second", answer: "Redis SET for blacklisted tokens + TTL", details: "Store revoked tokens: SADD blacklist:tokens <jti>. Check on each request: SISMEMBER blacklist:tokens <jti>. TTL = token expiry time. O(1) lookup. Memcached also works here — simpler, no persistence needed." },
          { num: 4, title: "API rate limiting: 1000 requests/hour per API key", answer: "Redis INCR + EXPIRE (sliding window)", details: "Key: ratelimit:{api_key}:{hour}. INCR on each request. If count > 1000, reject with 429. EXPIRE key after 1 hour. Atomic operations prevent race conditions. Redis cluster handles millions of rate limit checks per second." },
          { num: 5, title: "Session storage for 1M concurrent web users", answer: "Redis with replication", details: "SET session:{id} {JSON} EX 1800 (30-min TTL). Redis cluster mode for horizontal scaling. Multi-AZ replication for HA. If user's session disappears (eviction), they re-login — acceptable trade-off. Don't use Memcached if you need session persistence across restarts." },
        ]
      }
    ]
  },
  {
    id: "cache-patterns", title: "Caching Architecture Patterns", icon: "🏛️",
    content: [
      {
        title: "Multi-Layer Caching Architecture",
        body: "Production systems use multiple cache layers, each serving a different purpose:",
        diagram: `Full Caching Architecture for a Web Application:

  User (Browser)
    │
    │ Browser cache (Cache-Control headers)
    │ localStorage / Service Worker
    ▼
  CloudFront CDN (Edge)
    │ Static assets: images, CSS, JS (TTL: 24hr)
    │ API responses: per-endpoint caching (TTL: 60s)
    ▼
  API Gateway Cache
    │ Cached API responses for identical requests
    │ Avoids invoking Lambda / hitting backend
    ▼
  Application (EKS pods / Lambda)
    │
    ├──→ L1: In-Process Cache (local memory)
    │    HashMap / LRU cache inside the app
    │    Fastest (<0.1ms) but per-instance, not shared
    │    TTL: 10-60 seconds (short — quickly stale)
    │
    ├──→ L2: ElastiCache Redis (shared)
    │    Shared across all app instances
    │    Fast (<1ms) and consistent
    │    TTL: 5-60 minutes
    │
    └──→ Database (Aurora / DynamoDB)
         Source of truth
         Only hit on cache miss at all layers
         With DAX if DynamoDB (adds another cache layer)

  Cache Hit Rate by Layer:
  Browser:    ~60% of requests never leave browser
  CDN:        ~80% of remaining (static assets)
  API GW:     ~50% of API calls (identical queries)
  L1 (local): ~30% of remaining (hot data per instance)
  L2 (Redis): ~90% of remaining (shared hot data)
  Database:   Only ~2-5% of original requests reach DB!`,
        callouts: [
          { type: "key", text: "Interview answer: 'I implement multi-layer caching. Browser cache and CDN handle static content. API Gateway caches identical API responses. Application-level Redis caches database results. Each layer has progressively longer TTLs. The result: the database handles less than 5% of the original request volume, dramatically reducing latency and cost.'" }
        ]
      },
      {
        title: "Cache-Aside Implementation (Code Pattern)",
        body: "",
        code: `# Python — Cache-Aside Pattern with Redis
import redis, json, hashlib

r = redis.Redis(host='redis.cache.amazonaws.com', port=6379,
                decode_responses=True)

def get_product(product_id):
    cache_key = f"product:{product_id}"
    
    # 1. Try cache first
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)  # Cache HIT — ~0.5ms
    
    # 2. Cache MISS — query database
    product = db.query("SELECT * FROM products WHERE id = %s", product_id)
    
    if product is None:
        # Cache null to prevent penetration attacks
        r.setex(cache_key, 60, json.dumps(None))  # Short TTL for nulls
        return None
    
    # 3. Store in cache with jittered TTL (prevent avalanche)
    import random
    ttl = 3600 + random.randint(0, 300)  # 1hr + 0-5min jitter
    r.setex(cache_key, ttl, json.dumps(product))
    
    return product

def update_product(product_id, data):
    # 1. Update database FIRST (source of truth)
    db.execute("UPDATE products SET ... WHERE id = %s", product_id)
    
    # 2. Invalidate cache (DELETE, never UPDATE)
    r.delete(f"product:{product_id}")
    
    # 3. Optional: invalidate related caches
    r.delete(f"category:{data['category_id']}:products")

# Cache stampede prevention with distributed lock
def get_product_safe(product_id):
    cache_key = f"product:{product_id}"
    lock_key = f"lock:{cache_key}"
    
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Try to acquire lock
    if r.set(lock_key, "1", nx=True, ex=10):  # Lock for 10s
        try:
            product = db.query("SELECT * FROM products WHERE id=%s", product_id)
            r.setex(cache_key, 3600, json.dumps(product))
            return product
        finally:
            r.delete(lock_key)
    else:
        # Another process is rebuilding — wait and retry
        import time
        time.sleep(0.1)
        return get_product_safe(product_id)  # Retry`,
        callouts: [
          { type: "warn", text: "Common mistake: updating the cache instead of deleting. Two concurrent writes can leave cache inconsistent with the database. Always DELETE the cache key on write, and let the next read repopulate it." }
        ]
      }
    ]
  }
];

// ==================== SYSTEM DESIGN DATA ====================
const systemDesigns = [
  {
    id: "url", title: "Design a URL Shortener (bit.ly)", difficulty: "Medium", tags: ["API", "Database", "Caching", "Scaling"],
    diagram: `Architecture:

  User → CloudFront → ALB → API Service (EKS)
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
                  Redis       DynamoDB    S3 (analytics)
                  (cache)     (URL store)
  
  Write Flow (create short URL):
  POST /api/shorten {"url": "https://long-url.com/page"}
  → Generate short code (base62 encoding of auto-increment ID or hash)
  → Store: DynamoDB {shortCode: "abc123", longUrl: "https://...", created: ...}
  → Return: https://short.ly/abc123

  Read Flow (redirect):
  GET /abc123
  → Check Redis cache for "abc123" → HIT: 301 redirect
  → MISS: DynamoDB lookup → store in Redis (TTL=24hr) → 301 redirect

  Scale: 100M URLs, 10K reads/sec, 100 writes/sec`,
    components: `Key Design Decisions:

  1. SHORT CODE GENERATION
     Option A: Auto-increment counter (1,2,3...) → base62 encode → "a", "b", ... "abc"
       Pros: Guaranteed unique, sequential
       Cons: Predictable, needs distributed counter
     Option B: Hash (MD5/SHA256) first 7 chars of URL
       Pros: Same URL → same short code (dedup)
       Cons: Collisions possible (handle with retry)
     Option C: Random 7-char base62 string
       Pros: Simple, unpredictable
       Cons: Must check for collision before storing
     Best: Counter-based with base62 for shortest URLs. Use DynamoDB atomic counter.

  2. DATABASE: DynamoDB
     PK: shortCode (direct lookup on redirect)
     GSI: longUrl (check if URL already shortened)
     On-Demand capacity: handles traffic spikes
     TTL: auto-delete expired URLs

  3. CACHING: Redis
     Cache short→long mapping (read-heavy: 100:1 read/write ratio)
     TTL: 24 hours (popular URLs stay cached)
     Cache hit rate: ~95% (most redirects are for popular URLs)

  4. ANALYTICS: Kinesis Firehose → S3
     Log every redirect: shortCode, timestamp, userAgent, IP, referer
     Athena for querying analytics data
     Don't slow down redirects — async logging`,
    callouts: [
      { type: "key", text: "Numbers to know: 7-char base62 = 62^7 = 3.5 trillion unique codes. At 100 URLs/sec = 3.15 billion/year. We have 1000+ years of capacity. 301 redirect (permanent) for SEO, 302 (temporary) if you need click tracking." },
      { type: "scenario", text: "Follow-up: 'How do you handle a URL that gets 1M clicks/second?' → CloudFront caches the 301 redirect at the edge. Redis handles cache misses. DynamoDB On-Demand auto-scales. Kinesis buffers analytics writes. The redirect itself is just a cache lookup + HTTP 301 — extremely lightweight." }
    ]
  },
  {
    id: "notification", title: "Design a Notification System (Email/Push/SMS)", difficulty: "Hard", tags: ["Event-Driven", "SQS", "SNS", "Lambda"],
    diagram: `Architecture:

  Services (Order, Auth, Social)
       │
       ▼
  EventBridge (Central Event Bus)
       │
       ├── Rule: event.type = "order.completed"
       │     → SQS: notification-queue
       │
       ├── Rule: event.type = "user.signup"  
       │     → SQS: notification-queue
       │
       └── Rule: event.type = "friend.request"
             → SQS: notification-queue

  SQS: notification-queue
       │
       ▼
  Lambda: Notification Router
       │
       ├── Check user preferences (DynamoDB)
       │   "user:42 wants email + push, NOT sms"
       │
       ├── Render template (S3 templates)
       │   "Hi {{name}}, your order #{{id}} shipped!"
       │
       └── Route to channels:
           │
           ├── SQS: email-queue → Lambda → SES (email)
           ├── SQS: push-queue  → Lambda → SNS (mobile push)
           └── SQS: sms-queue   → Lambda → SNS (SMS)

  Each channel queue has:
  - DLQ for failed deliveries
  - Retry with exponential backoff
  - Rate limiting (SES: 14/sec, SNS SMS: varies)

  DynamoDB Tables:
  - user-preferences: {userId, channels: [email, push], quiet_hours}
  - notification-log: {userId, notifId, channel, status, timestamp}
  - templates: {templateId, subject, body, variables}`,
    components: `Key Design Decisions:

  1. WHY EVENTBRIDGE?
     Decouples notification system from source services.
     Order service just emits "order.completed" — doesn't know about notifications.
     New notification types = new EventBridge rule, zero code change in source.

  2. WHY SEPARATE QUEUES PER CHANNEL?
     Different rate limits: SES = 14/sec, SNS Push = 10K/sec
     Different failure modes: email bounces ≠ push token expired
     Independent scaling: push queue might have 10x volume of SMS
     Different retry strategies per channel

  3. USER PREFERENCES
     DynamoDB: fast lookup per user
     Respect quiet hours (don't notify at 3 AM)
     Channel preference: some users want email only
     Unsubscribe: per-notification-type granularity

  4. DEDUPLICATION
     SQS FIFO with MessageDeduplicationId = notificationId
     Prevents: user getting 5 "order shipped" emails from retries
     Idempotency key in DynamoDB: notifId + channel (conditional write)

  5. TEMPLATE ENGINE
     Templates in S3 (versioned)
     Variables: {{name}}, {{order_id}}, {{amount}}
     Multi-language support: template_en.html, template_fr.html`,
    callouts: [
      { type: "scenario", text: "Follow-up: 'A marketing team wants to send 10M emails for a campaign. How?' → Don't use the real-time pipeline. Create a separate batch queue. Lambda reads from campaign SQS → SES. Rate limit to stay within SES quota. Use SES Sending Events → Kinesis → S3 for delivery tracking (open, click, bounce). Warm up SES sending reputation gradually." },
      { type: "tip", text: "Always mention: idempotency (prevent duplicate sends), user preferences (respect opt-outs), rate limiting (don't exceed provider limits), DLQ (capture failures), and audit logging (compliance trail for every notification sent)." }
    ]
  },
  {
    id: "chat", title: "Design a Real-Time Chat Application", difficulty: "Hard", tags: ["WebSocket", "DynamoDB", "Pub/Sub", "Scaling"],
    diagram: `Architecture:

  User A (Browser)                    User B (Mobile)
     │ WebSocket                          │ WebSocket
     ▼                                    ▼
  NLB (Layer 4)                       NLB (Layer 4)
     │                                    │
     ▼                                    ▼
  Chat Server Pod 1 (EKS)           Chat Server Pod 2 (EKS)
     │                                    │
     └──────── Redis Pub/Sub ─────────────┘
                    │
       (cross-pod message delivery)
                    │
               DynamoDB
         (persistent message store)

  Send Message Flow:
  1. User A sends message via WebSocket to Pod 1
  2. Pod 1 stores message in DynamoDB
  3. Pod 1 publishes to Redis channel "chat:room:42"
  4. Pod 2 (subscribed to "chat:room:42") receives message
  5. Pod 2 pushes to User B via WebSocket

  Connection Management:
  - Connection registry in Redis: {userId → podId, connId}
  - On connect: register in Redis + subscribe to user's channels
  - On disconnect: cleanup registry
  - Heartbeat every 30s to detect dead connections

  Offline Users:
  - Message stored in DynamoDB regardless
  - Push notification via SNS (mobile push)
  - On reconnect: fetch unread from DynamoDB`,
    components: `Key Design Decisions:

  1. WHY WEBSOCKET + NLB?
     WebSocket = persistent bidirectional connection = real-time
     NLB (not ALB) for WebSocket because:
     - Layer 4 TCP passthrough (lower latency)
     - Supports long-lived connections better
     - Static IP for client reconnection
     ALB works too but adds HTTP parsing overhead

  2. WHY REDIS PUB/SUB?
     User A on Pod 1, User B on Pod 2
     Without Pub/Sub: Pod 1 can't reach User B
     Redis Pub/Sub: all pods subscribe to channels
     Message published once → delivered to all subscribers
     Alternative: Amazon MQ, SNS (higher latency)

  3. DYNAMODB TABLE DESIGN
     Messages table:
       PK: roomId
       SK: timestamp#messageId (sorted by time)
       Attributes: senderId, content, type, readBy
     
     Query: "Get last 50 messages in room 42"
       PK = "room:42", SK > timestamp, Limit 50, ScanForward=false
     
     Unread tracking:
       PK: userId, SK: roomId
       lastReadTimestamp → compare with room's latest message

  4. SCALING TO 1M CONCURRENT USERS
     Each WebSocket connection ≈ 10KB memory
     1M connections ÷ ~50K per pod = 20 pods
     NLB distributes connections across pods
     Redis cluster for Pub/Sub scalability
     Connection draining on pod scale-down

  5. PRESENCE (ONLINE/OFFLINE)
     Redis SET: online:users → SADD/SREM on connect/disconnect
     Heartbeat: every 30s, refresh TTL in Redis
     If heartbeat missed → user is offline
     Presence updates broadcast via Pub/Sub`,
    callouts: [
      { type: "key", text: "Interview sequence: 1) Start with single-server WebSocket. 2) Add Redis Pub/Sub for multi-server delivery. 3) Add DynamoDB for persistence + offline messages. 4) Add presence with Redis SET + heartbeat. 5) Add read receipts, typing indicators. 6) Discuss scaling: connection registry, pod autoscaling, Redis cluster." },
      { type: "warn", text: "Common mistake: using ALB for WebSocket chat. ALB works but adds HTTP overhead and doesn't preserve source IP. NLB is better for pure WebSocket applications. Another mistake: storing messages in Redis — Redis is for Pub/Sub delivery, DynamoDB is for persistence." }
    ]
  },
  {
    id: "feed", title: "Design a Social Media News Feed (Twitter/Instagram)", difficulty: "Hard", tags: ["Fan-out", "Cache", "DynamoDB", "Timeline"],
    diagram: `Two Approaches: Fan-out on Write vs Fan-out on Read

  FAN-OUT ON WRITE (Push Model):
  User posts tweet → write to ALL followers' timelines

  Post by User A (1M followers):
    1. Store tweet in Tweets table
    2. Get follower list (1M users)
    3. For each follower: append tweet to their timeline cache
  
  Read timeline:
    GET timeline:user:B → [tweet5, tweet4, tweet3...] (pre-built!)
    Super fast read: just read from cache/table
  
  Problem: Celebrity with 50M followers → 50M writes per tweet!

  FAN-OUT ON READ (Pull Model):
  User opens feed → fetch latest from everyone they follow

  Read timeline for User B (follows 500 users):
    1. Get list of 500 followed users
    2. Fetch latest tweets from each
    3. Merge-sort by timestamp
    4. Return top 50
  
  Problem: Slow reads — must query 500 users on every feed load

  HYBRID (What Twitter/Instagram Actually Does):
  ┌───────────────────────────────────────────────┐
  │ Celebrity (>10K followers): Fan-out on READ   │
  │   Too expensive to push to millions of feeds  │
  │   Fetch their tweets at read time             │
  │                                               │
  │ Normal users (<10K followers): Fan-out on WRITE│
  │   Affordable to push to a few thousand feeds  │
  │   Feed is pre-built for fast reads            │
  │                                               │
  │ Read: merge pre-built feed + celebrity tweets │
  └───────────────────────────────────────────────┘`,
    components: `AWS Architecture:

  Post Tweet:
  API → Lambda → DynamoDB (tweets table)
              → SQS (fan-out queue)
              → Lambda (fan-out worker)
                  → If followers < 10K: push to Redis timelines
                  → If followers >= 10K: skip (pull at read time)
              → Kinesis → S3 (analytics)

  Read Feed:
  API → Lambda → Redis (pre-built timeline for followed normal users)
              → DynamoDB (fetch latest from followed celebrities)
              → Merge + Sort → Return top 50 items
              → Cache merged result in Redis (TTL=30s)

  DynamoDB Tables:
  tweets:     PK=userId, SK=tweetId (all tweets by user)
  followers:  PK=userId, SK=followerId (follower list)
  following:  PK=userId, SK=followingId (who user follows)
  
  Redis:
  timeline:{userId} → ZSET (sorted by timestamp, capped at 800 items)
  tweet:{tweetId}   → HASH (cached tweet content)
  
  Celebrity detection:
  follower_count > 10,000 → flag as celebrity in user profile
  Updated when follow/unfollow events occur`,
    callouts: [
      { type: "key", text: "Interview gold: 'I'd use a hybrid fan-out approach. Normal users (under 10K followers) fan-out on write — their tweets are pushed to followers' Redis timelines. Celebrities fan-out on read — their tweets are fetched at feed load time and merged with the pre-built timeline. This balances write cost for celebrities with read performance for users.'" },
      { type: "scenario", text: "Follow-up: 'What if a normal user goes viral and suddenly gets 5M followers?' → Background job detects follower count crossing threshold. Stops fan-out-on-write for this user. Existing timeline entries remain but new tweets use pull model. The transition is seamless to followers." }
    ]
  },
  {
    id: "ecommerce", title: "Design an E-Commerce Platform (Cart + Checkout)", difficulty: "Hard", tags: ["Microservices", "ACID", "SQS", "Idempotency"],
    diagram: `Microservices Architecture:

  CloudFront → ALB → API Gateway
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
  Product Service   Cart Service    Order Service
  (Aurora Read      (DynamoDB)      (Aurora Write)
   Replicas)                             │
        │               │          ┌─────┼─────┐
        ▼               ▼          ▼     ▼     ▼
  ElastiCache      ElastiCache  Payment Inventory Notification
  (product cache)  (cart cache) Service  Service   Service
                                (Stripe) (DynamoDB) (SQS→SES)

  Checkout Flow (Saga Pattern):
  1. User clicks "Place Order"
  2. Order Service creates order (status: PENDING)
  3. Inventory Service: reserve items → SUCCESS
     (if FAIL → cancel order, return error)
  4. Payment Service: charge card → SUCCESS
     (if FAIL → release inventory, cancel order)
  5. Order Service: update status to CONFIRMED
  6. SNS → fan-out:
     → Inventory: deduct stock
     → Notification: send confirmation email
     → Analytics: log order event

  ┌─────────── Saga Compensation ───────────┐
  │ Step fails? → Undo all previous steps:  │
  │ Payment fails → release inventory       │
  │ Inventory fails → refund payment        │
  │ Each step is idempotent (safe to retry) │
  └─────────────────────────────────────────┘`,
    components: `Key Design Decisions:

  1. CART: DynamoDB
     PK: userId, SK: productId
     TTL: 30 days (auto-cleanup abandoned carts)
     Why DynamoDB: fast single-item reads, auto-scaling
     Cache in Redis for <1ms cart loading

  2. PRODUCT CATALOG: Aurora Read Replicas + Redis
     Complex queries (search, filter, sort) → Aurora
     Product detail pages → Redis cache (95% hit rate)
     Search → OpenSearch (full-text, faceted search)

  3. ORDERS: Aurora (ACID transactions)
     Order creation needs ACID: create order + line items atomically
     Multi-AZ for HA, automated backups

  4. INVENTORY: DynamoDB with Conditional Writes
     UpdateItem with ConditionExpression: "stock >= :qty"
     Atomic: prevents overselling even at 10K concurrent purchases
     If condition fails → item out of stock, reject order

  5. IDEMPOTENCY (Critical!)
     Every API call has an idempotency key (e.g., orderId)
     Before processing: check if orderId already processed
     Prevents: double charges, duplicate orders from retries
     Store: DynamoDB {idempotencyKey, result, TTL=24hr}

  6. PAYMENT: Stripe with idempotency key
     Stripe API accepts idempotency_key parameter
     Safe to retry: same key → same result (no double charge)`,
    callouts: [
      { type: "key", text: "Three things interviewers look for in e-commerce design: 1) Idempotency — every operation is safe to retry (network failures happen). 2) Saga pattern — distributed transactions across microservices with compensation/rollback. 3) Inventory management — conditional writes to prevent overselling under concurrency." },
      { type: "scenario", text: "Follow-up: 'Flash sale: 10,000 users try to buy 100 items at once.' → DynamoDB conditional write on inventory (stock >= 1). First 100 succeed, rest get 'sold out'. SQS buffers order processing (don't lose orders). Payment retries with idempotency keys. Pre-warm CloudFront and ALB for traffic spike." }
    ]
  }
];

// ==================== INFRASTRUCTURE DESIGN DATA ====================
const infraDesigns = [
  {
    id: "multi-region", title: "Multi-Region Active-Active Architecture", difficulty: "Advanced", tags: ["DR", "Global", "Route53", "Aurora Global"],
    diagram: `Active-Active Multi-Region:

  Users (Global)
       │
       ▼
  Route 53 (Latency-based routing)
       │
  ┌────┴─────────────────────┬─────────────────────────┐
  ▼                          ▼                          ▼
  US-EAST-1                  EU-WEST-1                  AP-NORTHEAST-1
  ┌─────────────┐            ┌─────────────┐            ┌─────────────┐
  │ CloudFront  │            │ CloudFront  │            │ CloudFront  │
  │ ALB         │            │ ALB         │            │ ALB         │
  │ EKS Cluster │            │ EKS Cluster │            │ EKS Cluster │
  │ Aurora (RW) │←──Global──→│ Aurora (RW) │←──Global──→│ Aurora (RW) │
  │ Redis       │  Repl <1s  │ Redis       │  Repl <1s  │ Redis       │
  │ S3 (CRR)   │            │ S3 (CRR)    │            │ S3 (CRR)   │
  └─────────────┘            └─────────────┘            └─────────────┘

  Data Replication:
  Aurora Global DB: <1 second cross-region replication
  S3 Cross-Region Replication: async, minutes
  Redis: per-region (not replicated — each region warms its own cache)
  DynamoDB Global Tables: multi-region active-active, <1s replication`,
    components: `Design Decisions:

  1. ROUTING: Route 53 latency-based
     US users → us-east-1, EU users → eu-west-1, Asia → ap-northeast-1
     Health checks: if a region fails, traffic auto-routes to nearest healthy region
     Failover time: ~60 seconds (DNS TTL)

  2. DATABASE: Aurora Global Database
     Write-forwarding: writes in any region forwarded to primary
     Primary: us-east-1 (configurable)
     Secondaries: eu-west-1, ap-northeast-1 (read-write with forwarding)
     RPO: ~1 second (data loss window on failover)
     RTO: ~1 minute (promote secondary to primary)

  3. CACHE: Regional Redis (NOT replicated)
     Each region has its own ElastiCache Redis cluster
     Avoids cross-region latency for cache reads
     Cache miss → local Aurora replica (still fast)
     Trade-off: brief inconsistency on write (cache invalidation is regional)

  4. STORAGE: S3 Cross-Region Replication
     User uploads in one region → replicated to all
     Static assets served via CloudFront (edge cached)

  5. COST: ~2.5-3x single-region cost
     Worth it for: global user base, <100ms latency requirement
     Alternative: single primary region + CloudFront CDN (cheaper, higher latency)`,
    callouts: [
      { type: "key", text: "Interview: 'Design for 99.99% availability globally.' → Active-active in 3 regions. Route 53 latency routing + health checks. Aurora Global DB for consistent data. If any region fails, traffic routes to remaining regions within 60 seconds. RPO ~1s, RTO ~1min." },
    ]
  },
  {
    id: "vpc-multi", title: "Multi-Account VPC Architecture (Enterprise)", difficulty: "Advanced", tags: ["VPC", "Transit Gateway", "Organizations"],
    diagram: `Enterprise Multi-Account Architecture:

  ┌─── AWS Organization ────────────────────────────────────┐
  │                                                         │
  │  Management Account (billing, SCPs)                     │
  │                                                         │
  │  ┌── Shared Services Account ──────────────────────┐    │
  │  │  VPC: 10.0.0.0/16                               │    │
  │  │  ├── Active Directory / SSO                      │    │
  │  │  ├── CI/CD (CodePipeline, CodeBuild)            │    │
  │  │  ├── Monitoring (Grafana, Prometheus)            │    │
  │  │  ├── Container Registry (ECR)                    │    │
  │  │  └── VPN Endpoint (client VPN for engineers)     │    │
  │  └──────────────┬──────────────────────────────────┘    │
  │                 │                                        │
  │           Transit Gateway                                │
  │          (hub-and-spoke)                                  │
  │                 │                                        │
  │    ┌────────────┼────────────┐                           │
  │    │            │            │                           │
  │  ┌─▼──────┐  ┌─▼──────┐  ┌─▼──────┐                    │
  │  │ Prod   │  │ Staging│  │ Dev    │                    │
  │  │ Account│  │ Account│  │ Account│                    │
  │  │10.1/16 │  │10.2/16 │  │10.3/16 │                    │
  │  │        │  │        │  │        │                    │
  │  │ EKS    │  │ EKS    │  │ EKS    │                    │
  │  │ Aurora │  │ Aurora │  │ RDS    │                    │
  │  │ Redis  │  │ Redis  │  │        │                    │
  │  └────────┘  └────────┘  └────────┘                    │
  │                                                         │
  │  Network Segmentation (TGW Route Tables):               │
  │  ├── Prod can reach: Shared Services only               │
  │  ├── Staging can reach: Shared Services only            │
  │  ├── Dev can reach: Shared Services only                │
  │  └── Prod CANNOT reach Dev/Staging (isolated!)          │
  │                                                         │
  │  ┌── Security/Audit Account ────────────────────────┐   │
  │  │  CloudTrail (org-wide), GuardDuty, Security Hub  │   │
  │  │  Config Rules, AWS Backup                        │   │
  │  └──────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────┘`,
    components: `Key Design Decisions:

  1. WHY MULTI-ACCOUNT?
     Blast radius: prod account issue can't affect dev
     Billing: per-account cost visibility
     IAM: separate admin boundaries per environment
     Compliance: prod account has stricter SCPs

  2. TRANSIT GATEWAY + ROUTE TABLES
     All VPCs connect through TGW (no meshed peering)
     Prod route table: allows traffic to shared-services only
     Dev route table: allows traffic to shared-services only
     Prod ↔ Dev: BLOCKED by route table (network isolation)

  3. CIDR PLANNING (critical — can't change later!)
     Organization: 10.0.0.0/8 (entire range)
     Shared: 10.0.0.0/16, Prod: 10.1.0.0/16
     Staging: 10.2.0.0/16, Dev: 10.3.0.0/16
     No overlaps — all peering/TGW works

  4. CENTRALIZED SERVICES
     ECR in shared account — all environments pull images
     CI/CD in shared account — deploys to all environments
     Monitoring in shared account — single pane of glass
     VPN in shared account — engineers connect once, access all (via TGW)

  5. SECURITY ACCOUNT
     CloudTrail: organization-wide trail → S3 in security account
     GuardDuty: delegated admin in security account
     Config: aggregator in security account
     Read-only access — security team can audit but not modify`,
    callouts: [
      { type: "key", text: "This is the AWS recommended architecture for enterprises. In an interview, draw the org structure with 4-5 accounts, TGW in the middle, and route table isolation. Mention: SCPs for guardrails, centralized logging, and CIDR planning that avoids overlap." },
    ]
  },
  {
    id: "eks-prod", title: "Production EKS Platform Architecture", difficulty: "Advanced", tags: ["EKS", "Terraform", "Observability", "CI/CD"],
    diagram: `Production EKS Platform:

  Developer → Git Push → CodePipeline
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
                  Lint     Build      Security
                  Test     Docker     Trivy Scan
                           Push ECR
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
                Staging    Manual     Production
                Deploy     Approval   Deploy (Helm)
                              │
  ┌───────────────────────────┼──────────────────────────┐
  │              EKS Cluster (Production)                 │
  │                                                      │
  │  ┌─── Ingress Layer ────────────────────────────┐    │
  │  │ AWS LB Controller → ALB (path-based routing) │    │
  │  │ cert-manager → ACM certificates               │    │
  │  │ External-DNS → Route 53 auto-registration     │    │
  │  └──────────────────────────────────────────────┘    │
  │                                                      │
  │  ┌─── Service Mesh (Istio) ─────────────────────┐    │
  │  │ mTLS between all services                     │    │
  │  │ Traffic splitting (canary deployments)         │    │
  │  │ Circuit breaker, retry, timeout policies       │    │
  │  └──────────────────────────────────────────────┘    │
  │                                                      │
  │  ┌─── Workloads ────────────────────────────────┐    │
  │  │ On-Demand Node Group: critical services       │    │
  │  │ Spot Node Group: batch, CI runners            │    │
  │  │ Fargate Profile: CronJobs, short-lived tasks  │    │
  │  │ Karpenter: auto-provisions optimal instances   │    │
  │  └──────────────────────────────────────────────┘    │
  │                                                      │
  │  ┌─── Security ─────────────────────────────────┐    │
  │  │ IRSA: per-pod IAM roles                       │    │
  │  │ Network Policies: pod-to-pod firewall          │    │
  │  │ OPA/Gatekeeper: policy enforcement             │    │
  │  │ Secrets: AWS Secrets Manager CSI driver         │    │
  │  │ Pod Security Standards: restricted profile      │    │
  │  └──────────────────────────────────────────────┘    │
  │                                                      │
  │  ┌─── Observability ────────────────────────────┐    │
  │  │ Metrics: Prometheus → Amazon Managed Grafana  │    │
  │  │ Logs: Fluent Bit → CloudWatch + OpenSearch    │    │
  │  │ Traces: ADOT → X-Ray                          │    │
  │  │ Alerts: Grafana → SNS → PagerDuty             │    │
  │  └──────────────────────────────────────────────┘    │
  └──────────────────────────────────────────────────────┘`,
    components: `Design Decisions:

  1. NODE STRATEGY: Mixed compute
     On-Demand (m7g.xlarge): API services, databases proxies — can't tolerate interruption
     Spot (mixed types): background workers, build agents — tolerate interruption
     Fargate: CronJobs, one-off tasks — no idle node cost
     Karpenter over Cluster Autoscaler: faster scaling, better bin-packing, auto-selects cheapest instance type

  2. NETWORKING
     Private cluster: API server not exposed to internet
     AWS LB Controller: ALB for HTTP, NLB for TCP/gRPC
     External-DNS: auto-creates Route 53 records from Ingress annotations
     VPC CNI with prefix delegation: more pods per node

  3. CI/CD: GitOps with Helm
     CodePipeline: build + push to ECR
     Helm charts: versioned, templated deployments
     Staging → manual approval → production
     Rollback: helm rollback <release> <revision>

  4. OBSERVABILITY (Three Pillars)
     Metrics: Prometheus scrapes pods → Grafana dashboards
     Logs: Fluent Bit DaemonSet → CloudWatch (real-time) + OpenSearch (search)
     Traces: ADOT collector → X-Ray (distributed tracing across services)
     Alerts: Grafana alerts on SLO breaches → SNS → PagerDuty

  5. COST OPTIMIZATION
     Spot for 60% of compute (saves ~60-70%)
     Graviton instances (ARM) for 40% better price-perf
     Karpenter consolidation: removes underutilized nodes
     Scheduled scaling: dev/staging → 0 at night`,
    callouts: [
      { type: "key", text: "This is THE most-asked infrastructure design question for cloud/DevOps roles. Cover: networking (private cluster, LB Controller), compute (On-Demand + Spot + Fargate), security (IRSA, network policies, secrets), observability (metrics/logs/traces), and CI/CD (GitOps, Helm, canary). Draw the diagram and walk through each layer." },
    ]
  },
  {
    id: "serverless", title: "Serverless Event-Driven Data Pipeline", difficulty: "Medium", tags: ["Lambda", "Kinesis", "S3", "Glue", "Athena"],
    diagram: `Real-Time + Batch Analytics Pipeline:

  ┌─── Real-Time Path ──────────────────────────────────┐
  │                                                      │
  │  Data Sources                                        │
  │  (IoT, Click, Logs)                                  │
  │       │                                              │
  │       ▼                                              │
  │  Kinesis Data Streams (real-time ingestion)          │
  │       │                                              │
  │       ├──→ Lambda (real-time processing)              │
  │       │    ├── Enrich / transform / filter           │
  │       │    ├── Anomaly detection alerts → SNS        │
  │       │    └── Real-time dashboard → DynamoDB → API  │
  │       │                                              │
  │       └──→ Kinesis Firehose → S3 (raw data lake)     │
  │            (buffered delivery, Parquet conversion)    │
  │                                                      │
  └──────────────────────────────────────────────────────┘

  ┌─── Batch Path ──────────────────────────────────────┐
  │                                                      │
  │  S3 Raw Data Lake                                    │
  │       │                                              │
  │       ▼                                              │
  │  AWS Glue (ETL)                                      │
  │  ├── Crawlers: auto-discover schema                  │
  │  ├── Jobs: transform, aggregate, partition            │
  │  └── Data Catalog: metadata for Athena               │
  │       │                                              │
  │       ▼                                              │
  │  S3 Processed Data Lake (Parquet, partitioned)       │
  │       │                                              │
  │       ├──→ Athena: ad-hoc SQL queries                │
  │       ├──→ Redshift Spectrum: complex analytics      │
  │       └──→ QuickSight: BI dashboards                 │
  │                                                      │
  └──────────────────────────────────────────────────────┘

  S3 Data Lake Organization:
  s3://data-lake/
  ├── raw/         (Firehose delivery, original format)
  │   └── year=2026/month=03/day=17/
  ├── processed/   (Glue ETL output, Parquet)
  │   └── year=2026/month=03/day=17/
  ├── aggregated/  (daily/hourly rollups)
  └── archive/     (Glacier, >90 days old)`,
    components: `Design Decisions:

  1. WHY KINESIS + FIREHOSE (not just SQS)?
     Kinesis: ordered stream, multiple consumers, replay capability
     Firehose: managed delivery to S3 with auto Parquet conversion
     SQS: message consumed once, no replay — wrong for analytics

  2. S3 PARTITIONING (Critical for query performance!)
     Partition by: year/month/day/hour
     Athena scans only relevant partitions
     Without partitioning: full table scan ($$$, slow)
     With partitioning: scan 1 day out of 365 = 0.3% of data

  3. PARQUET FORMAT
     Columnar storage: query "SELECT avg(price)" reads only price column
     Compressed: 80-90% smaller than CSV/JSON
     Athena cost: $5 per TB scanned → Parquet reduces cost by 90%

  4. GLUE ETL
     Serverless Spark: no infrastructure to manage
     Crawlers auto-detect schema changes
     Jobs: deduplicate, aggregate, join, partition

  5. COST
     Kinesis: ~$0.015/shard/hour + $0.014/million PUT
     Firehose: $0.029/GB ingested
     S3: $0.023/GB stored
     Athena: $5/TB scanned (Parquet = 90% cheaper)
     Glue: $0.44/DPU-hour (serverless, pay per job run)
     Total for 1TB/day pipeline: ~$200-400/month`,
    callouts: [
      { type: "key", text: "This is the standard AWS data pipeline architecture. In interviews, emphasize: real-time path for alerts/dashboards (Kinesis → Lambda → DynamoDB) AND batch path for analytics (S3 → Glue → Athena). Mention Parquet + partitioning for cost optimization — it shows you understand data engineering, not just infrastructure." },
    ]
  }
];

// ==================== MAIN COMPONENT ====================
export default function CachingAndSystemDesign() {
  const [activeTab, setActiveTab] = useState("caching");
  const [activeSection, setActiveSection] = useState(0);
  const [activeDesign, setActiveDesign] = useState(0);
  const [openPanels, setOpenPanels] = useState({});
  const toggle = (k) => setOpenPanels(p => ({ ...p, [k]: p[k] === undefined ? false : !p[k] }));
  const isOpen = (k) => openPanels[k] !== false;

  const designList = activeTab === "sysdesign" ? systemDesigns : infraDesigns;

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", background: "#060D1B", minHeight: "100vh", color: "#CBD5E1" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "linear-gradient(160deg, #0a1020, #121830, #0a1020)", borderBottom: "1px solid #1a2744", padding: "22px 24px 14px" }}>
        <h1 style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 700, background: "linear-gradient(90deg, #F59E0B, #EF4444, #A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Caching, System Design & Infrastructure Design
        </h1>
        <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>
          {cachingSections.reduce((a,s) => a + s.content.length, 0)} caching topics • {systemDesigns.length} system designs • {infraDesigns.length} infra designs • Diagrams + Code + Scenarios
        </p>

        <div style={{ display: "flex", gap: 4, marginTop: 14 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setActiveSection(0); setActiveDesign(0); setOpenPanels({}); }} style={{
              padding: "9px 18px", border: activeTab === t.id ? "2px solid #F59E0B" : "1px solid #1a2744",
              borderRadius: "8px 8px 0 0", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
              background: activeTab === t.id ? "#F59E0B15" : "transparent",
              color: activeTab === t.id ? "#F59E0B" : "#64748B", transition: "all 0.15s",
              borderBottom: activeTab === t.id ? "2px solid #F59E0B" : "2px solid transparent"
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 24px", maxWidth: 960, margin: "0 auto" }}>
        {/* ===== CACHING TAB ===== */}
        {activeTab === "caching" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {cachingSections.map((s, i) => (
                <button key={i} onClick={() => { setActiveSection(i); setOpenPanels({}); }} style={{
                  padding: "9px 16px", border: activeSection === i ? "2px solid #F59E0B" : "1px solid #1a2744",
                  borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                  background: activeSection === i ? "#F59E0B12" : "#0d1525", color: activeSection === i ? "#F59E0B" : "#64748B"
                }}>
                  {s.icon} {s.title}
                </button>
              ))}
            </div>

            {cachingSections[activeSection]?.content.map((item, i) => {
              const key = `cache-${activeSection}-${i}`;
              return (
                <div key={i} style={{ background: "#0d1525", border: "1px solid #1a2744", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
                  <button onClick={() => toggle(key)} style={{
                    width: "100%", padding: "14px 18px", border: "none", background: isOpen(key) ? "#F59E0B08" : "transparent",
                    cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "#F1F5F9", textAlign: "left",
                    display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}>
                    {item.title}
                    <span style={{ fontSize: 12, color: "#475569", transform: isOpen(key) ? "rotate(180deg)" : "none", transition: "0.2s" }}>▼</span>
                  </button>
                  {isOpen(key) && (
                    <div style={{ padding: "4px 18px 18px" }}>
                      {item.body && <p style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.7 }}>{item.body}</p>}
                      {item.diagram && <Diagram>{item.diagram}</Diagram>}
                      {item.code && <CmdBlock>{item.code}</CmdBlock>}
                      {item.callouts?.map((c, ci) => <Callout key={ci} type={c.type}>{c.text}</Callout>)}
                      {item.scenarios?.map((s, si) => <ScenarioCard key={si} num={s.num} title={s.title} answer={s.answer} details={s.details} color="#F59E0B" />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ===== SYSTEM DESIGN / INFRA DESIGN TABS ===== */}
        {(activeTab === "sysdesign" || activeTab === "infradesign") && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {designList.map((d, i) => (
                <button key={i} onClick={() => { setActiveDesign(i); setOpenPanels({}); }} style={{
                  padding: "10px 14px", border: activeDesign === i ? "2px solid #A78BFA" : "1px solid #1a2744",
                  borderRadius: 9, cursor: "pointer", fontFamily: "inherit", textAlign: "left", flex: "1 1 auto", minWidth: 200,
                  background: activeDesign === i ? "#A78BFA10" : "#0d1525", transition: "all 0.15s"
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: activeDesign === i ? "#A78BFA" : "#94A3B8" }}>{d.title}</div>
                  <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: d.difficulty === "Hard" ? "#EF444420" : d.difficulty === "Advanced" ? "#A78BFA20" : "#F59E0B20", color: d.difficulty === "Hard" ? "#EF4444" : d.difficulty === "Advanced" ? "#A78BFA" : "#F59E0B" }}>{d.difficulty}</span>
                    {d.tags.slice(0, 3).map(t => <span key={t} style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "#1a2744", color: "#64748B" }}>{t}</span>)}
                  </div>
                </button>
              ))}
            </div>

            {designList[activeDesign] && (() => {
              const d = designList[activeDesign];
              return (
                <div>
                  {/* Architecture Diagram */}
                  <div style={{ background: "#0d1525", border: "1px solid #1a2744", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
                    <button onClick={() => toggle("arch")} style={{
                      width: "100%", padding: "14px 18px", border: "none", background: isOpen("arch") ? "#A78BFA08" : "transparent",
                      cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "#F1F5F9", textAlign: "left",
                      display: "flex", justifyContent: "space-between"
                    }}>
                      <span>📐 Architecture Diagram</span>
                      <span style={{ fontSize: 12, color: "#475569", transform: isOpen("arch") ? "rotate(180deg)" : "none", transition: "0.2s" }}>▼</span>
                    </button>
                    {isOpen("arch") && <div style={{ padding: "4px 18px 18px" }}><Diagram>{d.diagram}</Diagram></div>}
                  </div>

                  {/* Components & Decisions */}
                  <div style={{ background: "#0d1525", border: "1px solid #1a2744", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
                    <button onClick={() => toggle("comp")} style={{
                      width: "100%", padding: "14px 18px", border: "none", background: isOpen("comp") ? "#A78BFA08" : "transparent",
                      cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "#F1F5F9", textAlign: "left",
                      display: "flex", justifyContent: "space-between"
                    }}>
                      <span>🔧 Components & Design Decisions</span>
                      <span style={{ fontSize: 12, color: "#475569", transform: isOpen("comp") ? "rotate(180deg)" : "none", transition: "0.2s" }}>▼</span>
                    </button>
                    {isOpen("comp") && <div style={{ padding: "4px 18px 18px" }}><CmdBlock>{d.components}</CmdBlock></div>}
                  </div>

                  {/* Key Points & Scenarios */}
                  {d.callouts && (
                    <div style={{ background: "#0d1525", border: "1px solid #1a2744", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
                      <button onClick={() => toggle("tips")} style={{
                        width: "100%", padding: "14px 18px", border: "none", background: isOpen("tips") ? "#A78BFA08" : "transparent",
                        cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "#F1F5F9", textAlign: "left",
                        display: "flex", justifyContent: "space-between"
                      }}>
                        <span>🎯 Interview Tips & Follow-up Scenarios</span>
                        <span style={{ fontSize: 12, color: "#475569", transform: isOpen("tips") ? "rotate(180deg)" : "none", transition: "0.2s" }}>▼</span>
                      </button>
                      {isOpen("tips") && (
                        <div style={{ padding: "4px 18px 18px" }}>
                          {d.callouts.map((c, ci) => <Callout key={ci} type={c.type}>{c.text}</Callout>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", padding: "20px", color: "#1E293B", fontSize: 11, borderTop: "1px solid #0d1525", marginTop: 32 }}>
        Caching, System Design & Infrastructure Design — Cloud Engineer Interview Prep — March 2026
      </div>
    </div>
  );
}
