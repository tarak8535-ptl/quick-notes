import { useState, useRef, useEffect } from "react";

// ===== MINI COMPONENTS =====
const Code = ({ children }) => (
  <pre style={{ background: "#060D1B", border: "1px solid #1a2744", borderRadius: 8, padding: "14px 16px", fontSize: 12, lineHeight: 1.7, overflowX: "auto", margin: "10px 0", fontFamily: "'JetBrains Mono', monospace", color: "#7DD3FC", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{children}</pre>
);

const Callout = ({ type = "info", children }) => {
  const s = { info: ["#3B82F6","💡"], tip: ["#10B981","✅"], warn: ["#F59E0B","⚠️"], scenario: ["#A78BFA","🎬"], diagram: ["#EC4899","📐"] };
  const [c, i] = s[type] || s.info;
  return <div style={{ padding: "10px 14px", background: c + "10", borderLeft: `3px solid ${c}`, borderRadius: "0 8px 8px 0", margin: "10px 0", fontSize: 13, lineHeight: 1.7, color: "#CBD5E1" }}><span style={{ color: c, fontWeight: 700 }}>{i} </span>{children}</div>;
};

const Diagram = ({ children, title }) => (
  <div style={{ background: "#060D1B", border: "1px solid #1E3A5F", borderRadius: 10, padding: "14px 16px", margin: "12px 0" }}>
    {title && <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{title}</div>}
    <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.6, fontFamily: "'JetBrains Mono', monospace", color: "#94A3B8", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{children}</pre>
  </div>
);

const VS = ({ left, right, leftLabel, rightLabel, color }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, margin: "12px 0" }}>
    <div style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: color || "#3B82F6", marginBottom: 6 }}>{leftLabel}</div>
      <div style={{ fontSize: 12, lineHeight: 1.7, color: "#94A3B8" }}>{left}</div>
    </div>
    <div style={{ display: "flex", alignItems: "center", fontSize: 18, color: "#334155", fontWeight: 700 }}>vs</div>
    <div style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: color || "#A78BFA", marginBottom: 6 }}>{rightLabel}</div>
      <div style={{ fontSize: 12, lineHeight: 1.7, color: "#94A3B8" }}>{right}</div>
    </div>
  </div>
);

// ===== DATA =====
const categories = [
  {
    id: "compute", name: "Compute", icon: "⚡", color: "#EF4444",
    services: [
      {
        name: "Amazon EC2", tagline: "Virtual Servers in the Cloud",
        overview: "EC2 (Elastic Compute Cloud) gives you resizable virtual machines with full OS control. It is the foundational compute service — nearly every AWS workload involves EC2 directly or indirectly.",
        diagram: `EC2 Instance Lifecycle:

  pending → running ←→ stopping → stopped
                ↓                    ↓
          shutting-down         (restart)
                ↓
          terminated (gone forever)

  ┌─────────────────────────────────────────┐
  │         EC2 Instance                     │
  │  ┌──────────┐  ┌──────────────────────┐ │
  │  │ vCPUs    │  │ EBS Volume (root)    │ │
  │  │ Memory   │  │ /dev/xvda — 100GB    │ │
  │  │ Network  │  ├──────────────────────┤ │
  │  │ (ENI)    │  │ EBS Volume (data)    │ │
  │  └──────────┘  │ /dev/xvdf — 500GB    │ │
  │                └──────────────────────┘ │
  │  Instance Store (ephemeral, if avail)   │
  │  Security Group ←── Firewall rules      │
  │  IAM Role ←── AWS API permissions       │
  └─────────────────────────────────────────┘`,
        sections: [
          {
            title: "Instance Families — Which One to Choose?",
            content: `Every instance name follows a pattern: m7g.xlarge

  m  = family (General Purpose)
  7  = generation (higher = newer & better)
  g  = processor (g=Graviton ARM, i=Intel, a=AMD)
  .xlarge = size (nano < micro < small < medium < large < xlarge < 2xl...)`,
            code: `# Quick reference — choosing instance types
# General Purpose (balanced CPU/Memory/Network)
  t3.micro   — free tier, burstable, dev/test
  m7g.large  — production web servers (Graviton = 40% cheaper)
  m7i.xlarge — when you need x86 (Intel) specifically

# Compute Optimized (high CPU performance)
  c7g.2xlarge — batch processing, video encoding, ML inference

# Memory Optimized (high RAM)
  r7g.2xlarge — in-memory databases, Redis, SAP
  x2idn.large — extreme memory (up to 4TB RAM)

# Storage Optimized (high disk I/O)
  i4i.xlarge  — NoSQL databases, Elasticsearch
  d3.xlarge   — data warehousing, HDFS

# Accelerated (GPU/ML)
  p5.48xlarge  — ML training (8x NVIDIA H100)
  g5.xlarge    — graphics, video, ML inference
  inf2.xlarge  — cost-efficient ML inference (Inferentia2)`,
            callouts: [
              { type: "tip", text: "Always start with Graviton ('g' suffix) for new workloads. m7g costs ~40% less than m7i with similar or better performance. Most Linux containers run on ARM without changes." },
              { type: "scenario", text: "Scenario: You run a web app that's idle at night but gets traffic during business hours. → Use t3 (burstable) for dev, m7g with Auto Scaling for production. The t3 earns CPU credits during idle time and spends them during peaks." }
            ]
          },
          {
            title: "Purchasing Options — Saving up to 90%",
            content: `AWS offers multiple pricing models to reduce costs:`,
            diagram2: `Cost Comparison for m7g.xlarge (us-east-1):

  On-Demand:        $0.163/hr  ████████████████████  100%
  1yr RI (no upfr):  $0.115/hr  ██████████████        70%
  1yr RI (all upfr): $0.101/hr  ████████████          62%
  3yr RI (all upfr): $0.064/hr  ████████              39%
  Spot:             ~$0.049/hr  ██████                30%

  Annual cost for 1 instance running 24/7:
  On-Demand:  $1,428
  3yr RI:       $561   ← saves $867/yr
  Spot:         $429   ← saves $999/yr (but can be interrupted)`,
            callouts: [
              { type: "info", text: "Strategy: Use Reserved/Savings Plans for baseline (always-on), On-Demand for variable peak traffic, and Spot for fault-tolerant workloads (batch, CI/CD, test environments). This hybrid approach typically saves 50-70% vs all On-Demand." },
              { type: "warn", text: "Spot Instances can be reclaimed with 2-minute warning. NEVER use for databases, single points of failure, or stateful apps. Always have On-Demand fallback." }
            ]
          },
          {
            title: "Auto Scaling Groups (ASG)",
            content: `ASG automatically adjusts instance count based on demand.`,
            code: `# Example: Target Tracking — maintain 60% CPU
aws autoscaling put-scaling-policy \\
  --auto-scaling-group-name my-asg \\
  --policy-name cpu-60 \\
  --policy-type TargetTrackingScaling \\
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    },
    "TargetValue": 60.0,
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'

# Scaling Policy Types:
# 1. Target Tracking → "Keep CPU at 60%" (simplest, recommended)
# 2. Step Scaling    → "If CPU>70 add 1, if >85 add 3" (fine-grained)
# 3. Scheduled       → "Scale to 10 at 9AM, 3 at 9PM" (predictable)
# 4. Predictive      → ML analyzes patterns, pre-scales (cyclical)`,
            callouts: [
              { type: "scenario", text: "Scenario: Your e-commerce app gets 5x traffic on Black Friday. → Use Scheduled Scaling to pre-warm instances at midnight + Target Tracking to handle unexpected spikes + Predictive Scaling to learn weekly patterns. Contact AWS support to pre-warm the ALB." }
            ]
          }
        ]
      },
      {
        name: "AWS Lambda", tagline: "Serverless Functions — Run Code Without Servers",
        overview: "Lambda lets you run code in response to events without provisioning servers. You pay only for compute time consumed — zero charge when not running.",
        diagram: `Lambda Execution Model:

  Event Source          Lambda Service          Your Code
  ┌─────────┐          ┌──────────────┐        ┌──────────┐
  │ S3 Put  │──event──→│              │──run──→ │ handler()│
  │ API GW  │          │  Auto-scale  │        │          │
  │ SQS     │          │  Concurrency │        │ Process  │
  │ DynamoDB│          │  Management  │        │ Return   │
  │ EventBr │          │              │        │          │
  │ Schedule│          │  Cold Start  │        └──────────┘
  └─────────┘          │  if needed   │
                       └──────────────┘
  
  Pricing: $0.20 per 1M invocations + $0.0000166667/GB-second
  Free tier: 1M invocations + 400,000 GB-seconds/month`,
        sections: [
          {
            title: "Lambda Limits & Cold Starts",
            content: `Key constraints to know:`,
            code: `# Lambda Limits
Timeout:             15 minutes max
Memory:              128 MB to 10,240 MB (10 GB)
Deployment package:  50 MB zipped, 250 MB unzipped
                     10 GB with container images
Concurrent execs:    1,000 per region (can request increase)
Ephemeral storage:   512 MB to 10 GB (/tmp)
Environment vars:    4 KB total
Layers:              5 layers, 250 MB total unzipped

# Cold Start — what happens on first invocation:
1. AWS provisions a microVM (Firecracker)
2. Downloads your deployment package
3. Initializes runtime (Python/Node/Java)
4. Runs code outside the handler (global scope)
5. Executes your handler function

# Cold start times:
Python/Node.js:  ~200-500ms
Java:            ~1-3 seconds (JVM startup)
.NET:            ~500ms-1.5s

# Mitigations:
- Provisioned Concurrency: keep N instances warm ($$$)
- SnapStart (Java): snapshot after init, restore in <200ms
- Smaller packages: fewer dependencies = faster download
- Init code optimization: lazy-load in handler, not globally`,
            callouts: [
              { type: "tip", text: "Put database connections and SDK clients in global scope (outside handler). Lambda reuses the execution environment for subsequent invocations, so connections persist between calls. This avoids creating new connections per request." },
              { type: "scenario", text: "Scenario: API Gateway → Lambda → RDS. Users complain about occasional 3-second delays. → Cause: cold starts. Fix: enable Provisioned Concurrency = 5 (keeps 5 warm instances). Cost: ~$30/month. Alternative: SnapStart for Java or use connection pooling with RDS Proxy." }
            ]
          },
          {
            title: "Common Lambda Patterns",
            content: `Lambda is most powerful when combined with other AWS services:`,
            code: `# Pattern 1: API Backend
API Gateway → Lambda → DynamoDB
  - REST API with auto-scaling, no servers
  - Pay per request, scales to zero

# Pattern 2: File Processing Pipeline
S3 Upload → Lambda → Thumbnail Generation → S3 Output
  - Trigger: S3 PutObject event
  - Process: resize image, extract metadata
  - Scale: handles 1 or 10,000 uploads simultaneously

# Pattern 3: Stream Processing
Kinesis Stream → Lambda → DynamoDB + S3
  - Real-time data transformation
  - Batch size configurable (1-10,000 records)
  - Checkpointing for exactly-once processing

# Pattern 4: Scheduled Tasks (Cron)
EventBridge Schedule → Lambda
  - "Every 5 minutes, check for stale sessions"
  - "At 2 AM daily, generate reports"
  - cron(0 2 * * ? *)  = 2:00 AM UTC daily

# Pattern 5: Event-Driven Automation
CloudTrail → EventBridge → Lambda
  - "When someone creates an EC2 without tags, auto-tag it"
  - "When a Security Group opens 0.0.0.0/0, close it"
  - Security automation / guardrails`,
            callouts: [
              { type: "info", text: "Lambda vs Fargate vs EC2 decision: Lambda for event-driven tasks <15min. Fargate for long-running containers without server management. EC2 for full OS control, GPU workloads, or very predictable long-running compute." }
            ]
          }
        ]
      },
      {
        name: "ECS & EKS", tagline: "Container Orchestration",
        overview: "ECS (Elastic Container Service) and EKS (Elastic Kubernetes Service) run containerized applications. Both support Fargate for serverless containers.",
        diagram: `Container Orchestration Options:

  ┌─────────────────────────────────────────────────┐
  │               How do you want to run it?         │
  │                                                 │
  │  ┌──── ECS ──────┐      ┌──── EKS ──────┐      │
  │  │ AWS-native     │      │ Managed K8s    │      │
  │  │ Task Defs      │      │ Pods/Deploys   │      │
  │  │ Simpler        │      │ Richer ecosystem│     │
  │  │ AWS-only       │      │ Multi-cloud OK  │     │
  │  └───────┬────────┘      └───────┬────────┘     │
  │          │                       │               │
  │          └──────────┬────────────┘               │
  │                     │                            │
  │    ┌── Where do containers run? ──┐              │
  │    │                              │              │
  │    ▼                              ▼              │
  │  EC2 Launch Type            Fargate              │
  │  (you manage nodes)    (serverless, no nodes)    │
  │  More control              Zero ops              │
  │  Spot instances OK         Per-pod billing       │
  │  GPU support               Auto-scales pods      │
  └─────────────────────────────────────────────────┘`,
        sections: [
          {
            title: "ECS Core Concepts",
            content: `ECS uses its own orchestration model with Tasks and Services:`,
            code: `# ECS Hierarchy:
Cluster → Service → Task → Container(s)

# Task Definition (like a Docker Compose file)
{
  "family": "web-app",
  "networkMode": "awsvpc",    # Each task gets its own ENI
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",               # 0.5 vCPU
  "memory": "1024",           # 1 GB
  "containerDefinitions": [{
    "name": "app",
    "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/web:v1.2",
    "portMappings": [{ "containerPort": 8080 }],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/web-app",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:8080/health"],
      "interval": 30,
      "timeout": 5,
      "retries": 3
    },
    "secrets": [{
      "name": "DB_PASSWORD",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:123:secret:db-pass"
    }]
  }]
}`,
            callouts: [
              { type: "tip", text: "ECS with Fargate is the fastest path to running containers on AWS. No EC2 instances to manage, no AMI updates, no capacity planning. Just define your task and let AWS handle the rest." }
            ]
          },
          {
            title: "ECS vs EKS — When to Choose What",
            content: ``,
            vs: { leftLabel: "ECS", left: "AWS-native, simpler API, tighter integration with ALB/CloudWatch/IAM. No Kubernetes knowledge needed. Task Definitions are simpler than K8s manifests. Best for: teams starting with containers, AWS-only shops, simpler microservice architectures.", rightLabel: "EKS", right: "Managed Kubernetes with full ecosystem (Helm, ArgoCD, Istio, Prometheus). Portable — same manifests work on any K8s cluster. Steeper learning curve but more powerful. Best for: teams with K8s expertise, multi-cloud strategy, complex orchestration needs, large microservice architectures." },
            callouts: [
              { type: "scenario", text: "Scenario: A startup with 5 engineers wants to run 3 microservices. → ECS on Fargate. Low ops, fast setup, no K8s overhead. Scenario: An enterprise with 50 engineers running 40 microservices across AWS and GCP. → EKS. K8s portability, rich ecosystem, team likely has K8s skills." }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "storage", name: "Storage", icon: "💾", color: "#10B981",
    services: [
      {
        name: "Amazon S3", tagline: "Unlimited Object Storage — 11 Nines Durability",
        overview: "S3 (Simple Storage Service) is AWS's object storage — infinitely scalable, 99.999999999% durable. It stores everything from website assets to petabyte-scale data lakes.",
        diagram: `S3 Storage Classes — Cost vs Access Speed:

  Access Speed     Storage Class               Cost/GB/mo  Retrieval
  ═══════════════════════════════════════════════════════════════════
  ██████████████   S3 Standard                 $0.023      Instant
  █████████████    S3 Intelligent-Tiering      $0.023*     Instant
  ██████████       S3 Standard-IA              $0.0125     Instant
  █████████        S3 One Zone-IA              $0.010      Instant
  ██████           Glacier Instant Retrieval   $0.004      Instant
  ████             Glacier Flexible Retrieval  $0.0036     1-12 hrs
  ██               Glacier Deep Archive        $0.00099    12-48 hrs
  
  * IT auto-moves between tiers, small monitoring fee applies

  Lifecycle Policy Example:
  Day 0:    → Standard        (frequent access)
  Day 30:   → Standard-IA     (infrequent, cheaper)
  Day 90:   → Glacier Instant (archive, instant access)
  Day 365:  → Glacier Deep    (long-term archive)
  Day 730:  → DELETE           (expired)`,
        sections: [
          {
            title: "Key Features & Patterns",
            content: `S3 is far more than simple file storage:`,
            code: `# Versioning — Protect against accidental deletion
aws s3api put-bucket-versioning \\
  --bucket my-bucket \\
  --versioning-configuration Status=Enabled
# Every overwrite/delete creates a new version
# "Delete" just adds a delete marker — recoverable!

# Event Notifications — Trigger on changes
# S3 → Lambda: process uploaded files
# S3 → SQS: queue for batch processing
# S3 → SNS: notify subscribers
# S3 → EventBridge: complex routing rules

# Example: Auto-generate thumbnails
{
  "LambdaFunctionConfigurations": [{
    "Events": ["s3:ObjectCreated:*"],
    "Filter": {
      "Key": { "FilterRules": [
        { "Name": "prefix", "Value": "uploads/" },
        { "Name": "suffix", "Value": ".jpg" }
      ]}
    },
    "LambdaFunctionArn": "arn:aws:lambda:...:thumbnail-generator"
  }]
}

# Cross-Region Replication — disaster recovery
# Source bucket (us-east-1) → Replica (eu-west-1)
# Automatic, async, versioning required on both

# S3 Select — Query CSV/JSON/Parquet in S3
# Instead of downloading entire 10GB file:
aws s3api select-object-content \\
  --bucket data-lake \\
  --key sales/2025.csv \\
  --expression "SELECT * FROM s3object WHERE total > 1000" \\
  --expression-type SQL \\
  --input-serialization '{"CSV": {"FileHeaderInfo": "USE"}}' \\
  --output-serialization '{"CSV": {}}'
# Only transfers matching rows — 80% cheaper for analytics!`,
            callouts: [
              { type: "tip", text: "Enable S3 Versioning + MFA Delete on critical buckets. Even if someone accidentally deletes objects, you can recover any version. MFA Delete requires MFA to permanently delete versions." },
              { type: "scenario", text: "Scenario: You store user uploads in S3. Legal requires 7-year retention, but files are rarely accessed after 30 days. → Lifecycle Policy: Standard (0-30 days) → Standard-IA (30-90 days) → Glacier Flexible (90-365 days) → Glacier Deep Archive (365-2555 days) → Delete at 2555 days. Saves ~90% vs keeping everything in Standard." }
            ]
          },
          {
            title: "S3 Security",
            content: `S3 security is multi-layered:`,
            code: `# Block Public Access (enabled by default since 2023)
aws s3api put-public-access-block --bucket my-bucket \\
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }'

# Bucket Policy — restrict access to specific VPC
{
  "Statement": [{
    "Effect": "Deny",
    "Principal": "*",
    "Action": "s3:*",
    "Resource": ["arn:aws:s3:::my-bucket/*"],
    "Condition": {
      "StringNotEquals": {
        "aws:sourceVpc": "vpc-12345678"
      }
    }
  }]
}

# Encryption options:
# SSE-S3:  AWS manages keys (default, free)
# SSE-KMS: You control key policy, audit with CloudTrail
# SSE-C:   You provide the key with each request
# Client-side: Encrypt before uploading`,
            callouts: [
              { type: "warn", text: "S3 data breaches are one of the most common cloud security incidents. Always: 1) Enable Block Public Access at the account level, 2) Use bucket policies over ACLs, 3) Enable CloudTrail data events to log all S3 access, 4) Use VPC Endpoints for private access." }
            ]
          }
        ]
      },
      {
        name: "EBS & EFS", tagline: "Block and File Storage for EC2/EKS",
        overview: "EBS provides persistent block storage for single instances. EFS provides shared NFS storage for multiple instances.",
        diagram: `Storage Comparison:

  ┌────────────┬────────────────┬───────────────┬──────────────┐
  │            │     EBS        │     EFS       │   S3         │
  ├────────────┼────────────────┼───────────────┼──────────────┤
  │ Type       │ Block storage  │ File storage  │ Object store │
  │ Mount      │ 1 EC2 instance │ Many EC2/EKS  │ API access   │
  │ Protocol   │ Raw block      │ NFS v4.1      │ HTTP REST    │
  │ Scope      │ Single AZ      │ Multi-AZ      │ Multi-AZ     │
  │ Max Size   │ 64 TB/volume   │ Unlimited     │ Unlimited    │
  │ Perf       │ Up to 256K IOPS│ Burst/Prov    │ N/A          │
  │ Pricing    │ Per GB/month   │ Per GB stored │ Per GB stored│
  │ Use Case   │ Databases, OS  │ Shared files  │ Data lake    │
  │            │ Boot volumes   │ CMS, ML data  │ Backups      │
  └────────────┴────────────────┴───────────────┴──────────────┘`,
        sections: [
          {
            title: "EBS Volume Types",
            content: `Choose based on IOPS and throughput needs:`,
            code: `# EBS Volume Types:
gp3 (General Purpose SSD) — DEFAULT CHOICE
  Baseline: 3,000 IOPS, 125 MB/s throughput
  Max: 16,000 IOPS, 1,000 MB/s
  Cost: $0.08/GB/month + IOPS/throughput charges
  Use: Boot volumes, web servers, dev/test, small DBs

io2 Block Express (Provisioned IOPS SSD) — HIGH PERFORMANCE
  Max: 256,000 IOPS, 4,000 MB/s
  99.999% durability (vs 99.9% for others)
  Multi-Attach: mount to up to 16 instances (same AZ)
  Use: Production databases, critical OLTP workloads

st1 (Throughput Optimized HDD)
  Max: 500 MB/s throughput, 500 IOPS
  Cost: $0.045/GB/month
  Use: Big data, data warehouses, log processing

sc1 (Cold HDD) — CHEAPEST
  Max: 250 MB/s, 250 IOPS
  Cost: $0.015/GB/month
  Use: Infrequently accessed data, archival

# Snapshots (backups stored in S3):
aws ec2 create-snapshot --volume-id vol-123456 \\
  --description "Daily backup"
# Incremental: only changed blocks are stored
# Cross-region copy for disaster recovery
# Fast Snapshot Restore: pre-warm for instant performance`,
            callouts: [
              { type: "tip", text: "gp3 is almost always the right choice. It decouples IOPS/throughput from size (unlike gp2 where IOPS = 3x GB). A 100GB gp3 gets 3,000 IOPS baseline, while a 100GB gp2 only gets 300 IOPS." }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "database", name: "Database", icon: "🗄️", color: "#8B5CF6",
    services: [
      {
        name: "RDS & Aurora", tagline: "Managed Relational Databases",
        overview: "RDS manages MySQL, PostgreSQL, MariaDB, Oracle, and SQL Server. Aurora is AWS's custom engine — compatible with MySQL/PostgreSQL but 3-5x faster.",
        diagram: `Aurora Architecture — Why It's Different:

  Standard RDS:
  ┌─────────┐     ┌─────────────┐
  │ Primary │────→│ EBS Volume  │  (synchronous replication
  └─────────┘     └─────────────┘   to standby in Multi-AZ)
  ┌─────────┐     ┌─────────────┐
  │ Standby │────→│ EBS Volume  │
  └─────────┘     └─────────────┘
  (2 copies, 2 AZs)

  Aurora:
  ┌──────────┐
  │ Primary  │──write──┐
  └──────────┘         │
  ┌──────────┐         ▼
  │ Replica 1│──read──┌─────────────────────────┐
  └──────────┘        │   Shared Storage Layer   │
  ┌──────────┐        │   6 copies across 3 AZs  │
  │ Replica 2│──read──│   Self-healing            │
  └──────────┘        │   Auto-grows to 128 TB    │
  (up to 15 replicas) │   Continuous backup to S3  │
                      └─────────────────────────┘
  (6 copies, 3 AZs, <10ms replica lag)`,
        sections: [
          {
            title: "Aurora Features & Pricing",
            content: `Aurora offers significant advantages over standard RDS:`,
            code: `# Aurora Key Advantages:
# 1. Performance: 5x MySQL, 3x PostgreSQL
# 2. Storage: Auto-scales 10GB to 128TB, no pre-provisioning
# 3. Replication: 6 copies across 3 AZs (survives AZ+1 failure)
# 4. Replicas: Up to 15 read replicas with <10ms lag
# 5. Failover: Automatic, typically <30 seconds
# 6. Backtrack: "Rewind" database to any point in last 72 hours

# Aurora Serverless v2 — auto-scales compute
resource "aws_rds_cluster" "aurora" {
  cluster_identifier = "app-db"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"
  engine_mode        = "provisioned"  # Use provisioned + serverless v2
  
  serverlessv2_scaling_configuration {
    min_capacity = 0.5   # Scale to 0.5 ACU when idle ($0.06/hr)
    max_capacity = 64    # Scale up to 64 ACU under load
  }
  
  master_username = "admin"
  manage_master_user_password = true  # Auto-manage in Secrets Manager!
  
  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  storage_encrypted = true
  kms_key_id        = aws_kms_key.db.arn
  
  backup_retention_period = 35  # 35-day backup window
  preferred_backup_window = "03:00-04:00"
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
}

# Global Database — cross-region replication
# Primary in us-east-1, replica in eu-west-1
# <1 second replication lag
# Promote replica to standalone in <1 minute during DR`,
            callouts: [
              { type: "scenario", text: "Scenario: Database needs high read throughput for reporting. → Use Aurora with Reader Endpoint. Add 2-3 read replicas — the reader endpoint automatically load-balances across them. Reports hit replicas, writes hit primary. Zero code changes needed." },
              { type: "info", text: "Aurora Serverless v2 is perfect for variable workloads. It can scale from 0.5 ACU (≈1GB RAM, $43/month) to 64 ACU (≈128GB RAM) automatically. You only pay for actual capacity used — idle databases cost almost nothing." }
            ]
          }
        ]
      },
      {
        name: "DynamoDB", tagline: "Serverless NoSQL — Single-Digit Millisecond Latency",
        overview: "DynamoDB is a fully managed key-value and document database. It's serverless, auto-scales, and delivers consistent single-digit millisecond performance at any scale.",
        diagram: `DynamoDB Data Model:

  Table: Users
  ┌────────────────┬─────────────┬───────────────┬──────────┐
  │ PK (Partition) │ SK (Sort)   │ Attributes... │          │
  ├────────────────┼─────────────┼───────────────┼──────────┤
  │ USER#123       │ PROFILE     │ name, email   │ ← Item  │
  │ USER#123       │ ORDER#001   │ total, status │ ← Item  │
  │ USER#123       │ ORDER#002   │ total, status │ ← Item  │
  │ USER#456       │ PROFILE     │ name, email   │ ← Item  │
  │ USER#456       │ ORDER#001   │ total, status │ ← Item  │
  └────────────────┴─────────────┴───────────────┴──────────┘
  
  Single-Table Design: Store related entities in ONE table
  Query USER#123 with SK begins_with("ORDER#") → all orders
  Query USER#123 with SK = "PROFILE" → just the profile
  
  GSI (Global Secondary Index):
  Flip PK/SK to query data differently without duplicating it`,
        sections: [
          {
            title: "Capacity Modes & Features",
            content: `DynamoDB offers two pricing modes:`,
            code: `# On-Demand Mode (pay per request)
  Read:  $1.25 per million read request units
  Write: $6.25 per million write request units
  Best for: unpredictable traffic, new apps, spiky workloads

# Provisioned Mode (set capacity)
  Read:  $0.00065 per RCU/hour
  Write: $0.00065 per WCU/hour
  1 RCU = 1 strongly consistent read/sec (up to 4KB)
  1 WCU = 1 write/sec (up to 1KB)
  Best for: predictable traffic, cost-sensitive
  + Auto Scaling to adjust provisioned capacity automatically

# Key Features:
# DynamoDB Streams — change data capture
  Every insert/update/delete emits an event
  → Lambda trigger for real-time reactions
  → EventBridge Pipes for complex routing
  Example: New order → Lambda → send confirmation email

# Time To Live (TTL) — auto-delete expired items
  Set a TTL attribute with epoch timestamp
  DynamoDB deletes items within 48 hours of expiry
  Free! No write capacity consumed for TTL deletes

# DAX (DynamoDB Accelerator) — in-memory cache
  Microsecond latency (vs millisecond for standard DynamoDB)
  Drop-in replacement — same DynamoDB API
  Great for read-heavy, repetitive queries

# Global Tables — multi-region active-active
  Write to any region, auto-replicated to all others
  Typically <1 second replication lag
  Active-active: reads and writes in every region`,
            callouts: [
              { type: "tip", text: "Start with On-Demand mode. Switch to Provisioned + Auto Scaling once you understand traffic patterns — it can save 60-70% for predictable workloads." },
              { type: "scenario", text: "Scenario: Gaming leaderboard — millions of reads/sec, bursty writes. → DynamoDB On-Demand + DAX cache. PK=GameID, SK=Score#UserID. Use Query with ScanIndexForward=false to get top scores. DAX handles cache hits in microseconds, DynamoDB handles cache misses in milliseconds." }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "networking", name: "Networking", icon: "🌐", color: "#3B82F6",
    services: [
      {
        name: "VPC Architecture", tagline: "Your Private Network in the Cloud",
        overview: "VPC is the network foundation of every AWS deployment. Understanding VPC components is essential for any cloud engineer role.",
        diagram: `Complete VPC Architecture:

  Internet
     │
  ┌──▼───────────────────────────────────────────┐
  │  Internet Gateway                             │
  └──┬────────────────────────────────────────────┘
     │
  ┌──▼──────────── PUBLIC SUBNET (AZ-a) ──────────┐
  │  Route: 0.0.0.0/0 → IGW                       │
  │  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
  │  │   ALB    │  │ NAT GW   │  │  Bastion    │  │
  │  └────┬─────┘  └────┬─────┘  └─────────────┘  │
  └───────┼──────────────┼─────────────────────────┘
          │              │
  ┌───────▼───── PRIVATE SUBNET (AZ-a) ───────────┐
  │  Route: 0.0.0.0/0 → NAT GW                    │
  │  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
  │  │ App EC2  │  │ EKS Node │  │  Lambda     │  │
  │  └────┬─────┘  └────┬─────┘  └─────────────┘  │
  └───────┼──────────────┼─────────────────────────┘
          │              │
  ┌───────▼───── DATA SUBNET (AZ-a) ──────────────┐
  │  Route: local only (NO internet route)         │
  │  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
  │  │  Aurora  │  │  Redis   │  │ OpenSearch  │  │
  │  └──────────┘  └──────────┘  └─────────────┘  │
  └────────────────────────────────────────────────┘
  
  Repeat for AZ-b and AZ-c (3 AZs = production HA)`,
        sections: [
          {
            title: "Security Groups vs NACLs",
            content: `Two layers of firewall protection — know the differences:`,
            vs: { leftLabel: "Security Groups", left: "Instance-level (attached to ENI). Stateful — return traffic auto-allowed. Allow rules only. All rules evaluated. Can reference other SGs. Default: all outbound allowed, no inbound. Best for: primary access control per resource.", rightLabel: "NACLs", right: "Subnet-level. Stateless — must allow both directions. Allow AND Deny rules. Rules evaluated in order (lowest number first). CIDR-based only. Default: all traffic allowed. Best for: subnet-wide blocking, blacklisting IPs." },
            code: `# Security Group Chaining — the right pattern:
#
# Internet → [SG: alb] ALB :443
#              only allows HTTPS from 0.0.0.0/0
#                    │
#              [SG: app] EC2/EKS :8080
#              only allows :8080 from SG:alb  ← SG reference!
#                    │
#              [SG: db] RDS :5432
#              only allows :5432 from SG:app  ← SG reference!
#
# Why SG references are better than CIDR:
# - Dynamic: new instances auto-inherit rules
# - Cleaner: no IP management
# - Secure: only specific resources can connect

# NACL Example — Block a known bad IP range:
aws ec2 create-network-acl-entry \\
  --network-acl-id acl-12345 \\
  --rule-number 50 \\
  --protocol -1 \\
  --rule-action deny \\
  --cidr-block 203.0.113.0/24 \\
  --ingress
# Rule 50 evaluated BEFORE rule 100 (allow all)
# This blocks the bad range while allowing everything else`,
            callouts: [
              { type: "info", text: "In practice, 90% of your firewall work is done with Security Groups. Use NACLs only for broad subnet-level rules like blocking known malicious IP ranges or as a second defense layer for compliance requirements." }
            ]
          },
          {
            title: "VPC Connectivity — All Options",
            content: `How to connect VPCs, on-premises, and other networks:`,
            diagram2: `VPC Peering (point-to-point, non-transitive):
  VPC-A ←→ VPC-B ←→ VPC-C
  A can reach B, B can reach C, but A CANNOT reach C through B

Transit Gateway (hub-and-spoke, transitive):
  VPC-A ─┐
  VPC-B ─┼── TGW ──── VPN ── On-Premises
  VPC-C ─┘       └─── Direct Connect
  All VPCs can reach each other and on-prem

VPC Endpoints (private access to AWS services):
  ┌──────────────────────────┐
  │  Private Subnet          │
  │  EC2 ──→ Gateway EP ──→ S3       (free, route table entry)
  │  EC2 ──→ Interface EP ──→ SQS    (ENI in subnet, per-hour)
  │  EC2 ──→ Interface EP ──→ ECR    (no internet needed!)
  └──────────────────────────┘`,
            callouts: [
              { type: "scenario", text: "Scenario: 20 VPCs across 4 AWS accounts need to talk to each other and to an on-premises data center. → Transit Gateway + AWS RAM (Resource Access Manager) to share TGW across accounts. Route tables for segmentation: production VPCs can reach each other, dev VPCs isolated, all can reach shared-services VPC." }
            ]
          }
        ]
      },
      {
        name: "Route 53 & CloudFront", tagline: "DNS + Global Content Delivery",
        overview: "Route 53 provides DNS routing and health checks. CloudFront delivers content from 450+ edge locations worldwide.",
        diagram: `User Request Flow with Route 53 + CloudFront + ALB:

  User (Tokyo)
     │
     ▼
  Route 53 DNS  ─── Latency routing → nearest region
     │
     ▼
  CloudFront Edge (Tokyo)  ─── Cache HIT? → Return cached content
     │ (cache MISS)
     ▼
  ALB (ap-northeast-1)
     │
     ▼
  EC2/EKS (origin)
     │
     ▼
  Response → CloudFront caches it → User gets response
  
  Next request from Tokyo: served from edge cache (~5ms)
  vs going to origin: (~150ms)`,
        sections: [
          {
            title: "Route 53 Routing Policies",
            content: `Route 53 offers multiple routing strategies:`,
            code: `# Simple — single resource, no health checks
# example.com → 1.2.3.4

# Weighted — split traffic by percentage (A/B testing)
# example.com → 70% to v1-alb, 30% to v2-alb

# Latency-based — route to nearest region
# example.com → us-east-1 ALB (for US users)
#             → eu-west-1 ALB (for EU users)
#             → ap-northeast-1 ALB (for Asia users)

# Failover — active-passive disaster recovery
# example.com → Primary (us-east-1)
#                 ↓ health check fails
#             → Secondary (eu-west-1)

# Geolocation — route by user location
# example.com → US users → us-alb
#             → EU users → eu-alb (GDPR compliant)
#             → Default  → us-alb

# Multi-value — return up to 8 healthy IPs
# Client-side load balancing with health checks`,
            callouts: [
              { type: "scenario", text: "Scenario: Build a globally available web app with automatic failover. → Latency-based routing to ALBs in us-east-1 and eu-west-1. Route 53 health checks on both endpoints. If us-east-1 goes down, Route 53 automatically routes all traffic to eu-west-1. Combine with CloudFront for edge caching." }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "security", name: "Security & Identity", icon: "🛡️", color: "#EF4444",
    services: [
      {
        name: "IAM Deep Dive", tagline: "Who Can Do What on Which Resources",
        overview: "IAM (Identity and Access Management) controls all access in AWS. Every API call is authenticated and authorized through IAM. It is the most important service to understand.",
        diagram: `IAM Entity Hierarchy:

  AWS Account (root)
     │
     ├── IAM Users ─── long-term credentials
     │    └── User → Group → Policy
     │
     ├── IAM Roles ─── temporary credentials
     │    ├── EC2 Instance Role
     │    ├── Lambda Execution Role
     │    ├── EKS Pod Role (IRSA)
     │    └── Cross-Account Role
     │
     └── IAM Policies (JSON documents)
          ├── AWS Managed (predefined)
          ├── Customer Managed (you create)
          └── Inline (embedded in user/role)

  Policy Evaluation Logic:
  1. Explicit DENY?     → DENIED (always wins)
  2. Explicit ALLOW?    → ALLOWED
  3. Neither?           → DENIED (default deny)`,
        sections: [
          {
            title: "IAM Policy Examples",
            content: `Policies are JSON documents with Effect, Action, Resource, and optional Conditions:`,
            code: `// Example 1: Allow S3 read-only to specific bucket
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:GetObject",
      "s3:ListBucket"
    ],
    "Resource": [
      "arn:aws:s3:::my-data-bucket",
      "arn:aws:s3:::my-data-bucket/*"
    ]
  }]
}

// Example 2: Deny delete on production resources
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Action": [
      "rds:DeleteDB*",
      "ec2:TerminateInstances",
      "s3:DeleteBucket"
    ],
    "Resource": "*",
    "Condition": {
      "StringEquals": {
        "aws:ResourceTag/Environment": "production"
      }
    }
  }]
}

// Example 3: Allow access only from specific VPC
{
  "Effect": "Deny",
  "Action": "*",
  "Resource": "*",
  "Condition": {
    "StringNotEquals": {
      "aws:SourceVpc": "vpc-abc12345"
    }
  }
}

// Example 4: Require MFA for sensitive actions
{
  "Effect": "Deny",
  "Action": ["iam:*", "organizations:*", "account:*"],
  "Resource": "*",
  "Condition": {
    "BoolIfExists": {
      "aws:MultiFactorAuthPresent": "false"
    }
  }
}`,
            callouts: [
              { type: "tip", text: "Best practices: 1) Never use root account — create IAM users/roles. 2) Use Roles (temporary creds) over Users (long-term keys) whenever possible. 3) Apply least privilege — start with zero permissions, add only what's needed. 4) Use AWS IAM Access Analyzer to identify unused permissions." },
              { type: "warn", text: "IAM policy evaluation: Explicit DENY always wins over ALLOW. If any policy attached to a principal has a Deny for an action, it is denied regardless of any Allow statements elsewhere." }
            ]
          }
        ]
      },
      {
        name: "Encryption & Key Management", tagline: "KMS, Secrets Manager, ACM",
        overview: "AWS provides multiple services for encryption and secret management. KMS manages encryption keys, Secrets Manager stores and rotates secrets, and ACM provides SSL/TLS certificates.",
        diagram: `Encryption in AWS — Data at Rest & in Transit:

  In Transit (TLS/SSL):
  Client ──HTTPS──→ ALB ──TLS──→ EC2/EKS
  (ACM cert)       (ACM cert)  (self-signed or ACM)

  At Rest:
  ┌──────────┐   ┌──────────────────────────────┐
  │   Data   │──→│  KMS Encryption              │
  └──────────┘   │  ┌────────────────────────┐  │
                 │  │ Data Key (plaintext)    │  │
                 │  │ encrypts your data      │  │
                 │  └────────────────────────┘  │
                 │  ┌────────────────────────┐  │
                 │  │ Master Key (CMK)       │  │
                 │  │ encrypts the data key  │  │
                 │  │ never leaves KMS        │  │
                 │  └────────────────────────┘  │
                 └──────────────────────────────┘
  This is "Envelope Encryption" — the standard AWS pattern`,
        sections: [
          {
            title: "KMS, Secrets Manager, Parameter Store",
            content: `Three services that are often confused:`,
            code: `# KMS — Encryption Key Management
# Create a customer-managed key:
aws kms create-key --description "App encryption key"
# Use it with S3, EBS, RDS, DynamoDB, etc.
# Auto-rotation available (every year for CMKs)
# Key policies control WHO can use the key

# Secrets Manager — Store & Rotate Secrets
aws secretsmanager create-secret \\
  --name prod/db/password \\
  --secret-string '{"username":"admin","password":"s3cret"}'
# Auto-rotation: Lambda rotates password on schedule
# Cross-region replication for DR
# Cost: $0.40/secret/month + $0.05/10K API calls

# SSM Parameter Store — Config & Secrets
aws ssm put-parameter \\
  --name "/app/prod/db-host" \\
  --value "db.example.com" \\
  --type "String"  # or SecureString (encrypted with KMS)
# Free for Standard tier (up to 10K params)
# Hierarchical: /app/prod/*, /app/dev/*
# No auto-rotation (use Secrets Manager for that)

# When to use which:
# KMS: encryption keys for AWS services
# Secrets Manager: DB passwords, API keys (need rotation)
# Parameter Store: config values, feature flags, non-rotating secrets`,
            callouts: [
              { type: "scenario", text: "Scenario: Your app needs a database password that rotates every 30 days. → Secrets Manager with auto-rotation enabled. Create a Lambda rotation function (AWS provides templates for RDS). App reads secret at startup using SDK. When secret rotates, app's next read gets the new password automatically." }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "messaging", name: "Messaging & Streaming", icon: "📨", color: "#F59E0B",
    services: [
      {
        name: "SQS, SNS, EventBridge", tagline: "Asynchronous Communication Between Services",
        overview: "These three services decouple your application components. SQS is a queue (point-to-point), SNS is pub/sub (fan-out), and EventBridge is an event bus (routing).",
        diagram: `Messaging Patterns:

  SQS (Queue — pull-based):
  Producer → [Message Queue] → Consumer
  One message consumed by ONE consumer
  "Job queue" pattern

  SNS (Pub/Sub — push-based):
  Publisher → [Topic] → Subscriber 1 (Lambda)
                     → Subscriber 2 (SQS)
                     → Subscriber 3 (Email)
  One message delivered to ALL subscribers
  "Broadcast" pattern

  SNS + SQS Fan-out (most common):
                    ┌→ SQS Queue A → Service A (orders)
  Order Event → SNS ├→ SQS Queue B → Service B (inventory)
                    └→ SQS Queue C → Service C (analytics)
  Each service processes independently, at its own pace

  EventBridge (Event Router):
  ┌──────────┐     ┌──────────────┐     ┌──────────────┐
  │ Source A  │──→  │  Event Bus   │──→  │ Target 1     │
  │ Source B  │──→  │  (rules      │──→  │ Target 2     │
  │ AWS svc  │──→  │   filter &   │──→  │ Target 3     │
  │ SaaS     │──→  │   route)     │     └──────────────┘
  └──────────┘     └──────────────┘
  Content-based routing: "if source=orders AND total>1000 → alerting"`,
        sections: [
          {
            title: "SQS In Depth",
            content: `SQS is the workhorse of AWS async processing:`,
            code: `# Standard Queue vs FIFO Queue
#
# Standard:
#   Throughput: Unlimited
#   Ordering: Best-effort (not guaranteed)
#   Delivery: At-least-once (possible duplicates)
#   Use: High throughput where order doesn't matter
#
# FIFO:
#   Throughput: 300 msg/s (3,000 with batching)
#   Ordering: Guaranteed FIFO within MessageGroupId
#   Delivery: Exactly-once
#   Use: Order processing, financial transactions

# Key Concepts:
# Visibility Timeout: After consumer reads message, it's hidden
#   from other consumers for this duration.
#   Default: 30 seconds. Set to >= your processing time.
#   If processing takes 5 min, set visibility to 6 min.
#   Otherwise: message becomes visible again → duplicate processing!

# Dead Letter Queue (DLQ): After N failed processing attempts,
#   message moves to DLQ for investigation.
#   Set maxReceiveCount = 3 (try 3 times, then DLQ)
#   Monitor DLQ length with CloudWatch alarms

# Long Polling: Consumer waits up to 20s for messages
#   Reduces empty responses (saves money, reduces latency)
#   Set WaitTimeSeconds = 20 (vs 0 for short polling)

# Example: Lambda consuming from SQS
resource "aws_lambda_event_source_mapping" "sqs" {
  event_source_arn = aws_sqs_queue.orders.arn
  function_name    = aws_lambda_function.process_order.arn
  batch_size       = 10                   # 10 messages per invocation
  maximum_batching_window_in_seconds = 5  # Wait 5s for batch to fill
  
  # Partial batch failure handling
  function_response_types = ["ReportBatchItemFailures"]
  # Lambda reports which items failed → only those retry
  # Without this: entire batch retries on any failure!
}`,
            callouts: [
              { type: "tip", text: "Always use ReportBatchItemFailures with Lambda+SQS. Without it, if 1 of 10 messages fails, all 10 are retried — including the 9 that succeeded. With partial batch, only the failed message retries." },
              { type: "scenario", text: "Scenario: E-commerce order processing. Order placed → SQS → Lambda processes payment → success → SNS notifies (email, inventory update, analytics). If payment fails → message returns to queue → retries 3x → DLQ → ops team investigates." }
            ]
          }
        ]
      },
      {
        name: "Kinesis", tagline: "Real-Time Data Streaming",
        overview: "Kinesis processes real-time streaming data at scale — from IoT sensors, click streams, application logs, to social media feeds.",
        diagram: `Kinesis Family:

  Kinesis Data Streams (real-time, you manage shards):
  Producers → [Shard 1] → Consumer A (Lambda)
              [Shard 2] → Consumer B (KCL app)
              [Shard 3] → Consumer C (Kinesis Analytics)
  
  1 shard = 1 MB/s in, 2 MB/s out
  Add shards to scale throughput
  Retention: 24hr (default) to 365 days

  Kinesis Data Firehose (near real-time, fully managed):
  Producers → [Firehose] → S3 / Redshift / OpenSearch / HTTP
  Auto-scales, no shards to manage
  Buffering: 60-900 seconds or 1-128 MB
  Can transform data with Lambda before delivery

  When to use which:
  Data Streams: real-time (<200ms), custom processing, replay
  Firehose: near real-time (60s+), delivery to storage/analytics`,
        sections: [
          {
            title: "Kinesis vs SQS — When to Choose",
            content: `Both process messages, but with very different models:`,
            vs: { leftLabel: "SQS", left: "Pull-based queue. Message deleted after processing. One consumer per message. Unlimited throughput (Standard). No ordering guarantee (Standard). Best for: job queues, decoupling services, when each message needs unique processing.", rightLabel: "Kinesis", right: "Stream-based. Data retained for replay (24hr-365d). Multiple consumers read same data. Ordered within shard. Throughput limited by shard count. Best for: real-time analytics, log aggregation, IoT ingestion, event sourcing." },
            callouts: [
              { type: "scenario", text: "Scenario: Track user clickstream data for real-time analytics dashboard + batch analytics in S3. → Kinesis Data Streams. Multiple consumers: Lambda for real-time dashboard updates, Firehose for delivery to S3 data lake, Kinesis Analytics for real-time SQL aggregations. All reading the same stream independently." }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "monitoring", name: "Monitoring & Observability", icon: "📊", color: "#EC4899",
    services: [
      {
        name: "CloudWatch", tagline: "Metrics, Logs, Alarms, Dashboards",
        overview: "CloudWatch is the monitoring hub for all AWS resources. It collects metrics, stores logs, triggers alarms, and provides dashboards.",
        diagram: `CloudWatch Observability Stack:

  ┌─────────────────────────────────────────────────┐
  │                 CloudWatch                       │
  │                                                 │
  │  Metrics ←── EC2, RDS, Lambda, ALB, custom      │
  │    │                                            │
  │    ├── Alarms → SNS → PagerDuty / email         │
  │    │         → Auto Scaling (scale out/in)       │
  │    │         → Lambda (auto-remediate)            │
  │    │                                            │
  │    └── Dashboards (real-time visualization)      │
  │                                                 │
  │  Logs ←── Application logs, VPC Flow Logs        │
  │    │   ←── CloudTrail, Lambda, ECS, EKS          │
  │    │                                            │
  │    ├── Log Insights (SQL-like query engine)       │
  │    ├── Metric Filters (log → metric → alarm)     │
  │    └── Subscription → Lambda / OpenSearch / S3    │
  │                                                 │
  │  Events/EventBridge ←── AWS API calls            │
  │    └── Rules → Lambda, SQS, Step Functions       │
  └─────────────────────────────────────────────────┘`,
        sections: [
          {
            title: "Alarms, Metrics, and Log Insights",
            content: `Practical monitoring setup:`,
            code: `# Custom Metric — push application metrics
aws cloudwatch put-metric-data \\
  --namespace "MyApp" \\
  --metric-name "OrdersProcessed" \\
  --value 42 \\
  --unit Count \\
  --dimensions Environment=prod,Service=orders

# Alarm — alert when error rate > 5%
aws cloudwatch put-metric-alarm \\
  --alarm-name "HighErrorRate" \\
  --metric-name "5XXError" \\
  --namespace "AWS/ApplicationELB" \\
  --statistic Sum \\
  --period 300 \\
  --evaluation-periods 2 \\
  --threshold 50 \\
  --comparison-operator GreaterThanThreshold \\
  --alarm-actions "arn:aws:sns:us-east-1:123:ops-alerts" \\
  --dimensions "LoadBalancer=app/my-alb/abc123"

# Log Insights — query logs with SQL-like syntax
# Find top 10 most expensive Lambda invocations:
fields @timestamp, @duration, @memorySize, @billedDuration
| filter @type = "REPORT"
| sort @duration desc
| limit 10

# Find 5xx errors in ALB access logs:
fields @timestamp, elb_status_code, target_status_code, request_url
| filter elb_status_code >= 500
| stats count() as error_count by request_url
| sort error_count desc
| limit 20

# Count errors by hour:
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() as errors by bin(1h)

# Metric Filter — create metric from log pattern
# "ERROR" in logs → CloudWatch metric → alarm
aws logs put-metric-filter \\
  --log-group-name "/app/api" \\
  --filter-name "ErrorCount" \\
  --filter-pattern "ERROR" \\
  --metric-transformations \\
    metricName=ErrorCount,metricNamespace=MyApp,metricValue=1`,
            callouts: [
              { type: "tip", text: "Essential CloudWatch alarms for any production app: 1) ALB 5XX count > threshold, 2) Target group unhealthy host count > 0, 3) CPU/memory > 80%, 4) Lambda error rate > 1%, 5) SQS DLQ messages > 0, 6) RDS connections > 80% max." },
              { type: "scenario", text: "Scenario: Your Lambda function occasionally times out. How to debug? → CloudWatch Log Insights: filter @type='REPORT' and @duration > 10000 to find slow invocations. Check @maxMemoryUsed vs @memorySize — if near 100%, memory-bound (increase memory = more CPU too). Set alarm on Duration P99 metric to catch regression." }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "devops", name: "CI/CD & IaC", icon: "🔄", color: "#06B6D4",
    services: [
      {
        name: "Terraform vs CloudFormation", tagline: "Infrastructure as Code Comparison",
        overview: "Both tools let you define infrastructure in code. Terraform is multi-cloud and uses HCL. CloudFormation is AWS-native and uses JSON/YAML.",
        diagram: `IaC Workflow:

  Developer writes code (.tf or .yaml)
      │
      ▼
  Version Control (Git)
      │
      ▼
  CI/CD Pipeline
      │
      ├── terraform plan / cfn change set  (preview changes)
      │
      ├── Code Review (PR approval)
      │
      ├── terraform apply / cfn deploy     (apply changes)
      │
      └── State updated (Terraform state / CFN stack)
      
  Terraform State (remote):
  ┌──────────────────────────────────────┐
  │  S3 Bucket: terraform-state          │
  │    └── prod/vpc/terraform.tfstate    │
  │    └── prod/eks/terraform.tfstate    │
  │  DynamoDB Table: terraform-locks     │
  │    └── LockID prevents concurrent    │
  └──────────────────────────────────────┘`,
        sections: [
          {
            title: "Terraform vs CloudFormation Decision",
            content: `Which to choose depends on your environment:`,
            vs: { leftLabel: "Terraform", left: "Multi-cloud (AWS, Azure, GCP, K8s, Datadog...). HCL syntax (cleaner than JSON/YAML). Rich module ecosystem. State file management required. import existing resources. More flexible provider system. Better for: multi-cloud, complex modules, teams that want provider diversity.", rightLabel: "CloudFormation", right: "AWS-only with deepest integration. YAML/JSON templates. StackSets for multi-account/region. Drift detection built-in. No state file to manage. Nested stacks for modularity. Better for: AWS-only shops, deep AWS integration, less ops overhead." },
            code: `# Terraform Essential Commands:
terraform init      # Download providers, setup backend
terraform plan      # Preview changes (ALWAYS review!)
terraform apply     # Apply changes to infrastructure
terraform destroy   # Remove all managed resources
terraform import    # Import existing resource to state
terraform state list # See all managed resources
terraform fmt       # Format code consistently
terraform validate  # Check syntax

# Remote State — always use in teams:
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/vpc/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

# Modules — reusable infrastructure components:
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.0"
  name    = "production"
  cidr    = "10.0.0.0/16"
  azs     = ["us-east-1a", "us-east-1b"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.11.0/24", "10.0.12.0/24"]
}`,
            callouts: [
              { type: "tip", text: "Golden rule: never run terraform apply from your laptop in production. Always run through a CI/CD pipeline with: automated plan → PR review → approved apply → state locked. This prevents accidental changes and provides audit trail." }
            ]
          }
        ]
      }
    ]
  }
];

// ===== MAIN COMPONENT =====
export default function AWSEncyclopedia() {
  const [activeCat, setActiveCat] = useState("compute");
  const [activeSvc, setActiveSvc] = useState(0);
  const [openSections, setOpenSections] = useState({});
  const toggleSec = (k) => setOpenSections(p => ({ ...p, [k]: !p[k] }));

  const cat = categories.find(c => c.id === activeCat);
  const svc = cat?.services[activeSvc];

  useEffect(() => { setActiveSvc(0); setOpenSections({}); }, [activeCat]);

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", background: "#060D1B", minHeight: "100vh", color: "#CBD5E1" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "linear-gradient(160deg, #0a1628, #141b33, #0a1628)", borderBottom: "1px solid #1a2744", padding: "22px 24px 16px" }}>
        <h1 style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 700, background: "linear-gradient(90deg, #60A5FA, #C084FC, #F472B6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          AWS Services Encyclopedia
        </h1>
        <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>Detailed explanations • Architecture diagrams • Code examples • Real-world scenarios</p>

        {/* Category bar */}
        <div style={{ display: "flex", gap: 4, marginTop: 16, overflowX: "auto", paddingBottom: 4 }}>
          {categories.map(c => (
            <button key={c.id} onClick={() => setActiveCat(c.id)} style={{
              padding: "8px 14px", border: activeCat === c.id ? `2px solid ${c.color}` : "1px solid #1a2744", borderRadius: 8,
              cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
              background: activeCat === c.id ? c.color + "15" : "#0d1525", color: activeCat === c.id ? c.color : "#64748B", transition: "all 0.2s"
            }}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

      {cat && (
        <div style={{ padding: "16px 24px", maxWidth: 960, margin: "0 auto" }}>
          {/* Service tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
            {cat.services.map((s, i) => (
              <button key={i} onClick={() => { setActiveSvc(i); setOpenSections({}); }} style={{
                padding: "10px 16px", border: activeSvc === i ? `2px solid ${cat.color}` : "1px solid #1a2744",
                borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, textAlign: "left",
                background: activeSvc === i ? cat.color + "12" : "#0d1525", color: activeSvc === i ? "#F1F5F9" : "#64748B", transition: "all 0.15s",
                flex: "1 1 auto", minWidth: 140
              }}>
                <div style={{ color: activeSvc === i ? cat.color : "#64748B", fontSize: 14, fontWeight: 700 }}>{s.name}</div>
                <div style={{ fontSize: 11, marginTop: 2, color: "#475569" }}>{s.tagline}</div>
              </button>
            ))}
          </div>

          {/* Service content */}
          {svc && (
            <div>
              {/* Overview */}
              <div style={{ background: "#0d1525", border: "1px solid #1a2744", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
                <h2 style={{ margin: "0 0 8px", fontSize: 20, color: cat.color }}>{svc.name}</h2>
                <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.7 }}>{svc.overview}</p>
                {svc.diagram && <Diagram title="Architecture Diagram">{svc.diagram}</Diagram>}
              </div>

              {/* Sections */}
              {svc.sections.map((sec, si) => {
                const key = `${activeCat}-${activeSvc}-${si}`;
                const isOpen = openSections[key] !== false;
                return (
                  <div key={si} style={{ background: "#0d1525", border: "1px solid #1a2744", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
                    <button onClick={() => toggleSec(key)} style={{
                      width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "14px 20px", border: "none", background: isOpen ? cat.color + "08" : "transparent",
                      cursor: "pointer", color: "#F1F5F9", fontFamily: "inherit", fontSize: 15, fontWeight: 700, textAlign: "left"
                    }}>
                      {sec.title}
                      <span style={{ fontSize: 12, color: "#475569", transform: isOpen ? "rotate(180deg)" : "none", transition: "0.2s" }}>▼</span>
                    </button>

                    {isOpen && (
                      <div style={{ padding: "4px 20px 20px" }}>
                        {sec.content && <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.7 }}>{sec.content}</p>}
                        {sec.vs && <VS {...sec.vs} color={cat.color} />}
                        {sec.diagram2 && <Diagram>{sec.diagram2}</Diagram>}
                        {sec.code && <Code>{sec.code}</Code>}
                        {sec.callouts && sec.callouts.map((c, ci) => <Callout key={ci} type={c.type}>{c.text}</Callout>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ textAlign: "center", padding: "20px", color: "#1E293B", fontSize: 11, borderTop: "1px solid #111827", marginTop: 32 }}>
        AWS Services Encyclopedia — Cloud Engineer Interview Preparation — March 2026
      </div>
    </div>
  );
}
