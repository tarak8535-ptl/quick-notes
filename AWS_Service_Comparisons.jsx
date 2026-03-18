import { useState } from "react";

// ===== MINI COMPONENTS =====
const Badge = ({ text, color }) => (
  <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: color + "20", color, marginRight: 4, marginBottom: 3, letterSpacing: 0.3 }}>{text}</span>
);

const ScenarioCard = ({ num, title, answer, why, color }) => (
  <div style={{ margin: "10px 0", background: "#0a1628", border: "1px solid #1a2744", borderRadius: 10, overflow: "hidden" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #111d33" }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: color + "20", color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{num}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", lineHeight: 1.4 }}>{title}</div>
    </div>
    <div style={{ padding: "10px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>✅</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>Use: {answer}</span>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.7, color: "#94A3B8" }}>{why}</div>
    </div>
  </div>
);

const RowItem = ({ label, vals, colors }) => (
  <div style={{ display: "grid", gridTemplateColumns: `160px repeat(${vals.length}, 1fr)`, borderBottom: "1px solid #111d33", fontSize: 12 }}>
    <div style={{ padding: "8px 12px", fontWeight: 600, color: "#94A3B8", background: "#080e1e" }}>{label}</div>
    {vals.map((v, i) => (
      <div key={i} style={{ padding: "8px 12px", color: "#CBD5E1", borderLeft: "1px solid #111d33", lineHeight: 1.5 }}>{v}</div>
    ))}
  </div>
);

const CompTable = ({ headers, rows, colors }) => (
  <div style={{ border: "1px solid #1a2744", borderRadius: 10, overflow: "hidden", margin: "12px 0" }}>
    <div style={{ display: "grid", gridTemplateColumns: `160px repeat(${headers.length}, 1fr)` }}>
      <div style={{ padding: "10px 12px", background: "#0d1525", fontWeight: 700, fontSize: 12, color: "#475569" }}>Feature</div>
      {headers.map((h, i) => (
        <div key={i} style={{ padding: "10px 12px", background: (colors?.[i] || "#3B82F6") + "15", fontWeight: 700, fontSize: 13, color: colors?.[i] || "#3B82F6", borderLeft: "1px solid #111d33" }}>{h}</div>
      ))}
    </div>
    {rows.map((r, i) => <RowItem key={i} label={r[0]} vals={r.slice(1)} colors={colors} />)}
  </div>
);

// ===== ALL COMPARISONS =====
const comparisons = [
  {
    id: "compute",
    category: "Compute",
    icon: "⚡",
    color: "#EF4444",
    items: [
      {
        title: "EC2 vs Lambda vs Fargate vs App Runner",
        subtitle: "How should I run my code?",
        colors: ["#EF4444", "#F59E0B", "#3B82F6", "#10B981"],
        headers: ["EC2", "Lambda", "Fargate", "App Runner"],
        rows: [
          ["Type", "Virtual machine", "Serverless function", "Serverless container", "Managed container"],
          ["Max runtime", "Unlimited", "15 minutes", "Unlimited", "Unlimited"],
          ["Scaling", "ASG (minutes)", "Instant (ms)", "ECS/EKS (seconds)", "Automatic (seconds)"],
          ["Scale to zero", "No (min 1 instance)", "Yes ($0 when idle)", "Yes (ECS min=0)", "Yes"],
          ["Control", "Full OS access", "Code only", "Container level", "Container/source"],
          ["Cold start", "None (always on)", "200ms-3s", "30-60s (new task)", "Seconds"],
          ["Pricing", "Per second running", "Per ms of execution", "Per vCPU/GB-second", "Per vCPU/GB-second"],
          ["GPU support", "Yes (P5, G5)", "No", "No", "No"],
          ["VPC access", "Always in VPC", "Optional (adds latency)", "Always in VPC", "Optional"],
          ["Use for", "Databases, legacy, GPU, full control", "Event handlers, APIs, cron, glue code", "Long-running containers, microservices", "Simple web apps, APIs, quick deploy"],
          ["Ops overhead", "High (patching, AMIs)", "Zero", "Low", "Zero"],
        ],
        scenarios: [
          { num: 1, title: "REST API that receives 100 requests/day with occasional spikes to 10K", answer: "Lambda + API Gateway", why: "Traffic is bursty and mostly idle. Lambda scales to zero when idle (zero cost) and instantly handles spikes. EC2 would sit idle 99% of the time. Fargate's 30-60s cold start is too slow for user-facing APIs." },
          { num: 2, title: "Machine learning model training on GPU for 8 hours", answer: "EC2 (P5/G5 instances)", why: "Lambda has 15-min limit and no GPU. Fargate has no GPU. Only EC2 offers GPU instances. Use Spot for up to 90% savings on training jobs." },
          { num: 3, title: "Microservice that runs 24/7, handles 1000 req/sec, needs 2GB memory", answer: "Fargate (ECS or EKS)", why: "Always-on rules out Lambda (cost would be huge at 1000 rps). Fargate avoids EC2 server management. Container gives you control over dependencies. EKS if you need K8s, ECS if you want simplicity." },
          { num: 4, title: "Startup MVP — containerized Node.js app, team of 2, need to ship fast", answer: "App Runner", why: "Push container image or connect GitHub repo → get a URL. Zero infrastructure to manage. Auto-scales, HTTPS included. When you outgrow it, migrate to ECS/EKS." },
          { num: 5, title: "Nightly batch job that processes 500GB of data, takes 4 hours", answer: "EC2 Spot or AWS Batch", why: "Lambda's 15-min limit rules it out. EC2 Spot gives up to 90% discount for interruptible jobs. AWS Batch manages the compute environment automatically. Fargate works too but Spot EC2 is cheaper for long jobs." },
          { num: 6, title: "Image thumbnail generator triggered by S3 uploads", answer: "Lambda", why: "Classic Lambda use case: event-driven (S3 trigger), short-lived (resize takes seconds), bursty (0 to 10K uploads), stateless. Pay nothing when no uploads happening." },
          { num: 7, title: "Oracle database that requires specific kernel parameters and licensing", answer: "EC2 Dedicated Host", why: "Need full OS control for kernel tuning. Oracle requires per-socket licensing → Dedicated Host lets you control socket placement. No other option gives this level of control." },
          { num: 8, title: "Real-time WebSocket server for a chat application with 50K concurrent connections", answer: "EC2 or Fargate (EKS)", why: "Lambda doesn't support persistent WebSocket connections well (max 15-min). EC2/Fargate can hold connections indefinitely. Use NLB for TCP passthrough. If connections are bursty, consider API Gateway WebSocket + Lambda." },
        ]
      },
      {
        title: "ECS vs EKS",
        subtitle: "Which container orchestrator?",
        colors: ["#F59E0B", "#3B82F6"],
        headers: ["ECS", "EKS"],
        rows: [
          ["Orchestrator", "AWS proprietary", "Kubernetes (open-source)"],
          ["Learning curve", "Low (AWS-native concepts)", "High (K8s ecosystem)"],
          ["Portability", "AWS only", "Any K8s cluster (GKE, AKS, on-prem)"],
          ["Config format", "Task Definitions (JSON)", "YAML manifests (Pods, Deployments, Services)"],
          ["Service mesh", "AWS App Mesh", "Istio, Linkerd, any K8s mesh"],
          ["Package manager", "None built-in", "Helm charts"],
          ["GitOps", "Limited", "ArgoCD, FluxCD"],
          ["Monitoring", "CloudWatch native", "Prometheus, Grafana, CloudWatch"],
          ["Scaling", "ECS Service Auto Scaling", "HPA, VPA, Cluster Autoscaler, Karpenter"],
          ["Networking", "awsvpc mode (task-level ENI)", "VPC CNI (pod-level IP)"],
          ["Control plane cost", "Free", "$0.10/hour ($73/month)"],
          ["IAM integration", "Task Role", "IRSA (per-pod IAM)"],
          ["Best for", "Small teams, AWS-only, simpler apps", "K8s teams, multi-cloud, complex architectures"],
        ],
        scenarios: [
          { num: 1, title: "Startup with 3 engineers deploying 5 microservices, AWS only", answer: "ECS on Fargate", why: "Small team = less ops bandwidth. ECS is simpler to learn and operate. Fargate eliminates server management. No K8s expertise needed. Free control plane saves $73/month." },
          { num: 2, title: "Enterprise with 50 engineers, 40 services, plans to use GCP in future", answer: "EKS", why: "Team size justifies K8s complexity. Same manifests work on GKE later. Rich ecosystem (Helm, ArgoCD, Istio) supports complex workflows. IRSA provides fine-grained pod security." },
          { num: 3, title: "Data pipeline with 3 containerized jobs, triggered hourly by EventBridge", answer: "ECS on Fargate", why: "Scheduled tasks are simple on ECS. No need for K8s complexity. Fargate scales tasks to zero between runs. EventBridge → ECS RunTask is a native integration." },
          { num: 4, title: "Team already uses Helm charts, ArgoCD, and Prometheus in another environment", answer: "EKS", why: "Existing K8s tooling and expertise transfers directly. Helm charts are reusable. ArgoCD GitOps workflow continues unchanged. Prometheus monitoring stack works as-is." },
        ]
      }
    ]
  },
  {
    id: "storage",
    category: "Storage",
    icon: "💾",
    color: "#10B981",
    items: [
      {
        title: "S3 vs EBS vs EFS vs FSx",
        subtitle: "Which storage type for which workload?",
        colors: ["#10B981", "#F59E0B", "#3B82F6", "#A78BFA"],
        headers: ["S3", "EBS", "EFS", "FSx"],
        rows: [
          ["Type", "Object storage", "Block storage", "File storage (NFS)", "File storage (various)"],
          ["Access method", "HTTP API (REST)", "Mount to 1 EC2", "Mount to many EC2/EKS", "Mount to EC2 (NFS/SMB/Lustre)"],
          ["Max size", "Unlimited", "64 TB per volume", "Unlimited (auto-grows)", "Varies by type"],
          ["Availability", "Multi-AZ (11 nines)", "Single AZ", "Multi-AZ", "Single or Multi-AZ"],
          ["Performance", "High throughput", "Up to 256K IOPS", "Burst or Provisioned", "Up to millions IOPS (Lustre)"],
          ["Concurrent access", "Unlimited readers", "1 instance (io2: 16)", "Thousands of instances", "Thousands of instances"],
          ["Modify in-place", "No (replace entire object)", "Yes (block-level)", "Yes (file-level)", "Yes (file-level)"],
          ["Cost (per GB/mo)", "$0.023 (Standard)", "$0.08 (gp3)", "$0.30 (Standard)", "$0.013-0.14 (varies)"],
          ["Backup", "Versioning, CRR", "Snapshots to S3", "AWS Backup", "Backups to S3"],
        ],
        scenarios: [
          { num: 1, title: "Store 10TB of user-uploaded images for a web application", answer: "S3", why: "Unlimited storage, pay per GB. HTTP API = accessible from anywhere (Lambda, EC2, CloudFront). Versioning protects against accidental deletes. Lifecycle policies auto-archive old images to Glacier." },
          { num: 2, title: "Root volume for an EC2 instance running PostgreSQL", answer: "EBS (gp3 or io2)", why: "Block storage required for database files. gp3 for general workloads (3K IOPS baseline). io2 for high-performance production databases (up to 256K IOPS). Snapshots for backups." },
          { num: 3, title: "Shared config files and model artifacts accessed by 20 EKS pods", answer: "EFS", why: "Multiple pods need to read/write the same files simultaneously. EFS provides NFS mounts across AZs. Auto-scales storage. Kubernetes PersistentVolume support with EFS CSI driver." },
          { num: 4, title: "High-performance computing (HPC) job reading 500GB dataset at 100 GB/s", answer: "FSx for Lustre", why: "Lustre is purpose-built for HPC — millions of IOPS, hundreds of GB/s throughput. Can be linked to S3 as a data repository. Temporary filesystem for job duration, then results back to S3." },
          { num: 5, title: "Windows file server migration — SMB shares, Active Directory integration", answer: "FSx for Windows File Server", why: "Native SMB protocol, Active Directory integration, DFS namespaces. Drop-in replacement for on-premises Windows file servers. EFS doesn't support SMB/Windows." },
          { num: 6, title: "Terraform state files that multiple engineers need to access", answer: "S3", why: "Object storage is perfect for state files. Versioning preserves every version (rollback capability). Server-side encryption with KMS. DynamoDB locking prevents concurrent access. Not EFS — API access is better than file mount for this use case." },
          { num: 7, title: "Container logs that need to be written by many pods and analyzed in real-time", answer: "CloudWatch Logs (not a storage service) or OpenSearch", why: "Don't use EFS/S3 for logs directly. Use Fluent Bit → CloudWatch Logs (real-time queries with Log Insights) or → OpenSearch (full-text search). S3 for long-term log archival via Firehose." },
        ]
      },
      {
        title: "S3 Storage Classes — Which Tier?",
        subtitle: "Optimize cost based on access frequency",
        colors: ["#10B981", "#3B82F6", "#F59E0B", "#A78BFA", "#EC4899", "#EF4444"],
        headers: ["Standard", "Intelligent-Tier", "Standard-IA", "Glacier Instant", "Glacier Flexible", "Deep Archive"],
        rows: [
          ["Cost/GB/mo", "$0.023", "$0.023*", "$0.0125", "$0.004", "$0.0036", "$0.00099"],
          ["Retrieval fee", "None", "None", "$0.01/GB", "$0.03/GB", "$0.01-0.03/GB", "$0.02/GB"],
          ["Retrieval time", "Instant", "Instant", "Instant", "Instant (ms)", "1-12 hours", "12-48 hours"],
          ["Min storage", "None", "None", "30 days", "90 days", "90 days", "180 days"],
          ["Availability", "99.99%", "99.9%", "99.9%", "99.9%", "99.99%", "99.99%"],
          ["AZs", "≥3", "≥3", "≥3", "≥3", "≥3", "≥3"],
        ],
        scenarios: [
          { num: 1, title: "Frequently accessed website assets (images, CSS, JS)", answer: "S3 Standard", why: "Accessed constantly, need instant retrieval, no retrieval fees. Combine with CloudFront CDN for edge caching." },
          { num: 2, title: "Data lake with unpredictable access patterns — some files hot, some cold", answer: "S3 Intelligent-Tiering", why: "Automatically moves objects between tiers based on access. No retrieval fees. Small monitoring fee ($0.0025/1K objects). Set-it-and-forget-it optimization." },
          { num: 3, title: "Monthly financial reports, accessed a few times per quarter", answer: "S3 Standard-IA", why: "Infrequent access (few times/year). 50% cheaper than Standard. Instant retrieval when needed. Small retrieval fee is fine for occasional access." },
          { num: 4, title: "Compliance archives, must be retrievable immediately if audited", answer: "Glacier Instant Retrieval", why: "~80% cheaper than Standard. Instant retrieval (milliseconds) when needed — meets compliance requirement for immediate access. 90-day minimum storage commitment." },
          { num: 5, title: "Backup tapes being migrated to cloud, accessed once in 5 years", answer: "Glacier Deep Archive", why: "Cheapest option at $0.00099/GB/month. 1TB costs ~$1/month vs $23 in Standard. 12-48 hour retrieval is acceptable for rare access. 180-day minimum." },
          { num: 6, title: "Video surveillance footage: 30-day active review, 1-year archive, 7-year legal hold", answer: "Lifecycle Policy: Standard → IA → Glacier → Deep Archive", why: "Day 0-30: Standard (active review). Day 30-90: Standard-IA (occasional review). Day 90-365: Glacier Flexible (rare access). Day 365-2555: Deep Archive (legal hold). Auto-transitions via lifecycle rules." },
        ]
      }
    ]
  },
  {
    id: "database",
    category: "Database",
    icon: "🗄️",
    color: "#8B5CF6",
    items: [
      {
        title: "RDS vs Aurora vs DynamoDB vs ElastiCache vs Redshift",
        subtitle: "Which database for which workload?",
        colors: ["#F59E0B", "#8B5CF6", "#3B82F6", "#EF4444", "#10B981"],
        headers: ["RDS", "Aurora", "DynamoDB", "ElastiCache", "Redshift"],
        rows: [
          ["Type", "Relational (managed)", "Relational (AWS-built)", "NoSQL (key-value)", "In-memory cache", "Data warehouse"],
          ["Engine", "MySQL, PG, Oracle, SQL Server", "MySQL/PG compatible", "Proprietary", "Redis / Memcached", "PostgreSQL-based"],
          ["Scaling", "Vertical (instance resize)", "Serverless v2 auto-scale", "Unlimited horizontal", "Cluster mode (Redis)", "Add nodes (RA3)"],
          ["Read replicas", "Up to 5", "Up to 15", "Global Tables", "Redis cluster", "Leader + compute nodes"],
          ["Latency", "Low ms", "Low ms", "Single-digit ms", "Microseconds", "Seconds (complex queries)"],
          ["Max storage", "64 TB", "128 TB (auto-grow)", "Unlimited", "In-memory (up to TB)", "Petabytes"],
          ["Pricing model", "Instance hours + storage", "Instance/ACU + storage", "Per request or provisioned", "Node hours", "Per node hour + storage"],
          ["Serverless", "RDS Proxy only", "Aurora Serverless v2", "On-Demand mode", "No", "Redshift Serverless"],
          ["Best for", "Traditional RDBMS, lift-and-shift", "High-perf relational, auto-scale", "High-scale, flexible schema", "Caching, sessions, leaderboards", "Analytics, BI, reporting"],
        ],
        scenarios: [
          { num: 1, title: "E-commerce product catalog with complex JOIN queries and ACID transactions", answer: "Aurora PostgreSQL", why: "Relational data with complex relationships (products → categories → reviews → orders). ACID transactions required for orders. Aurora is 3-5x faster than RDS PostgreSQL. Up to 15 read replicas for product listing reads. Serverless v2 handles Black Friday traffic automatically." },
          { num: 2, title: "User session storage for 1M concurrent users, sub-millisecond reads", answer: "ElastiCache (Redis)", why: "Sessions are key-value (sessionID → data). Microsecond latency. Redis supports TTL (auto-expire sessions). Replication for HA. DynamoDB is an alternative, but ElastiCache is faster for simple key lookups." },
          { num: 3, title: "Gaming leaderboard with 50M users, need top-100 in real-time", answer: "ElastiCache (Redis) with Sorted Sets", why: "Redis Sorted Sets are purpose-built for leaderboards — ZADD to add scores, ZRANGE to get top-N, ZRANK to get player rank. All operations are O(log N). DynamoDB can't efficiently query \"top 100\" without scanning." },
          { num: 4, title: "IoT device telemetry — 100K devices sending data every second", answer: "DynamoDB", why: "Massive write throughput with On-Demand mode. Partition key = deviceID, sort key = timestamp. TTL auto-deletes old telemetry. No schema changes needed when new device types appear. Global Tables for multi-region IoT." },
          { num: 5, title: "Quarterly BI reports over 5 years of sales data (50TB)", answer: "Redshift", why: "Columnar storage optimized for analytical queries over huge datasets. Redshift Spectrum queries S3 data directly without loading. Integrate with BI tools (Tableau, MicroStrategy). Materialized views for frequent reports. Concurrency scaling for multiple analysts." },
          { num: 6, title: "Migrating on-prem Oracle database to AWS with minimal code changes", answer: "RDS for Oracle (or Aurora PostgreSQL with SCT)", why: "RDS Oracle: zero code changes, managed Oracle. Aurora PostgreSQL: use AWS Schema Conversion Tool (SCT) to migrate schema, DMS for data migration. Aurora is cheaper long-term (no Oracle licensing)." },
          { num: 7, title: "User profiles for a social app — flexible schema, some users have 5 fields, others 50", answer: "DynamoDB", why: "Schemaless — each item can have different attributes. No ALTER TABLE needed. Single-digit ms latency at any scale. PK=userID for direct lookups. GSI for querying by email, username, etc." },
          { num: 8, title: "Application database with unpredictable traffic — idle at night, 10x traffic during day", answer: "Aurora Serverless v2", why: "Auto-scales from 0.5 ACU (idle) to 64 ACU (peak) automatically. Pay only for what you use. Idle night = ~$0.06/hr. Peak day = scales up in seconds. RDS requires pre-provisioned instance that sits idle at night." },
          { num: 9, title: "Frequently queried API responses that don't change often (product details)", answer: "ElastiCache (Redis) as cache in front of Aurora/RDS", why: "Pattern: API → check Redis → cache HIT (microseconds) → return. Cache MISS → query Aurora → store in Redis with TTL → return. Reduces database load by 80-90%. Redis vs Memcached: Redis if you need persistence, pub/sub, data structures. Memcached if you need simplest caching only." },
          { num: 10, title: "Real-time fraud detection on financial transactions", answer: "DynamoDB + DynamoDB Streams + Lambda", why: "DynamoDB handles high write throughput. Streams capture every transaction change. Lambda analyzes transaction patterns in real-time. Flag suspicious patterns → SNS alert. DAX for microsecond lookups of known fraud patterns." },
        ]
      },
      {
        title: "RDS vs Aurora — When to Upgrade?",
        subtitle: "Standard managed vs AWS-engineered relational DB",
        colors: ["#F59E0B", "#8B5CF6"],
        headers: ["RDS", "Aurora"],
        rows: [
          ["Replication", "2 copies, 2 AZs (Multi-AZ)", "6 copies, 3 AZs (always)"],
          ["Failover time", "60-120 seconds", "15-30 seconds"],
          ["Read replicas", "Up to 5, async, higher lag", "Up to 15, <10ms lag"],
          ["Storage", "Pre-provision (resize manually)", "Auto-grows 10GB to 128TB"],
          ["Backtrack", "No (restore from backup)", "Yes — rewind DB to any point in 72hr"],
          ["Cost", "~$X/month", "~20-30% more than RDS"],
          ["Global replication", "Cross-region read replica", "Aurora Global DB (<1s lag)"],
          ["Serverless", "No", "Aurora Serverless v2"],
        ],
        scenarios: [
          { num: 1, title: "Small blog with 100 visitors/day, tight budget", answer: "RDS (db.t4g.micro)", why: "Aurora's minimum cost is higher. RDS t4g.micro is cheapest. Low traffic doesn't benefit from Aurora's performance. Can always migrate to Aurora later." },
          { num: 2, title: "Production SaaS with 10K users, needs HA and fast failover", answer: "Aurora", why: "6-way replication = survives AZ failure + 1 additional failure. 15-30s failover vs 60-120s for RDS. Auto-scaling storage (no midnight alerts about full disk). Read replicas with <10ms lag for read-heavy workloads." },
          { num: 3, title: "Global app with users in US, EU, and Asia — need low-latency reads everywhere", answer: "Aurora Global Database", why: "Primary in us-east-1, read replicas in eu-west-1 and ap-northeast-1. <1 second cross-region replication. Users read from nearest region. Promote secondary to primary in <1 minute during DR." },
        ]
      }
    ]
  },
  {
    id: "messaging",
    category: "Messaging & Events",
    icon: "📨",
    color: "#F59E0B",
    items: [
      {
        title: "SQS vs SNS vs EventBridge vs Kinesis",
        subtitle: "How should services communicate asynchronously?",
        colors: ["#F59E0B", "#EF4444", "#8B5CF6", "#3B82F6"],
        headers: ["SQS", "SNS", "EventBridge", "Kinesis"],
        rows: [
          ["Pattern", "Queue (pull)", "Pub/Sub (push)", "Event bus (route)", "Stream (ordered)"],
          ["Consumers", "1 per message", "All subscribers", "Matched targets", "Multiple (independent)"],
          ["Ordering", "FIFO option", "FIFO option", "No (best-effort)", "Per shard (guaranteed)"],
          ["Retention", "Up to 14 days", "No retention", "No retention", "24hr to 365 days"],
          ["Replay", "No (consumed = gone)", "No", "Archive + Replay", "Yes (re-read stream)"],
          ["Throughput", "Unlimited (Standard)", "Unlimited", "High", "Per shard (1MB/s in)"],
          ["Delivery", "At-least-once / exactly-once (FIFO)", "At-least-once", "At-least-once", "At-least-once"],
          ["Max message", "256 KB", "256 KB", "256 KB", "1 MB per record"],
          ["Lambda trigger", "Yes (poll-based)", "Yes (push-based)", "Yes (push-based)", "Yes (poll-based)"],
          ["Filtering", "No (all or nothing)", "Filter by attributes", "Filter by content/pattern", "No (app-level)"],
          ["Pricing", "Per request", "Per publish + delivery", "Per event", "Per shard-hour + data"],
        ],
        scenarios: [
          { num: 1, title: "Order processing — each order must be processed exactly once", answer: "SQS FIFO", why: "Each order = one message consumed by one processor. FIFO guarantees order within MessageGroupId. Exactly-once delivery prevents duplicate processing. DLQ catches failed orders. Deduplication prevents duplicate submissions." },
          { num: 2, title: "New user signup needs to trigger: welcome email, CRM update, analytics event", answer: "SNS → SQS fan-out", why: "One signup event needs to reach 3 independent services. SNS topic fans out to 3 SQS queues. Each queue processed independently — if CRM is slow, email still sends instantly. Each service can fail/retry independently without affecting others." },
          { num: 3, title: "Route events from 20 microservices to different targets based on event content", answer: "EventBridge", why: "Content-based routing: 'if source=orders AND status=failed AND total>1000 → PagerDuty + Lambda'. Rules filter events without code. Schema registry documents event formats. Cross-account event sharing. SaaS integrations (Shopify, Stripe, Zendesk)." },
          { num: 4, title: "Real-time click stream analytics — 100K events/second, need to analyze + store", answer: "Kinesis Data Streams", why: "High throughput ordered stream. Multiple consumers: Consumer 1 (Lambda) = real-time dashboard. Consumer 2 (Firehose) = deliver to S3 data lake. Consumer 3 (Analytics) = real-time SQL aggregation. Replay capability if consumer needs reprocessing." },
          { num: 5, title: "Deliver application logs to S3 and OpenSearch without managing infrastructure", answer: "Kinesis Data Firehose", why: "Fully managed delivery stream — no shards to manage. Auto-scales. Buffers (60-900s) and delivers to S3, Redshift, OpenSearch, or HTTP. Optional Lambda transformation before delivery. Near real-time (not instant, but easy)." },
          { num: 6, title: "Cron job: run Lambda every 5 minutes to check for stale sessions", answer: "EventBridge Scheduler", why: "No message passing needed — just a schedule trigger. EventBridge Scheduler supports cron and rate expressions. More reliable than CloudWatch Events (which it replaces). One-time or recurring schedules." },
          { num: 7, title: "Mobile push notifications to 1 million devices", answer: "SNS (with platform endpoints)", why: "SNS supports mobile push (APNS for iOS, FCM for Android). Topic-based: publish once → deliver to all subscribed devices. Segment by topic (news, alerts, promotions). Device token management via platform applications." },
          { num: 8, title: "Decoupling a fast producer from a slow consumer — producer should never be blocked", answer: "SQS Standard", why: "SQS acts as a buffer. Producer writes at any speed → messages queue up. Consumer processes at its own pace. If consumer crashes, messages wait (up to 14 days). Visibility timeout prevents duplicate processing. No backpressure on producer." },
          { num: 9, title: "Financial transactions that must be processed in exact order received", answer: "SQS FIFO or Kinesis", why: "SQS FIFO: guaranteed order within MessageGroupId, exactly-once, up to 300 TPS (3K with batching). Kinesis: guaranteed order within shard, higher throughput, but at-least-once delivery (app handles dedup). Choose SQS FIFO for simplicity, Kinesis for higher throughput." },
        ]
      },
      {
        title: "Step Functions vs SQS + Lambda vs EventBridge Pipes",
        subtitle: "How to orchestrate multi-step workflows?",
        colors: ["#8B5CF6", "#F59E0B", "#3B82F6"],
        headers: ["Step Functions", "SQS + Lambda", "EventBridge Pipes"],
        rows: [
          ["Pattern", "Orchestration (central)", "Choreography (distributed)", "Point-to-point transform"],
          ["Visibility", "Visual workflow diagram", "Distributed (hard to trace)", "Simple source → target"],
          ["Error handling", "Built-in retry, catch, fallback", "DLQ + manual retry logic", "DLQ + retry"],
          ["Parallel execution", "Yes (Parallel state)", "Multiple queues", "No"],
          ["Human approval", "Yes (wait for callback)", "Custom (API + SQS)", "No"],
          ["Cost", "$0.025/1K transitions", "SQS + Lambda pricing", "Per pipe + data"],
          ["Best for", "Complex workflows, approval flows", "Simple async pipelines", "Simple transform + route"],
        ],
        scenarios: [
          { num: 1, title: "Order workflow: validate → charge payment → update inventory → ship → notify", answer: "Step Functions", why: "5-step sequential workflow with error handling at each step. If payment fails → go to 'refund' state. Visual diagram shows workflow status. Built-in retry with exponential backoff. Wait states for shipping confirmation." },
          { num: 2, title: "Image uploaded → resize to 3 sizes → store in S3 → update database", answer: "SQS + Lambda (or Step Functions)", why: "Simple enough for SQS + Lambda: S3 event → SQS → Lambda resizes → writes to S3. If you need the 3 resizes in parallel with a 'wait-for-all-done' step → Step Functions Parallel state." },
          { num: 3, title: "SQS message → filter → transform JSON → send to another SQS queue", answer: "EventBridge Pipes", why: "Simple source-to-target with filtering and transformation. No Lambda needed for simple JSON transforms. Lower cost than Lambda for simple piping. Built-in batching and error handling." },
        ]
      }
    ]
  },
  {
    id: "networking",
    category: "Networking",
    icon: "🌐",
    color: "#3B82F6",
    items: [
      {
        title: "ALB vs NLB vs GWLB vs CLB",
        subtitle: "Which load balancer for which traffic?",
        colors: ["#3B82F6", "#10B981", "#A78BFA", "#64748B"],
        headers: ["ALB", "NLB", "GWLB", "CLB (Legacy)"],
        rows: [
          ["Layer", "7 (HTTP/HTTPS)", "4 (TCP/UDP/TLS)", "3 (IP)", "4 + 7"],
          ["Latency added", "~5-10ms", "~100 microseconds", "~ms", "~ms"],
          ["Static IP", "No (use Global Accelerator)", "Yes (per AZ)", "N/A", "No"],
          ["Path routing", "Yes (/api, /web)", "No", "No", "No"],
          ["Host routing", "Yes (a.com, b.com)", "No", "No", "No"],
          ["WebSocket", "Yes (native)", "Yes (TCP)", "N/A", "No"],
          ["WAF support", "Yes", "No", "No", "No"],
          ["Lambda target", "Yes", "No", "No", "No"],
          ["SSL termination", "Yes (ACM)", "Yes (ACM)", "No", "Yes"],
          ["Source IP", "X-Forwarded-For header", "Preserved", "N/A", "X-Forwarded-For"],
          ["PrivateLink", "No", "Required for VPC Endpoint Services", "No", "No"],
          ["Use for", "Web apps, APIs, microservices", "Gaming, IoT, financial, gRPC", "Security appliances", "Migrate to ALB/NLB"],
        ],
        scenarios: [
          { num: 1, title: "Web app with /api → backend, /static → S3, /admin → admin service", answer: "ALB", why: "Path-based routing maps URL paths to different target groups. ALB is the only LB that supports HTTP-level routing. Add WAF for SQL injection/XSS protection. SSL termination with free ACM certificates." },
          { num: 2, title: "Real-time trading platform — millions of TCP connections, <1ms latency requirement", answer: "NLB", why: "Layer 4 adds only ~100μs latency (vs 5-10ms for ALB). Handles millions of connections per second. Static IPs for client-side allowlisting. Preserves source IP for audit logging." },
          { num: 3, title: "Route all traffic through a third-party firewall appliance for inspection", answer: "GWLB", why: "GWLB transparently inserts virtual network appliances (firewalls, IDS/IPS) into traffic flow. Uses GENEVE encapsulation to preserve original packet headers. Appliances see all traffic without becoming a bottleneck." },
          { num: 4, title: "EKS Ingress — route external HTTPS to Kubernetes services", answer: "ALB (via AWS LB Controller)", why: "AWS LB Controller creates ALB for Kubernetes Ingress resources. Path-based routing to different K8s Services. Annotations control SSL, health checks, WAF. Use target-type: ip for direct pod routing." },
          { num: 5, title: "VPC Endpoint Service — expose your service to other AWS accounts privately", answer: "NLB (required)", why: "AWS PrivateLink requires NLB as the backend. Create NLB → VPC Endpoint Service → consumers create Interface Endpoints. Traffic stays on AWS network, never touches internet. NLB is the ONLY option here." },
        ]
      },
      {
        title: "VPC Peering vs Transit Gateway vs PrivateLink",
        subtitle: "How to connect VPCs and networks?",
        colors: ["#3B82F6", "#F59E0B", "#A78BFA"],
        headers: ["VPC Peering", "Transit Gateway", "PrivateLink"],
        rows: [
          ["Topology", "Point-to-point", "Hub-and-spoke", "Service endpoint"],
          ["Transitive", "No", "Yes", "N/A"],
          ["Direction", "Bidirectional", "Bidirectional", "One-way (consumer → provider)"],
          ["Cross-region", "Yes", "Yes (TGW peering)", "Yes"],
          ["Cross-account", "Yes", "Yes (via RAM)", "Yes"],
          ["Bandwidth", "No limit", "50 Gbps per attachment", "Governed by NLB"],
          ["Cost", "Data transfer only", "$0.05/hr + $0.02/GB", "Endpoint: $0.01/hr + $0.01/GB"],
          ["Max connections", "125 per VPC", "5,000 attachments", "Unlimited endpoints"],
          ["CIDR overlap", "Not allowed", "Not allowed", "Allowed (uses private IPs)"],
          ["Best for", "2-3 VPCs, simple connectivity", "5+ VPCs, centralized networking", "Expose specific service privately"],
        ],
        scenarios: [
          { num: 1, title: "2 VPCs in same region need to share a database", answer: "VPC Peering", why: "Simple 1-to-1 connection. Free (data transfer charges only). Low latency, high bandwidth. Perfect for 2-3 VPCs. No single point of failure." },
          { num: 2, title: "15 VPCs across 3 accounts need full mesh connectivity + VPN to on-premises", answer: "Transit Gateway", why: "Peering 15 VPCs = 105 connections. TGW = 15 attachments. Transitive routing — all VPCs reach each other through TGW. VPN attachment for on-premises. Route tables for network segmentation." },
          { num: 3, title: "SaaS provider wants to expose their API to customer VPCs without peering", answer: "PrivateLink", why: "Provider creates NLB + Endpoint Service. Customer creates Interface Endpoint in their VPC. No VPC peering, no internet, no CIDR conflicts. Customer accesses service via private IP in their VPC. Scales to thousands of customers." },
          { num: 4, title: "Shared services VPC (logging, monitoring) needs access from 50 application VPCs", answer: "Transit Gateway with route table segmentation", why: "Create TGW with shared-services route table. All 50 VPCs can reach shared services. Separate route table prevents app VPCs from reaching each other (isolation). Much simpler than 50 VPC peering connections." },
        ]
      },
      {
        title: "Security Groups vs NACLs",
        subtitle: "Two layers of network firewall",
        colors: ["#3B82F6", "#F59E0B"],
        headers: ["Security Groups", "NACLs"],
        rows: [
          ["Level", "Instance / ENI", "Subnet"],
          ["State", "Stateful (return auto-allowed)", "Stateless (both directions needed)"],
          ["Rules", "Allow only", "Allow AND Deny"],
          ["Evaluation", "All rules checked", "Rules in order (lowest # first)"],
          ["Default", "Deny all inbound, allow all outbound", "Allow all (default NACL)"],
          ["SG reference", "Yes (can reference other SGs)", "No (CIDR only)"],
          ["Applies to", "Only instances assigned to it", "All instances in subnet"],
          ["Changes", "Immediate", "Immediate"],
          ["Use for", "Primary access control per resource", "Subnet-wide blocking, blacklisting"],
        ],
        scenarios: [
          { num: 1, title: "Allow web servers to talk to database, but nothing else can reach the database", answer: "Security Group chaining", why: "DB SG: allow inbound :5432 from Web SG (SG reference). This is dynamic — any instance with Web SG can reach DB. No IP management needed. If you add a new web server, it inherits access automatically." },
          { num: 2, title: "Block all traffic from a known malicious IP range (203.0.113.0/24)", answer: "NACL Deny rule", why: "NACL rule #50: Deny 203.0.113.0/24 all ports. Applied before allow rules (lower rule number). Affects entire subnet — no need to update every Security Group. SGs can't deny — they can only allow." },
          { num: 3, title: "Compliance requires that database subnets have no internet access whatsoever", answer: "Both: NACL + No internet route", why: "Data subnet route table: no route to IGW or NAT GW. NACL: Deny all traffic to/from 0.0.0.0/0 (belt-and-suspenders). SG: only allow :5432 from app tier SG. Three layers of defense for compliance." },
        ]
      }
    ]
  },
  {
    id: "security",
    category: "Security",
    icon: "🛡️",
    color: "#EF4444",
    items: [
      {
        title: "KMS vs Secrets Manager vs Parameter Store",
        subtitle: "Where to store secrets and encryption keys?",
        colors: ["#EF4444", "#F59E0B", "#3B82F6"],
        headers: ["KMS", "Secrets Manager", "Parameter Store"],
        rows: [
          ["Purpose", "Encryption key management", "Secret storage + rotation", "Config + secret storage"],
          ["Stores", "Encryption keys (never exposed)", "Secrets (JSON, text)", "Params (string, list, encrypted)"],
          ["Auto-rotation", "Key rotation (annual)", "Secret rotation (Lambda)", "No auto-rotation"],
          ["Cross-region", "Multi-region keys", "Replication", "No"],
          ["Hierarchy", "No", "No", "Yes (/app/prod/db-host)"],
          ["Versioning", "Automatic", "Automatic + staging labels", "Manual (optional)"],
          ["Cost", "$1/key/month", "$0.40/secret/month + API calls", "Free (Standard) / $0.05/param (Advanced)"],
          ["Integrated with", "S3, EBS, RDS, DynamoDB, etc.", "RDS, Redshift, DocumentDB", "EC2, ECS, Lambda, CloudFormation"],
        ],
        scenarios: [
          { num: 1, title: "Encrypt all data in S3, EBS, and RDS at rest", answer: "KMS", why: "KMS manages the encryption keys. Each service integrates natively — just specify KMS key ARN. aws:kms encryption for S3, KMS key for EBS/RDS. Audit all key usage via CloudTrail." },
          { num: 2, title: "Database password that needs to rotate every 30 days automatically", answer: "Secrets Manager", why: "Secrets Manager has built-in rotation with Lambda. AWS provides rotation templates for RDS, Redshift, DocumentDB. App reads secret via API — always gets current password. Cross-region replication for DR." },
          { num: 3, title: "Application config: feature flags, API endpoint URLs, non-sensitive settings", answer: "Parameter Store (Standard tier)", why: "Free. Hierarchical paths (/app/prod/feature-x = true). Change notification via CloudWatch Events. Reference in CloudFormation, ECS task definitions, Lambda env vars. No rotation needed for config." },
          { num: 4, title: "API keys for third-party services, don't need auto-rotation", answer: "Parameter Store (SecureString) or Secrets Manager", why: "Parameter Store SecureString: encrypted with KMS, free (Standard), good for simple secrets. Secrets Manager: if you might want rotation later, cross-region replication, or version staging (AWSCURRENT/AWSPREVIOUS labels)." },
        ]
      },
      {
        title: "WAF vs Shield vs GuardDuty vs Security Hub",
        subtitle: "Which security service protects against what?",
        colors: ["#EF4444", "#F59E0B", "#3B82F6", "#A78BFA"],
        headers: ["WAF", "Shield", "GuardDuty", "Security Hub"],
        rows: [
          ["Protects against", "App-layer attacks (SQLi, XSS)", "DDoS attacks", "Threats & anomalies", "Aggregates findings"],
          ["Layer", "Layer 7 (HTTP/HTTPS)", "Layer 3/4/7", "API/Network/DNS analysis", "Dashboard/aggregation"],
          ["Deployment", "On ALB, CloudFront, API GW", "Automatic (Standard)", "Account-level enable", "Account-level enable"],
          ["Cost", "Per rule + per request", "Free (Standard) / $3K/mo (Adv)", "Per event analyzed", "Per check + finding"],
          ["Action", "Block, allow, count, CAPTCHA", "Absorb DDoS traffic", "Alert on findings", "Compliance scoring"],
          ["Rules", "Custom + managed rule groups", "Automatic (Standard)", "ML-based detection", "CIS, PCI DSS benchmarks"],
        ],
        scenarios: [
          { num: 1, title: "Protect web app from SQL injection, XSS, and bot traffic", answer: "WAF on ALB/CloudFront", why: "WAF rules match and block malicious HTTP requests. AWS Managed Rules for common threats (SQLi, XSS). Rate-limiting rule: block IPs sending >100 req/min. Bot Control managed rule group for automated bot detection. Deploy on ALB (per-region) or CloudFront (global)." },
          { num: 2, title: "Protect against volumetric DDoS attacks (100 Gbps+ traffic flood)", answer: "Shield (Standard is automatic, Advanced for large targets)", why: "Shield Standard protects all AWS customers for free — handles most DDoS. Shield Advanced ($3K/mo): enhanced detection for ALB/NLB/CloudFront/Route 53, 24/7 DDoS Response Team (DRT), cost protection (AWS credits for scaling during DDoS)." },
          { num: 3, title: "Detect if an EC2 instance is communicating with a known cryptocurrency mining pool", answer: "GuardDuty", why: "GuardDuty analyzes VPC Flow Logs, CloudTrail, and DNS logs using ML. Detects: crypto mining, data exfiltration, compromised credentials, unauthorized access, C2 communication. No agents to install. Findings → EventBridge → Lambda for auto-remediation." },
          { num: 4, title: "Centralized security posture view across 10 AWS accounts with compliance scoring", answer: "Security Hub", why: "Aggregates findings from GuardDuty, Inspector, Macie, Config, Firewall Manager. Compliance checks: CIS AWS Foundations, PCI DSS, AWS Foundational Security. Security score dashboard. Cross-account aggregation with AWS Organizations." },
        ]
      }
    ]
  },
  {
    id: "monitoring",
    category: "Monitoring",
    icon: "📊",
    color: "#EC4899",
    items: [
      {
        title: "CloudWatch vs X-Ray vs CloudTrail vs Config",
        subtitle: "Four pillars of AWS observability and compliance",
        colors: ["#EC4899", "#F59E0B", "#3B82F6", "#10B981"],
        headers: ["CloudWatch", "X-Ray", "CloudTrail", "Config"],
        rows: [
          ["Purpose", "Metrics, logs, alarms", "Distributed tracing", "API audit trail", "Resource config tracking"],
          ["Answers", "\"Is my app healthy?\"", "\"Why is this request slow?\"", "\"Who did what, when?\"", "\"What changed, and is it compliant?\""],
          ["Data type", "Metrics + Logs", "Trace segments + service map", "API call records", "Config snapshots + history"],
          ["Scope", "Resources + applications", "Request paths across services", "All AWS API calls", "Resource configurations"],
          ["Alerting", "Alarms → SNS/Lambda/ASG", "No native alerting", "EventBridge integration", "Config Rules + remediation"],
          ["Retention", "Metrics: 15 months, Logs: custom", "Traces: 30 days", "Events: 90 days (S3: unlimited)", "History: configurable"],
          ["Cost", "Per metric, per GB logs", "Per trace, per scanned", "Free (management events)", "Per rule evaluation"],
        ],
        scenarios: [
          { num: 1, title: "Alert when API error rate exceeds 5% for 5 consecutive minutes", answer: "CloudWatch Alarm on ALB 5XX metric", why: "CloudWatch collects ALB metrics automatically. Create alarm: metric=HTTPCode_Target_5XX_Count, threshold=5%, periods=5. Alarm → SNS → PagerDuty. Also trigger Lambda to scale up or switch to healthy instances." },
          { num: 2, title: "User reports slow page load. Need to find which microservice is the bottleneck", answer: "X-Ray", why: "X-Ray shows the full request trace across services: API GW → Lambda → DynamoDB → S3. Service map visualizes latency at each hop. Identify: Lambda took 200ms, DynamoDB took 3 seconds (bottleneck!). Filter traces by latency > 2s to find patterns." },
          { num: 3, title: "Security investigation: who deleted the production RDS instance?", answer: "CloudTrail", why: "CloudTrail logs every API call: DeleteDBInstance, who (IAM user/role), when (timestamp), from where (source IP), what (resource ARN). Search CloudTrail Logs in Athena or CloudWatch Insights. Set up EventBridge rule to alert on destructive actions in real-time." },
          { num: 4, title: "Compliance: ensure all S3 buckets have encryption enabled, alert if not", answer: "AWS Config Rule", why: "Config Rule: s3-bucket-server-side-encryption-enabled. Continuously evaluates all S3 buckets. Non-compliant → alert via EventBridge. Auto-remediation: SSM Automation document enables encryption. Config Dashboard shows compliance score." },
          { num: 5, title: "Need full observability stack for production EKS cluster", answer: "All four together", why: "CloudWatch: Container Insights for cluster/pod metrics + alarms. X-Ray/ADOT: distributed tracing across K8s services. CloudTrail: audit kubectl commands and API server access. Config: track EKS cluster configuration changes and compliance. Plus: Fluent Bit → CloudWatch Logs + OpenSearch for log aggregation." },
        ]
      }
    ]
  }
];

// ===== MAIN COMPONENT =====
export default function AWSComparisons() {
  const [activeCat, setActiveCat] = useState("compute");
  const [activeItem, setActiveItem] = useState(0);
  const [openSections, setOpenSections] = useState({});
  const toggle = (k) => setOpenSections(p => ({ ...p, [k]: p[k] === false ? true : (p[k] === true ? false : false) }));

  const cat = comparisons.find(c => c.id === activeCat);
  const item = cat?.items[activeItem];

  const totalScenarios = comparisons.reduce((a, c) => a + c.items.reduce((b, i) => b + (i.scenarios?.length || 0), 0), 0);

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", background: "#060D1B", minHeight: "100vh", color: "#CBD5E1" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "linear-gradient(160deg, #0a0f20, #121833, #0a0f20)", borderBottom: "1px solid #1a2744", padding: "22px 24px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: "linear-gradient(135deg, #F59E0B, #EF4444)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>⚔️</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: "#F1F5F9" }}>AWS Service Comparisons & Scenario Guide</h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748B" }}>{comparisons.length} categories • {comparisons.reduce((a, c) => a + c.items.length, 0)} comparisons • {totalScenarios} real-world scenarios with answers</p>
          </div>
        </div>

        {/* Category pills */}
        <div style={{ display: "flex", gap: 4, marginTop: 16, overflowX: "auto", paddingBottom: 2 }}>
          {comparisons.map(c => (
            <button key={c.id} onClick={() => { setActiveCat(c.id); setActiveItem(0); setOpenSections({}); }} style={{
              padding: "8px 14px", border: activeCat === c.id ? `2px solid ${c.color}` : "1px solid #1a2744",
              borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
              background: activeCat === c.id ? c.color + "15" : "#0d1525", color: activeCat === c.id ? c.color : "#64748B", transition: "all 0.15s"
            }}>
              {c.icon} {c.category}
            </button>
          ))}
        </div>
      </div>

      {cat && (
        <div style={{ padding: "16px 24px", maxWidth: 960, margin: "0 auto" }}>
          {/* Comparison selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
            {cat.items.map((it, i) => (
              <button key={i} onClick={() => { setActiveItem(i); setOpenSections({}); }} style={{
                padding: "10px 16px", border: activeItem === i ? `2px solid ${cat.color}` : "1px solid #1a2744",
                borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left", flex: "1 1 auto", minWidth: 200,
                background: activeItem === i ? cat.color + "10" : "#0d1525", transition: "all 0.15s"
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: activeItem === i ? cat.color : "#94A3B8" }}>{it.title}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{it.subtitle}</div>
              </button>
            ))}
          </div>

          {item && (
            <div>
              {/* Comparison Table */}
              <div style={{ background: "#0d1525", border: "1px solid #1a2744", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 18, color: "#F1F5F9" }}>{item.title}</h2>
                  <span style={{ fontSize: 11, color: "#475569", background: "#111d33", padding: "3px 10px", borderRadius: 12 }}>
                    {item.scenarios?.length || 0} scenarios
                  </span>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <CompTable headers={item.headers} rows={item.rows} colors={item.colors} />
                </div>
              </div>

              {/* VS Box if present */}
              {item.vs && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, margin: "16px 0" }}>
                  <div style={{ background: "#0d1525", border: `1px solid ${item.colors[0]}30`, borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: item.colors[0], marginBottom: 6 }}>{item.vs.leftLabel}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.7, color: "#94A3B8" }}>{item.vs.left}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", fontSize: 20, color: "#334155", fontWeight: 800 }}>vs</div>
                  <div style={{ background: "#0d1525", border: `1px solid ${item.colors[1]}30`, borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: item.colors[1], marginBottom: 6 }}>{item.vs.rightLabel}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.7, color: "#94A3B8" }}>{item.vs.right}</div>
                  </div>
                </div>
              )}

              {/* Scenarios */}
              {item.scenarios && item.scenarios.length > 0 && (
                <div style={{ background: "#0d1525", border: "1px solid #1a2744", borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>🎬</span>
                    <h3 style={{ margin: 0, fontSize: 16, color: "#F1F5F9" }}>Real-World Scenarios — "Which Service Do I Use?"</h3>
                  </div>
                  <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748B" }}>Each scenario describes a real situation. The answer explains which service to choose and exactly why.</p>

                  {item.scenarios.map((s, si) => (
                    <ScenarioCard key={si} num={s.num} title={s.title} answer={s.answer} why={s.why} color={cat.color} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ textAlign: "center", padding: "20px", color: "#1E293B", fontSize: 11, borderTop: "1px solid #0d1525", marginTop: 32 }}>
        AWS Service Comparisons & Scenario Guide — Cloud Engineer Interview Preparation — March 2026
      </div>
    </div>
  );
}
