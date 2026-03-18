import { useState, useMemo } from "react";

const Code = ({ children }) => (
  <pre style={{
    background: "#0B1120", border: "1px solid #1E3A5F", borderRadius: 8, padding: "14px 18px",
    fontSize: 12.5, lineHeight: 1.7, overflowX: "auto", margin: "10px 0 14px",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace", color: "#93C5FD", whiteSpace: "pre-wrap", wordBreak: "break-word"
  }}>{children}</pre>
);

const Tag = ({ text, color = "#3B82F6" }) => (
  <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: color + "20", color, marginRight: 6, marginBottom: 4 }}>{text}</span>
);

const Note = ({ type = "info", children }) => {
  const styles = {
    info: { bg: "#1E3A5F20", border: "#3B82F6", icon: "💡", label: "Key Point" },
    warn: { bg: "#92400E20", border: "#F59E0B", icon: "⚠️", label: "Watch Out" },
    tip: { bg: "#065F4620", border: "#10B981", icon: "✅", label: "Best Practice" },
    example: { bg: "#581C8720", border: "#A78BFA", icon: "📌", label: "Real Example" },
    interview: { bg: "#9F123A20", border: "#F43F5E", icon: "🎯", label: "Interview Tip" },
  };
  const s = styles[type];
  return (
    <div style={{ padding: "12px 16px", background: s.bg, borderLeft: `3px solid ${s.border}`, borderRadius: "0 8px 8px 0", margin: "12px 0", fontSize: 13, lineHeight: 1.7, color: "#CBD5E1" }}>
      <strong style={{ color: s.border }}>{s.icon} {s.label}:</strong> {children}
    </div>
  );
};

const allTopics = [
  {
    id: "elb", title: "Elastic Load Balancing", icon: "⚖️", color: "#F59E0B", tags: ["Networking", "High Availability"],
    content: [
      {
        title: "Overview & Types",
        body: `ELB distributes incoming traffic across multiple targets. It is a critical component for building highly available, fault-tolerant architectures on AWS.`,
        subsections: [
          {
            title: "Application Load Balancer (ALB) — Layer 7",
            body: `ALB operates at the HTTP/HTTPS layer and is the most feature-rich option for web applications and microservices.`,
            example: `Scenario: You have a microservices app on EKS with 3 services — user-service, order-service, and payment-service.

ALB Routing Rules:
  /api/users/*   →  Target Group: user-service (port 8080)
  /api/orders/*  →  Target Group: order-service (port 8081)
  /api/payments/* → Target Group: payment-service (port 8082)

Host-based routing:
  api.myapp.com     → Backend API target group
  dashboard.myapp.com → Dashboard target group`,
            code: `# Terraform — ALB with path-based routing
resource "aws_lb" "main" {
  name               = "app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = var.public_subnets  # Must be in 2+ AZs

  enable_deletion_protection = true
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.cert.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.default.arn
  }
}

resource "aws_lb_listener_rule" "users_api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.users.arn
  }

  condition {
    path_pattern { values = ["/api/users/*"] }
  }
}

# Weighted routing for canary deployments
resource "aws_lb_listener_rule" "canary" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 50

  action {
    type = "forward"
    forward {
      target_group { arn = aws_lb_target_group.v1.arn; weight = 90 }
      target_group { arn = aws_lb_target_group.v2.arn; weight = 10 }
    }
  }

  condition {
    path_pattern { values = ["/api/orders/*"] }
  }
}`,
            notes: [
              { type: "tip", text: "ALB supports weighted target groups — perfect for canary deployments. Route 90% to v1 and 10% to v2, then gradually shift." },
              { type: "interview", text: "\"How do you do blue-green deployment with ALB?\" → Create two target groups. Use weighted routing to shift traffic. 100/0 → 90/10 → 50/50 → 0/100. Instant rollback by reversing weights." }
            ]
          },
          {
            title: "Network Load Balancer (NLB) — Layer 4",
            body: `NLB operates at the TCP/UDP layer. It is designed for extreme performance — millions of requests per second with ultra-low latency.`,
            example: `Scenario: You need to expose a gRPC service running on EKS that handles real-time bidding (millions req/sec, <5ms latency).

NLB is the right choice because:
✓ Layer 4 — supports TCP directly (gRPC uses HTTP/2 over TCP)
✓ Static IP per AZ — clients can allowlist specific IPs
✓ Preserves source IP — needed for audit logging
✓ Ultra-low latency (<100 microseconds added)

ALB would NOT work well here because:
✗ Additional HTTP parsing overhead
✗ No static IP support (dynamic IPs change)
✗ Higher latency for passthrough scenarios`,
            code: `# Terraform — NLB for gRPC/TCP workloads
resource "aws_lb" "grpc" {
  name               = "grpc-nlb"
  internal           = true
  load_balancer_type = "network"
  subnets            = var.private_subnets

  enable_cross_zone_load_balancing = true
}

resource "aws_lb_target_group" "grpc" {
  name        = "grpc-targets"
  port        = 50051
  protocol    = "TCP"
  vpc_id      = var.vpc_id
  target_type = "ip"  # Direct to pod IPs in EKS

  health_check {
    protocol            = "TCP"
    port                = 50051
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 10
  }
}`,
            notes: [
              { type: "info", text: "NLB supports TLS termination — offload TLS decryption at the load balancer using ACM certificates, reducing CPU load on your backend pods." },
              { type: "warn", text: "NLB does NOT support Security Groups by default (recently added). Use NACLs and target Security Groups for access control." }
            ]
          },
          {
            title: "ALB vs NLB Decision Matrix",
            body: `Here is how to decide which load balancer to use:`,
            example: `┌─────────────────────┬──────────────────┬──────────────────┐
│ Feature             │ ALB              │ NLB              │
├─────────────────────┼──────────────────┼──────────────────┤
│ Layer               │ 7 (HTTP/HTTPS)   │ 4 (TCP/UDP/TLS)  │
│ Latency added       │ ~few ms          │ ~100 μs          │
│ Static IP           │ No (use GA)      │ Yes (per AZ)     │
│ Path routing        │ Yes              │ No               │
│ Host routing        │ Yes              │ No               │
│ WebSocket           │ Yes              │ Yes (TCP)        │
│ gRPC                │ Yes (native)     │ Yes (TCP)        │
│ WAF integration     │ Yes              │ No               │
│ Lambda targets      │ Yes              │ No               │
│ Source IP preserved │ No (X-Forwarded) │ Yes              │
│ Cross-zone LB       │ Always on (free) │ Optional (paid)  │
│ Sticky sessions     │ Yes (cookies)    │ Yes (5-tuple)    │
│ Use for EKS         │ Ingress resource │ Service type LB  │
└─────────────────────┴──────────────────┴──────────────────┘`,
            notes: [
              { type: "interview", text: "\"When would you choose NLB over ALB?\" → When you need static IPs for firewall allowlisting, source IP preservation, ultra-low latency (<1ms), raw TCP/UDP support, or PrivateLink (NLB is required for VPC Endpoint Services)." }
            ]
          }
        ]
      },
      {
        title: "Health Checks & Cross-Zone Load Balancing",
        body: `Health checks are crucial — they determine which targets receive traffic.`,
        subsections: [
          {
            title: "Health Check Configuration",
            body: `ELB sends periodic requests to targets. If a target fails enough consecutive checks, it's removed from the pool.`,
            code: `# ALB Health Check — Terraform
resource "aws_lb_target_group" "app" {
  name     = "app-targets"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    path                = "/health"        # App must respond 200 here
    port                = "traffic-port"   # Same port as target
    protocol            = "HTTP"
    healthy_threshold   = 2    # 2 consecutive passes → healthy
    unhealthy_threshold = 3    # 3 consecutive fails → unhealthy
    interval            = 15   # Check every 15 seconds
    timeout             = 5    # 5 second timeout per check
    matcher             = "200-299"  # HTTP status codes = healthy
  }

  # Connection draining
  deregistration_delay = 60  # 60s to finish in-flight requests

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400  # 24 hours
    enabled         = true
  }
}`,
            example: `Real-World Scenario: MicroStrategy CMC Health Check

Your Intelligence Server behind ALB exposes /api/v1/status:
  200 → Server is healthy, cache is warm, connections OK
  503 → Server is starting up or overloaded

Configure health check:
  Path: /api/v1/status
  Interval: 30s (MSTR server startup is slow)
  Healthy threshold: 2 
  Unhealthy threshold: 5 (avoid false positives during GC pauses)
  Timeout: 10s (MSTR can be slow under load)

Result: ALB only sends traffic to fully warmed-up instances.`,
            notes: [
              { type: "tip", text: "Always create a dedicated /health endpoint in your application. It should check database connectivity, cache availability, and downstream services. Don't use '/' — it may be too heavy for frequent health checks." },
              { type: "warn", text: "Setting unhealthy_threshold too low (e.g., 1) can cause flapping — targets marked unhealthy during brief GC pauses or network blips, then immediately re-registered." }
            ]
          },
          {
            title: "Cross-Zone Load Balancing",
            body: `Without cross-zone LB, traffic is distributed evenly per AZ — NOT per target. This causes uneven load if AZs have different target counts.`,
            example: `Without Cross-Zone LB:
  AZ-a: 2 targets → each gets 25% of total traffic (50% / 2)
  AZ-b: 8 targets → each gets 6.25% of total traffic (50% / 8)
  ❌ AZ-a targets are overloaded!

With Cross-Zone LB:
  AZ-a: 2 targets → each gets 10% of total traffic (100% / 10)
  AZ-b: 8 targets → each gets 10% of total traffic (100% / 10)
  ✅ Even distribution!

ALB: Cross-zone is ALWAYS enabled (free)
NLB: Cross-zone is OPTIONAL (per-GB data transfer charges)`,
            notes: [
              { type: "info", text: "Cross-zone LB matters most when AZs have unequal target counts. If you always maintain equal targets per AZ (via ASG), the impact is minimal." }
            ]
          }
        ]
      },
      {
        title: "ELB + EKS Architecture (Your CMC Experience)",
        body: `In EKS, the AWS Load Balancer Controller automatically provisions and manages ALBs/NLBs based on Kubernetes resources.`,
        subsections: [
          {
            title: "AWS Load Balancer Controller Setup",
            body: `The controller watches for Kubernetes Ingress and Service resources, then creates corresponding AWS load balancers.`,
            code: `# 1. Install AWS Load Balancer Controller via Helm
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \\
  -n kube-system \\
  --set clusterName=mstr-cmc-cluster \\
  --set serviceAccount.create=false \\
  --set serviceAccount.name=aws-lb-controller-sa

# 2. Kubernetes Ingress → Creates ALB
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mstr-ingress
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip        # Route to pod IPs
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:...
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/group.name: mstr-shared  # Share ALB
spec:
  rules:
  - host: cmc.example.com
    http:
      paths:
      - path: /api/*
        pathType: ImplementationSpecific
        backend:
          service:
            name: mstr-api-service
            port: { number: 8080 }
      - path: /dashboard/*
        pathType: ImplementationSpecific
        backend:
          service:
            name: mstr-web-service
            port: { number: 3000 }

# 3. Service type LoadBalancer → Creates NLB
apiVersion: v1
kind: Service
metadata:
  name: mstr-grpc
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: external
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: ip
    service.beta.kubernetes.io/aws-load-balancer-scheme: internal
spec:
  type: LoadBalancer
  selector:
    app: mstr-intelligence-server
  ports:
  - port: 50051
    targetPort: 50051
    protocol: TCP`,
            notes: [
              { type: "example", text: "In your CMC project, you used the AWS LB Controller with Istio. The ALB handled external traffic, while Istio managed internal service-to-service routing with mTLS, canary releases, and circuit breaking." },
              { type: "tip", text: "Use target-type: ip (not instance) for EKS. It routes directly to pod IPs via VPC CNI, bypassing NodePort and reducing latency." }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "vpc", title: "VPC Deep Dive", icon: "🔒", color: "#A78BFA", tags: ["Networking", "Security"],
    content: [
      {
        title: "VPC Architecture & Design",
        body: `A VPC is your isolated network in AWS. Proper VPC design is the foundation of every AWS deployment.`,
        subsections: [
          {
            title: "Production VPC Architecture",
            body: `A well-designed VPC separates public-facing resources from private resources across multiple AZs.`,
            example: `Production VPC Layout (10.0.0.0/16):

┌─────────────────────────────────────────────────────────┐
│                    VPC: 10.0.0.0/16                     │
│                                                         │
│  ┌──── AZ-a ─────────────┐  ┌──── AZ-b ─────────────┐  │
│  │                       │  │                       │  │
│  │ Public: 10.0.1.0/24   │  │ Public: 10.0.2.0/24   │  │
│  │  ├─ ALB               │  │  ├─ ALB               │  │
│  │  ├─ NAT Gateway       │  │  ├─ NAT Gateway       │  │
│  │  └─ Bastion Host      │  │  └─ (standby)         │  │
│  │                       │  │                       │  │
│  │ Private: 10.0.11.0/24 │  │ Private: 10.0.12.0/24 │  │
│  │  ├─ EKS Worker Nodes  │  │  ├─ EKS Worker Nodes  │  │
│  │  ├─ App Servers (EC2) │  │  ├─ App Servers (EC2) │  │
│  │  └─ Internal ALB      │  │  └─ Internal ALB      │  │
│  │                       │  │                       │  │
│  │ Data: 10.0.21.0/24    │  │ Data: 10.0.22.0/24    │  │
│  │  ├─ Aurora Primary     │  │  ├─ Aurora Replica    │  │
│  │  ├─ OpenSearch         │  │  ├─ OpenSearch        │  │
│  │  └─ ElastiCache        │  │  └─ ElastiCache       │  │
│  │                       │  │                       │  │
│  └───────────────────────┘  └───────────────────────┘  │
│                                                         │
│  Internet Gateway ←→ Public Subnets                     │
│  NAT Gateway      ←→ Private Subnets → Internet         │
│  No Internet      ←→ Data Subnets (isolated)            │
└─────────────────────────────────────────────────────────┘`,
            code: `# Terraform — Production VPC Module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.0"

  name = "mstr-cmc-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
  database_subnets = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]

  # NAT Gateway — one per AZ for high availability
  enable_nat_gateway     = true
  single_nat_gateway     = false  # One per AZ (HA)
  one_nat_gateway_per_az = true

  # Database subnet group
  create_database_subnet_group = true
  database_subnet_group_name   = "mstr-db-subnet"

  # DNS
  enable_dns_hostnames = true
  enable_dns_support   = true

  # VPC Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_iam_role             = true

  # Tags for EKS
  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1  # ALB in public subnets
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1  # Internal LB
  }

  tags = {
    Environment = "production"
    Project     = "MicroStrategy-CMC"
    ManagedBy   = "terraform"
  }
}`,
            notes: [
              { type: "tip", text: "Always use 3 AZs in production for maximum availability. Tag subnets for EKS — the AWS LB Controller uses these tags to discover which subnets to place load balancers in." },
              { type: "interview", text: "\"Design a VPC for a multi-tier application.\" → Draw the diagram above. Mention 3 tiers (public/private/data), NAT per AZ, no internet for data subnets, and VPC Flow Logs for security." }
            ]
          },
          {
            title: "Security Groups — Detailed Examples",
            body: `Security Groups are your primary defense. Think of them as a firewall around each resource.`,
            code: `# Terraform — Layered Security Groups
# ALB Security Group — Only allows HTTPS from internet
resource "aws_security_group" "alb" {
  name_prefix = "alb-sg-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Public internet
    description = "HTTPS from anywhere"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# App Security Group — Only allows traffic FROM ALB
resource "aws_security_group" "app" {
  name_prefix = "app-sg-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]  # ← SG reference!
    description     = "App port from ALB only"
  }
}

# Database Security Group — Only allows traffic FROM App tier
resource "aws_security_group" "db" {
  name_prefix = "db-sg-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "PostgreSQL from app tier only"
  }

  # No egress to internet — database is fully isolated
  egress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    prefix_list_ids = [aws_vpc_endpoint.s3.prefix_list_id]
    description     = "S3 via VPC endpoint for backups"
  }
}`,
            example: `Traffic Flow with SG Chaining:

Internet → [SG: alb] ALB :443
              ↓
         [SG: app] EKS Pods :8080  (only from ALB SG)
              ↓
         [SG: db] Aurora :5432     (only from App SG)

Key Insight: By referencing SG IDs instead of CIDR blocks,
security rules automatically adapt when instances change.
If you add a new app server, it inherits the app SG and
can immediately reach the database — no rule changes needed.`,
            notes: [
              { type: "info", text: "SG chaining (referencing other SGs) is the best practice for multi-tier architectures. It's dynamic — no need to update IP-based rules when instances scale." },
              { type: "warn", text: "A common mistake: opening 0.0.0.0/0 on database SGs. NEVER expose databases to the internet. Always use SG references from the app tier." }
            ]
          },
          {
            title: "VPC Endpoints — Keeping Traffic Private",
            body: `VPC Endpoints let you access AWS services without going through the internet, NAT Gateway, or VPN.`,
            code: `# Gateway Endpoint for S3 (free!)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = module.vpc.vpc_id
  service_name = "com.amazonaws.us-east-1.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = module.vpc.private_route_table_ids
}

# Interface Endpoint for ECR (pull images privately)
resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.us-east-1.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoint.id]
  private_dns_enabled = true
}

# Interface Endpoint for STS (needed for IRSA in EKS)
resource "aws_vpc_endpoint" "sts" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.us-east-1.sts"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoint.id]
  private_dns_enabled = true
}`,
            example: `Why VPC Endpoints Matter — Cost & Security:

Without VPC Endpoints:
  EKS Pod → NAT Gateway → Internet → S3
  Cost: NAT Gateway charges ($0.045/GB processed) 
  Risk: Traffic traverses public internet

With S3 Gateway Endpoint:
  EKS Pod → VPC Endpoint → S3 (stays in AWS network)
  Cost: FREE for Gateway endpoints
  Risk: None — never leaves AWS backbone

For EKS specifically, you need these endpoints:
  ✓ S3 (Gateway) — ECR image layers stored in S3
  ✓ ECR API + DKR (Interface) — Pull container images
  ✓ STS (Interface) — IRSA token exchange
  ✓ CloudWatch Logs (Interface) — Ship logs
  ✓ EC2 + EC2Messages + SSMMessages — SSM access`,
            notes: [
              { type: "tip", text: "In private EKS clusters (no internet access), VPC Endpoints are REQUIRED for pulling container images, sending logs, and IRSA authentication. Plan these during VPC design, not after." },
              { type: "example", text: "In your CMC project, you likely used VPC Endpoints for S3 (Aurora backups), ECR (container images), and CloudWatch (Fluent Bit logs) to keep all traffic within the AWS network." }
            ]
          }
        ]
      },
      {
        title: "VPC Peering vs Transit Gateway",
        body: `When connecting multiple VPCs, you need to choose between peering and Transit Gateway.`,
        subsections: [
          {
            title: "Decision Guide with Examples",
            body: ``,
            example: `VPC Peering (point-to-point):
  2-3 VPCs → Simple, free, low latency
  
  VPC-A ←→ VPC-B    (direct connection)
  VPC-A ←→ VPC-C    (separate connection)
  VPC-B ←→ VPC-C    (separate connection)
  Total: 3 peering connections for 3 VPCs

  ❌ NOT transitive: A↔B and B↔C does NOT mean A↔C
  ❌ 5+ VPCs = too many connections (n*(n-1)/2)

Transit Gateway (hub-and-spoke):
  5+ VPCs → Centralized, scalable, transitive

  VPC-A ─┐
  VPC-B ─┤
  VPC-C ─┼── Transit Gateway ──┬── VPN to on-prem
  VPC-D ─┤                     └── Direct Connect
  VPC-E ─┘
  
  ✅ Transitive: A→TGW→C works automatically
  ✅ Central routing table for network segmentation
  ✅ Cross-region peering supported
  💰 Cost: $0.05/hr per attachment + $0.02/GB`,
            code: `# Terraform — Transit Gateway
resource "aws_ec2_transit_gateway" "main" {
  description                     = "Central hub"
  auto_accept_shared_attachments  = "enable"
  default_route_table_association = "enable"
  default_route_table_propagation = "enable"
  dns_support                     = "enable"
}

resource "aws_ec2_transit_gateway_vpc_attachment" "prod" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = module.vpc_prod.vpc_id
  subnet_ids         = module.vpc_prod.private_subnets
}

resource "aws_ec2_transit_gateway_vpc_attachment" "staging" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = module.vpc_staging.vpc_id
  subnet_ids         = module.vpc_staging.private_subnets
}`,
            notes: [
              { type: "interview", text: "\"You have 10 VPCs across 3 AWS accounts. How do you connect them?\" → Transit Gateway. Central hub-and-spoke, supports transitive routing, cross-account via RAM (Resource Access Manager), route tables for network segmentation (prod can't reach dev)." }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "ec2", title: "EC2 Mastery", icon: "🖥️", color: "#10B981", tags: ["Compute", "Core"],
    content: [
      {
        title: "Instance Selection & Pricing",
        body: `Choosing the right EC2 instance type and purchasing option is crucial for performance and cost.`,
        subsections: [
          {
            title: "Instance Type Decision Tree",
            body: `How to pick the right instance family based on your workload:`,
            example: `Decision Tree for Instance Selection:

Is the workload CPU-intensive?
  ├─ YES → Compute Optimized (C6i/C7g)
  │        Examples: Batch processing, encoding, gaming, ML inference
  └─ NO → Is it memory-intensive?
          ├─ YES → Memory Optimized (R6i/R7g/X2)
          │        Examples: In-memory DB, Redis, SAP, MSTR Intelligence Server
          └─ NO → Is it storage-intensive?
                  ├─ YES → Storage Optimized (I4i/D3/H1)
                  │        Examples: Elasticsearch, HDFS, Cassandra
                  └─ NO → Is it GPU-intensive?
                          ├─ YES → Accelerated (P5/G5/Inf2)
                          │        Examples: ML training, rendering, inference
                          └─ NO → General Purpose (M6i/M7g/T3)
                                   Examples: Web servers, app servers, dev/test

ARM (Graviton) suffix 'g' = 40% better price-performance
  M7g, C7g, R7g — use for containerized workloads on EKS
  
Example for MicroStrategy:
  Intelligence Server → R6i.2xlarge (memory for OLAP cubes)
  Web Server → M6i.xlarge (balanced workload)
  Batch jobs → C6i.xlarge (CPU for report generation)
  EKS nodes → M7g.xlarge (Graviton for cost savings)`,
            notes: [
              { type: "tip", text: "Always start with Graviton ('g' suffix) for new workloads. M7g instances offer 40% better price-performance than M6i. Most containerized apps work without changes on ARM." },
              { type: "interview", text: "\"How would you choose an instance type for MicroStrategy Intelligence Server?\" → Memory Optimized (R6i) because Intelligence Server holds OLAP cubes and caches in memory. Size depends on cube sizes and concurrent users. Start with r6i.2xlarge (64GB RAM), monitor with CloudWatch, and right-size." }
            ]
          },
          {
            title: "Purchasing Strategy — Save up to 90%",
            body: `A smart purchasing strategy can dramatically reduce your AWS bill.`,
            example: `Cost Optimization Strategy for a Production EKS Cluster:

Tier 1: Reserved / Savings Plans (baseline — always running)
  ├─ 3x m7g.xlarge → Compute Savings Plan (3-year, all upfront)
  ├─ Discount: ~60% off On-Demand
  └─ For: EKS control plane nodes, always-on services

Tier 2: On-Demand (variable but critical)
  ├─ Auto Scaling Group min/max based on traffic
  ├─ For: handling traffic spikes above baseline
  └─ Scale down during off-hours (scheduled scaling)

Tier 3: Spot Instances (fault-tolerant workloads)
  ├─ Up to 90% discount
  ├─ 2-minute reclaim warning
  ├─ For: CI/CD builds (CodeBuild), batch jobs, test environments
  ├─ Use Spot Fleet with multiple instance types for availability
  └─ EKS: mix Spot + On-Demand in managed node groups

Pricing Example (m7g.xlarge, us-east-1):
  On-Demand:    $0.1632/hr = $119/month
  1yr RI:       $0.1010/hr = $73/month  (38% savings)
  3yr RI:       $0.0639/hr = $46/month  (61% savings)
  Spot:         ~$0.049/hr = $36/month  (70% savings)`,
            code: `# Terraform — EKS Managed Node Group with Spot + On-Demand mix
resource "aws_eks_node_group" "spot" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "spot-workers"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = module.vpc.private_subnets
  capacity_type   = "SPOT"
  instance_types  = ["m7g.xlarge", "m6g.xlarge", "m7g.large"]

  scaling_config {
    desired_size = 3
    min_size     = 1
    max_size     = 10
  }

  labels = { workload-type = "spot-tolerant" }
  taint {
    key    = "spot"
    value  = "true"
    effect = "NO_SCHEDULE"  # Only pods with toleration land here
  }
}

resource "aws_eks_node_group" "ondemand" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "ondemand-workers"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = module.vpc.private_subnets
  capacity_type   = "ON_DEMAND"
  instance_types  = ["m7g.xlarge"]

  scaling_config {
    desired_size = 2
    min_size     = 2
    max_size     = 5
  }

  labels = { workload-type = "critical" }
}`,
            notes: [
              { type: "example", text: "In your CMC project, you achieved 20% cost reduction. In an interview, mention: \"I used a mix of Reserved Instances for baseline EKS nodes, Spot for CI/CD builds in CodeBuild, and right-sized instances based on CloudWatch metrics analysis.\"" },
              { type: "warn", text: "Never use Spot for stateful workloads (databases) or single points of failure. Always have On-Demand fallback for critical services." }
            ]
          }
        ]
      },
      {
        title: "Auto Scaling — Scaling Strategies",
        body: `Auto Scaling Groups automatically adjust EC2 count to match demand.`,
        subsections: [
          {
            title: "Scaling Policies Explained",
            body: `There are 4 types of scaling policies. Each serves a different use case.`,
            code: `# Terraform — Auto Scaling with Target Tracking
resource "aws_autoscaling_group" "app" {
  name                = "mstr-app-asg"
  vpc_zone_identifier = module.vpc.private_subnets
  min_size            = 2
  max_size            = 10
  desired_capacity    = 3
  health_check_type   = "ELB"  # Use LB health checks, not EC2
  health_check_grace_period = 300  # 5 min for app startup

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "mstr-app"
    propagate_at_launch = true
  }
}

# Target Tracking — Maintain 60% average CPU
resource "aws_autoscaling_policy" "cpu" {
  name                   = "cpu-target-tracking"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 60.0
    disable_scale_in = false
  }
}

# Scheduled Scaling — Scale up before business hours
resource "aws_autoscaling_schedule" "morning" {
  scheduled_action_name  = "scale-up-morning"
  autoscaling_group_name = aws_autoscaling_group.app.name
  min_size               = 5
  max_size               = 15
  desired_capacity       = 8
  recurrence             = "0 8 * * MON-FRI"  # 8 AM weekdays
}

resource "aws_autoscaling_schedule" "evening" {
  scheduled_action_name  = "scale-down-evening"
  autoscaling_group_name = aws_autoscaling_group.app.name
  min_size               = 2
  max_size               = 10
  desired_capacity       = 3
  recurrence             = "0 20 * * MON-FRI"  # 8 PM weekdays
}`,
            example: `Scaling Policy Types:

1. Target Tracking (most common)
   "Keep average CPU at 60%"
   ASG adds/removes instances automatically
   Simple and effective for most workloads

2. Step Scaling (fine-grained control)
   CPU 60-70% → add 1 instance
   CPU 70-80% → add 2 instances
   CPU 80%+   → add 4 instances
   More aggressive scaling for spiky workloads

3. Scheduled Scaling
   "Scale to 10 instances at 9 AM, 3 at 9 PM"
   For predictable traffic patterns
   Combine with target tracking for best results

4. Predictive Scaling (ML-powered)
   AWS analyzes past patterns and pre-scales
   Great for cyclical traffic (daily, weekly)
   Use with target tracking as a safety net`,
            notes: [
              { type: "tip", text: "Always set health_check_type = \"ELB\" (not \"EC2\"). EC2 health checks only detect instance-level failures. ELB checks verify your application is actually responding correctly." },
              { type: "interview", text: "\"How do you handle a sudden 10x traffic spike?\" → Scheduled scaling for predictable events + target tracking for unexpected spikes + warm pools for fast launch. Pre-warm the ALB by contacting AWS support before known events." }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "eks", title: "EKS Complete Guide", icon: "☸️", color: "#3B82F6", tags: ["Containers", "Kubernetes"],
    content: [
      {
        title: "EKS Cluster Setup — Production Grade",
        body: `Setting up a production EKS cluster involves the cluster itself, node groups, networking, IRSA, and add-ons.`,
        subsections: [
          {
            title: "Full EKS Cluster with Terraform",
            body: `This is a production-ready EKS cluster configuration covering all the key components.`,
            code: `# Terraform — Production EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.8.0"

  cluster_name    = "mstr-cmc-prod"
  cluster_version = "1.29"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets

  # Private cluster endpoint (more secure)
  cluster_endpoint_public_access  = false
  cluster_endpoint_private_access = true

  # Encryption
  cluster_encryption_config = {
    provider_key_arn = aws_kms_key.eks.arn
    resources        = ["secrets"]  # Encrypt K8s secrets in etcd
  }

  # Managed Add-ons
  cluster_addons = {
    coredns    = { most_recent = true }
    kube-proxy = { most_recent = true }
    vpc-cni    = { 
      most_recent = true
      configuration_values = jsonencode({
        enableNetworkPolicy = "true"  # K8s NetworkPolicy support
      })
    }
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = module.ebs_csi_irsa.iam_role_arn
    }
  }

  # Node Groups
  eks_managed_node_groups = {
    # Critical workloads — On-Demand
    critical = {
      instance_types = ["m7g.xlarge"]
      capacity_type  = "ON_DEMAND"
      min_size       = 2
      max_size       = 6
      desired_size   = 3
      labels = { workload = "critical" }
    }

    # General workloads — Spot (cost optimized)
    general = {
      instance_types = ["m7g.xlarge", "m7g.large", "m6g.xlarge"]
      capacity_type  = "SPOT"
      min_size       = 0
      max_size       = 10
      desired_size   = 2
      labels = { workload = "general" }
      taints = [{
        key    = "spot"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }

  # IRSA — Enable OpenID Connect provider
  enable_irsa = true

  tags = {
    Environment = "production"
    Project     = "MicroStrategy-CMC"
  }
}

# IRSA for AWS Load Balancer Controller
module "lb_controller_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"

  role_name = "aws-lb-controller"
  attach_load_balancer_controller_policy = true

  oidc_providers = {
    main = {
      provider_arn = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:aws-lb-controller-sa"]
    }
  }
}`,
            notes: [
              { type: "example", text: "This mirrors what you built for the CMC project — private EKS cluster, managed node groups, IRSA for service permissions, and KMS encryption for secrets. Reference this specific setup in your interview." },
              { type: "tip", text: "Use cluster_endpoint_public_access = false for production. Access the cluster via VPN, Direct Connect, or SSM port forwarding. This prevents the API server from being exposed to the internet." }
            ]
          }
        ]
      },
      {
        title: "Kubernetes Deployments & Services — With Examples",
        body: `Understanding how to deploy and expose applications on EKS is essential.`,
        subsections: [
          {
            title: "Complete Deployment Example",
            body: `Here is a production-ready Kubernetes Deployment for a MicroStrategy service on EKS:`,
            code: `# deployment.yaml — MicroStrategy API Service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mstr-api
  namespace: microstrategy
  labels:
    app: mstr-api
    version: v2.1.0
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1    # At most 1 pod down during update
      maxSurge: 1          # At most 1 extra pod during update
  selector:
    matchLabels:
      app: mstr-api
  template:
    metadata:
      labels:
        app: mstr-api
        version: v2.1.0
      annotations:
        prometheus.io/scrape: "true"  # Prometheus auto-discovery
        prometheus.io/port: "8080"
    spec:
      serviceAccountName: mstr-api-sa  # IRSA — gets IAM role
      terminationGracePeriodSeconds: 60
      
      # Anti-affinity — spread across AZs
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values: [mstr-api]
              topologyKey: topology.kubernetes.io/zone

      # Tolerate spot instances
      tolerations:
      - key: "spot"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"

      containers:
      - name: mstr-api
        image: 123456789.dkr.ecr.us-east-1.amazonaws.com/mstr-api:v2.1.0
        ports:
        - containerPort: 8080

        # Resource management
        resources:
          requests:
            cpu: 500m      # 0.5 vCPU guaranteed
            memory: 512Mi  # 512MB guaranteed
          limits:
            cpu: 1000m     # Max 1 vCPU
            memory: 1Gi    # Max 1GB (OOMKilled if exceeded)

        # Probes — critical for zero-downtime deployments
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 10  # Wait for app startup
          periodSeconds: 5
          failureThreshold: 3     # 3 failures → remove from Service

        livenessProbe:
          httpGet:
            path: /health/alive
            port: 8080
          initialDelaySeconds: 30  # Longer — don't kill starting pods
          periodSeconds: 10
          failureThreshold: 3     # 3 failures → restart container

        startupProbe:
          httpGet:
            path: /health/started
            port: 8080
          failureThreshold: 30    # 30 * 10s = 5 min max startup
          periodSeconds: 10

        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: mstr-db-secret
              key: host
        - name: AWS_REGION
          value: "us-east-1"

---
# HPA — Auto-scale pods based on CPU
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mstr-api-hpa
  namespace: microstrategy
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mstr-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Scale when avg CPU > 70%
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60   # Wait 1 min before scaling up
      policies:
      - type: Pods
        value: 4                       # Max 4 pods at a time
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 min before scaling down
      policies:
      - type: Percent
        value: 25                      # Remove max 25% at a time
        periodSeconds: 60`,
            notes: [
              { type: "info", text: "Three probes: startupProbe (is the app started?), readinessProbe (can it handle traffic?), livenessProbe (is it still alive?). startupProbe runs first and disables the other probes until it succeeds — preventing premature kills of slow-starting apps." },
              { type: "tip", text: "Always set resource requests AND limits. Requests = guaranteed (used for scheduling). Limits = maximum (pods killed if exceeded for memory, throttled for CPU). Without requests, pods compete for resources and cause instability." },
              { type: "interview", text: "\"How do you ensure zero-downtime deployments on EKS?\" → RollingUpdate strategy + readinessProbe (new pods must pass before receiving traffic) + terminationGracePeriodSeconds (old pods finish in-flight requests) + PodDisruptionBudget (minimum available pods during updates)." }
            ]
          }
        ]
      },
      {
        title: "IRSA — IAM Roles for Service Accounts",
        body: `IRSA is the recommended way to give AWS permissions to pods on EKS.`,
        subsections: [
          {
            title: "How IRSA Works — Step by Step",
            body: `IRSA uses OIDC (OpenID Connect) to map Kubernetes ServiceAccounts to IAM Roles.`,
            example: `Without IRSA (bad):
  All pods on a node share the node's IAM role.
  If node role has S3 + DynamoDB + SQS access,
  EVERY pod can access ALL of these — violates least privilege.

With IRSA (correct):
  Pod A (s3-reader-sa)   → IAM Role: only S3 read
  Pod B (dynamo-writer-sa) → IAM Role: only DynamoDB write  
  Pod C (sqs-consumer-sa)  → IAM Role: only SQS receive

  Each pod gets temporary credentials for ONLY its role.
  Credentials rotate automatically. No long-term keys.`,
            code: `# 1. Create IAM Role with trust policy for EKS OIDC
module "s3_reader_irsa" {
  source = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"

  role_name = "mstr-s3-reader"

  role_policy_arns = {
    s3_read = aws_iam_policy.s3_read_only.arn
  }

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["microstrategy:mstr-api-sa"]
    }
  }
}

# 2. IAM Policy — least privilege
resource "aws_iam_policy" "s3_read_only" {
  name = "mstr-s3-read-only"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:ListBucket"]
      Resource = [
        "arn:aws:s3:::mstr-data-bucket",
        "arn:aws:s3:::mstr-data-bucket/*"
      ]
    }]
  })
}

# 3. Kubernetes ServiceAccount with annotation
# kubectl apply -f:
apiVersion: v1
kind: ServiceAccount
metadata:
  name: mstr-api-sa
  namespace: microstrategy
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/mstr-s3-reader

# 4. Pod uses the ServiceAccount
# spec.serviceAccountName: mstr-api-sa
# → Pod automatically gets AWS_ROLE_ARN and AWS_WEB_IDENTITY_TOKEN
# → AWS SDK auto-detects and assumes the role`,
            notes: [
              { type: "tip", text: "IRSA follows zero-trust security — every pod has exactly the permissions it needs, nothing more. This is critical for MicroStrategy deployments handling sensitive enterprise BI data." },
              { type: "example", text: "In your CMC project, you used IRSA with IAM role assumption for cross-account access. This means pods in account A could assume roles in account B to access resources — a common pattern for multi-account AWS setups." }
            ]
          }
        ]
      },
      {
        title: "Observability Stack on EKS",
        body: `Monitoring and logging are critical for production EKS clusters.`,
        subsections: [
          {
            title: "Fluent Bit + CloudWatch Setup",
            body: `Fluent Bit runs as a DaemonSet on every node, collecting and shipping container logs.`,
            code: `# Fluent Bit DaemonSet configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: amazon-cloudwatch
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Log_Level     info
        Daemon        off
        Parsers_File  parsers.conf

    [INPUT]
        Name              tail
        Tag               kube.*
        Path              /var/log/containers/*.log
        Parser            docker
        DB                /var/log/flb_kube.db
        Mem_Buf_Limit     50MB
        Skip_Long_Lines   On
        Refresh_Interval  10

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Merge_Log           On       # Parse JSON logs
        Keep_Log            Off
        K8S-Logging.Parser  On
        K8S-Logging.Exclude On
        Labels              On
        Annotations         Off

    [OUTPUT]
        Name                cloudwatch_logs
        Match               kube.*
        region              us-east-1
        log_group_name      /aws/eks/mstr-cmc-prod/containers
        log_stream_prefix   fluentbit-
        auto_create_group   true
        log_retention_days  30

# kubectl commands for troubleshooting
# Check Fluent Bit pods are running on every node:
kubectl get ds fluent-bit -n amazon-cloudwatch

# View Fluent Bit logs (is it shipping successfully?):
kubectl logs -l app=fluent-bit -n amazon-cloudwatch --tail=50

# Check pod logs directly:
kubectl logs mstr-api-abc123 -n microstrategy --tail=100

# Stream logs in real-time:
kubectl logs -f deployment/mstr-api -n microstrategy

# View events (scheduling failures, OOMKills, etc.):
kubectl get events -n microstrategy --sort-by=.lastTimestamp`,
            notes: [
              { type: "example", text: "In your CMC project, you integrated Fluent Bit for centralized logging to CloudWatch and OpenSearch. The flow: Container stdout → Fluent Bit DaemonSet → CloudWatch Logs (real-time alerts) + OpenSearch (search & analysis)." },
              { type: "interview", text: "\"How do you debug a pod that keeps crashing?\" → 1) kubectl describe pod (check Events for OOMKill, scheduling failures). 2) kubectl logs --previous (logs from the crashed container). 3) kubectl get events (cluster-level issues). 4) Check resource limits — is the pod hitting memory limits?" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "iam", title: "IAM & Security", icon: "🛡️", color: "#EF4444", tags: ["Security", "Core"],
    content: [
      {
        title: "IAM Policies — Real-World Examples",
        body: `IAM policies are JSON documents that define permissions. Understanding them is critical for every AWS role.`,
        subsections: [
          {
            title: "Policy Structure & Examples",
            body: `Every IAM policy has: Effect (Allow/Deny), Action (what API calls), Resource (which resources), and optional Condition.`,
            code: `// Example 1: Least-privilege policy for a CI/CD pipeline
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PushToECR",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "arn:aws:ecr:us-east-1:123456789:repository/mstr-*"
    },
    {
      "Sid": "UpdateEKS",
      "Effect": "Allow",
      "Action": [
        "eks:DescribeCluster",
        "eks:ListClusters"
      ],
      "Resource": "arn:aws:eks:us-east-1:123456789:cluster/mstr-cmc-*"
    },
    {
      "Sid": "DenyDeleteProduction",
      "Effect": "Deny",
      "Action": [
        "eks:DeleteCluster",
        "rds:DeleteDBCluster",
        "s3:DeleteBucket"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:ResourceTag/Environment": "production"
        }
      }
    }
  ]
}

// Example 2: Cross-account role assumption (your CMC pattern)
// Trust Policy on the role in Account B:
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::111111111:role/codebuild-role"
    },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": {
        "sts:ExternalId": "mstr-cmc-deploy"
      }
    }
  }]
}

// CodeBuild assumes the role:
// aws sts assume-role \\
//   --role-arn arn:aws:iam::222222222:role/deploy-role \\
//   --role-session-name cmc-deploy \\
//   --external-id mstr-cmc-deploy`,
            notes: [
              { type: "tip", text: "Always use Deny statements for destructive actions on production resources. Even if someone accidentally gets admin access, the explicit Deny prevents deletion of critical resources." },
              { type: "example", text: "Your CMC project used cross-account IAM role assumption — CodeBuild in Account A assumed a deploy role in Account B to deploy to the production EKS cluster. This is exactly the pattern shown above." }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "terraform", title: "Terraform Mastery", icon: "🏗️", color: "#7C3AED", tags: ["IaC", "DevOps"],
    content: [
      {
        title: "Terraform State & Backend",
        body: `State management is the most critical aspect of running Terraform in a team.`,
        subsections: [
          {
            title: "Remote State with S3 + DynamoDB Locking",
            body: `Never use local state in production. Always use remote state with locking to prevent concurrent modifications.`,
            code: `# backend.tf — S3 + DynamoDB state backend
terraform {
  backend "s3" {
    bucket         = "mstr-terraform-state"
    key            = "envs/production/eks/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "alias/terraform-state-key"
    dynamodb_table = "terraform-locks"  # Prevents concurrent runs
  }
}

# Create the backend resources (run once, manually)
resource "aws_s3_bucket" "tf_state" {
  bucket = "mstr-terraform-state"
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration { status = "Enabled" }
  # Versioning lets you recover from bad state files
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.tf_state.arn
    }
  }
}

resource "aws_dynamodb_table" "tf_locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
}`,
            example: `State File Organization — One per Environment/Component:

mstr-terraform-state/
├── envs/
│   ├── production/
│   │   ├── vpc/terraform.tfstate
│   │   ├── eks/terraform.tfstate
│   │   ├── rds/terraform.tfstate
│   │   └── monitoring/terraform.tfstate
│   ├── staging/
│   │   ├── vpc/terraform.tfstate
│   │   └── eks/terraform.tfstate
│   └── dev/
│       └── all/terraform.tfstate
└── global/
    ├── iam/terraform.tfstate
    └── dns/terraform.tfstate

Why separate state files?
  ✓ Blast radius: VPC change can't accidentally affect RDS
  ✓ Speed: smaller state = faster plan/apply
  ✓ Permissions: different teams own different state files
  ✓ Locking: VPC team and EKS team can work in parallel`,
            notes: [
              { type: "warn", text: "NEVER delete or manually edit a state file. If state gets corrupted, use terraform state pull to backup, terraform import to re-add resources, or terraform state rm to remove stale entries." },
              { type: "interview", text: "\"How do you manage Terraform state in a team?\" → Remote state in S3 with versioning and KMS encryption, DynamoDB for locking, separate state per environment/component, and state accessed via CI/CD pipeline (not individual laptops)." }
            ]
          }
        ]
      },
      {
        title: "Terraform Modules — Reusable Infrastructure",
        body: `Modules are the key to writing maintainable, reusable Terraform code.`,
        subsections: [
          {
            title: "Module Structure & Best Practices",
            body: `A well-structured module is focused on a single concern and has clear inputs/outputs.`,
            code: `# Module structure:
# modules/eks-cluster/
#   ├── main.tf        (resources)
#   ├── variables.tf   (inputs)
#   ├── outputs.tf     (return values)
#   └── versions.tf    (provider constraints)

# modules/eks-cluster/variables.tf
variable "cluster_name"    { type = string }
variable "cluster_version" { type = string; default = "1.29" }
variable "vpc_id"          { type = string }
variable "private_subnets" { type = list(string) }
variable "node_instance_types" {
  type    = list(string)
  default = ["m7g.xlarge"]
}
variable "node_min_size"     { type = number; default = 2 }
variable "node_max_size"     { type = number; default = 10 }
variable "node_desired_size" { type = number; default = 3 }
variable "environment"       { type = string }

# modules/eks-cluster/outputs.tf
output "cluster_endpoint" { value = aws_eks_cluster.main.endpoint }
output "cluster_name"     { value = aws_eks_cluster.main.name }
output "oidc_provider_arn" { value = aws_iam_openid_connect_provider.eks.arn }
output "node_group_role_arn" { value = aws_iam_role.node.arn }

# Usage in environment (envs/production/eks/main.tf):
module "eks" {
  source = "../../../modules/eks-cluster"

  cluster_name        = "mstr-cmc-prod"
  cluster_version     = "1.29"
  vpc_id              = data.terraform_remote_state.vpc.outputs.vpc_id
  private_subnets     = data.terraform_remote_state.vpc.outputs.private_subnets
  node_instance_types = ["m7g.xlarge", "m7g.large"]
  node_min_size       = 3
  node_max_size       = 15
  node_desired_size   = 5
  environment         = "production"
}

# Cross-state reference (read VPC state from EKS config):
data "terraform_remote_state" "vpc" {
  backend = "s3"
  config = {
    bucket = "mstr-terraform-state"
    key    = "envs/production/vpc/terraform.tfstate"
    region = "us-east-1"
  }
}`,
            notes: [
              { type: "example", text: "In your CMC project, you created reusable Terraform modules for EKS, Aurora RDS, and OpenSearch. The same modules were used across commercial and GovCloud regions with different variable values — demonstrating true infrastructure reusability." },
              { type: "tip", text: "Use data.terraform_remote_state to reference outputs from other state files. This creates a dependency graph between components: VPC outputs are inputs to EKS, EKS outputs are inputs to monitoring." }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "cicd", title: "CI/CD Pipelines", icon: "🔄", color: "#06B6D4", tags: ["DevOps", "Automation"],
    content: [
      {
        title: "End-to-End Pipeline Architecture",
        body: `A production CI/CD pipeline automates everything from code commit to production deployment.`,
        subsections: [
          {
            title: "Complete Pipeline with CodeBuild + EKS",
            body: `Here is the pipeline architecture you built for the CMC project:`,
            example: `Pipeline Flow:

Git Push → CodePipeline → CodeBuild (Build) → CodeBuild (Deploy)
                                ↓                      ↓
                           Build & Test          Deploy to EKS
                           Push to ECR           kubectl apply
                                                       ↓
                                               Health Check Pass?
                                              ├─ YES → Success ✅
                                              └─ NO  → Auto Rollback ↩️

Stages:
1. Source: Git webhook triggers pipeline
2. Build:  Lint → Unit tests → SAST scan → Docker build → Push to ECR
3. Deploy (staging): Apply to staging EKS → Integration tests
4. Approval: Manual gate for production
5. Deploy (prod): Apply to prod EKS → Smoke tests → Monitor
6. Rollback: CloudWatch alarm triggers auto-rollback`,
            code: `# buildspec.yml for CodeBuild
version: 0.2

env:
  variables:
    ECR_REPO: "123456789.dkr.ecr.us-east-1.amazonaws.com/mstr-api"
    EKS_CLUSTER: "mstr-cmc-prod"
  secrets-manager:
    SONAR_TOKEN: "codebuild/sonar:token"

phases:
  pre_build:
    commands:
      # Login to ECR
      - aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REPO
      # Set image tag from git commit
      - IMAGE_TAG=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)
      - echo "Building image $ECR_REPO:$IMAGE_TAG"

  build:
    commands:
      # Run tests
      - echo "Running unit tests..."
      - npm test -- --coverage
      # Security scan
      - echo "Running SAST scan..."
      - trivy fs --severity HIGH,CRITICAL .
      # Build Docker image
      - docker build -t $ECR_REPO:$IMAGE_TAG .
      - docker tag $ECR_REPO:$IMAGE_TAG $ECR_REPO:latest
      # Scan Docker image for vulnerabilities
      - trivy image --severity HIGH,CRITICAL $ECR_REPO:$IMAGE_TAG

  post_build:
    commands:
      # Push to ECR
      - docker push $ECR_REPO:$IMAGE_TAG
      - docker push $ECR_REPO:latest
      # Update kubeconfig
      - aws eks update-kubeconfig --name $EKS_CLUSTER --region us-east-1
      # Deploy to EKS (assume cross-account role if needed)
      - |
        CREDS=$(aws sts assume-role \\
          --role-arn arn:aws:iam::222222222:role/eks-deploy \\
          --role-session-name codebuild-deploy)
        export AWS_ACCESS_KEY_ID=$(echo $CREDS | jq -r .Credentials.AccessKeyId)
        export AWS_SECRET_ACCESS_KEY=$(echo $CREDS | jq -r .Credentials.SecretAccessKey)
        export AWS_SESSION_TOKEN=$(echo $CREDS | jq -r .Credentials.SessionToken)
      # Apply deployment with new image
      - kubectl set image deployment/mstr-api mstr-api=$ECR_REPO:$IMAGE_TAG -n microstrategy
      # Wait for rollout
      - kubectl rollout status deployment/mstr-api -n microstrategy --timeout=300s

artifacts:
  files:
    - '**/*'

cache:
  paths:
    - 'node_modules/**/*'
    - '/root/.docker/**/*'`,
            notes: [
              { type: "example", text: "This is the pipeline pattern you implemented at SuccessKPI. The cross-account role assumption in post_build is exactly how you deployed CMC across accounts. The trivy scans are the SAST/DAST security scanning mentioned in cloud engineer interviews." },
              { type: "interview", text: "\"Walk me through your CI/CD pipeline.\" → Use this exact flow. Emphasize: Git-triggered, automated testing (unit + security), Docker build + ECR push, cross-account deployment via role assumption, rollout status monitoring, and auto-rollback on failure. Mention the 3X reduction in pipeline failures." }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "serverless", title: "Serverless & Event-Driven", icon: "⚡", color: "#F97316", tags: ["Lambda", "GenAI"],
    content: [
      {
        title: "Lambda + Event-Driven Architecture",
        body: `Event-driven architectures decouple services and scale automatically. This is the pattern you used for DeepSense Call AI.`,
        subsections: [
          {
            title: "Your DeepSense Call AI Architecture",
            body: `Here is how the event-driven GenAI pipeline works:`,
            example: `DeepSense Call AI — Event-Driven Architecture:

Call Recording Uploaded → S3 Event Notification
    ↓
SQS Queue (buffer + retry)
    ↓
Lambda Function 1: Transcription
    ├─ Calls Amazon Transcribe
    ├─ Stores transcript in S3
    └─ Sends message to next SQS queue
        ↓
Lambda Function 2: AI Analysis
    ├─ Reads transcript from S3
    ├─ Calls Claude 3 Haiku via Bedrock
    │   ├─ Targeted questions about call quality
    │   ├─ Sentiment analysis
    │   └─ Topic mining
    ├─ Stores analysis results in DynamoDB
    └─ Sends to Kinesis Firehose
        ↓
Kinesis Firehose → S3 (data lake) + OpenSearch (search)
        ↓
Playbook Engine: Automated triggers based on call conditions
    ├─ Low satisfaction score → Alert manager
    ├─ Compliance violation → Flag for review
    └─ Coaching opportunity → Schedule session`,
            code: `# Terraform — Lambda for AI Analysis with Bedrock
resource "aws_lambda_function" "call_analyzer" {
  function_name = "deepsense-call-analyzer"
  runtime       = "python3.12"
  handler       = "handler.analyze_call"
  timeout       = 300  # 5 minutes for LLM processing
  memory_size   = 1024

  filename         = "lambda.zip"
  source_code_hash = filebase64sha256("lambda.zip")

  role = aws_iam_role.lambda_role.arn

  environment {
    variables = {
      BEDROCK_MODEL_ID  = "anthropic.claude-3-haiku-20240307-v1:0"
      RESULTS_TABLE     = aws_dynamodb_table.results.name
      FIREHOSE_STREAM   = aws_kinesis_firehose_delivery_stream.analytics.name
    }
  }

  # VPC config if needed for private resources
  vpc_config {
    subnet_ids         = module.vpc.private_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }
}

# SQS trigger for Lambda
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn                   = aws_sqs_queue.call_analysis.arn
  function_name                      = aws_lambda_function.call_analyzer.arn
  batch_size                         = 5
  maximum_batching_window_in_seconds = 30
  
  # Error handling
  bisect_batch_on_function_error = true  # Split batch on error
  maximum_retry_attempts         = 2
  
  function_response_types = ["ReportBatchItemFailures"]
}

# Dead Letter Queue for failed messages
resource "aws_sqs_queue" "dlq" {
  name = "call-analysis-dlq"
  message_retention_seconds = 1209600  # 14 days
}

resource "aws_sqs_queue" "call_analysis" {
  name                       = "call-analysis-queue"
  visibility_timeout_seconds = 360  # 6x Lambda timeout
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
}`,
            notes: [
              { type: "info", text: "Set SQS visibility timeout to at least 6x your Lambda timeout. If Lambda takes 5 minutes, set visibility to 30 minutes. Otherwise, SQS re-delivers the message while Lambda is still processing it, causing duplicate processing." },
              { type: "interview", text: "\"Tell me about your GenAI work.\" → Walk through this architecture. Emphasize: event-driven decoupling (S3→SQS→Lambda→Bedrock→Firehose), error handling (DLQ, batch splitting), scalability (Lambda auto-scales with SQS depth), and business impact (automated call analysis for 40+ enterprise clients)." }
            ]
          }
        ]
      }
    ]
  }
];

// ===== COMPONENT =====
export default function AWSDetailedGuide() {
  const [activeTopic, setActiveTopic] = useState("elb");
  const [expandedItems, setExpandedItems] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  const toggle = (key) => setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));

  const topic = allTopics.find(t => t.id === activeTopic);

  const filteredTopics = searchTerm
    ? allTopics.filter(t =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        t.content.some(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : allTopics;

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", background: "#080E1A", minHeight: "100vh", color: "#CBD5E1" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "linear-gradient(145deg, #0F172A, #1a1040)", borderBottom: "1px solid #1E293B", padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>☁️</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#F1F5F9" }}>AWS Cloud — Detailed Guide with Examples</h1>
            <p style={{ margin: 0, fontSize: 12, color: "#64748B" }}>Terraform code • Architecture patterns • kubectl commands • Interview answers</p>
          </div>
        </div>

        {/* Search */}
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search topics..."
          style={{ width: "100%", padding: "10px 16px", fontSize: 13, fontFamily: "inherit", background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, color: "#E2E8F0", outline: "none", marginTop: 16, boxSizing: "border-box" }} />

        {/* Topic Pills */}
        <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
          {(searchTerm ? filteredTopics : allTopics).map(t => (
            <button key={t.id} onClick={() => { setActiveTopic(t.id); setSearchTerm(""); }}
              style={{
                padding: "7px 14px", border: activeTopic === t.id ? `2px solid ${t.color}` : "1px solid #1E3A5F",
                borderRadius: 20, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                background: activeTopic === t.id ? t.color + "18" : "#111827",
                color: activeTopic === t.id ? t.color : "#94A3B8", transition: "all 0.2s"
              }}>
              {t.icon} {t.title}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {topic && (
        <div style={{ padding: "20px 28px", maxWidth: 960, margin: "0 auto" }}>
          {/* Topic Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 30 }}>{topic.icon}</span>
            <h2 style={{ margin: 0, fontSize: 24, color: topic.color, fontWeight: 700 }}>{topic.title}</h2>
          </div>
          <div style={{ marginBottom: 24 }}>{topic.tags.map(t => <Tag key={t} text={t} color={topic.color} />)}</div>

          {/* Sections */}
          {topic.content.map((section, si) => (
            <div key={si} style={{ marginBottom: 24, background: "#0F172A", borderRadius: 12, border: "1px solid #1E293B", overflow: "hidden" }}>
              <button onClick={() => toggle(`${topic.id}-${si}`)} style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "16px 20px", border: "none", background: expandedItems[`${topic.id}-${si}`] !== false ? topic.color + "10" : "transparent",
                cursor: "pointer", color: "#F1F5F9", fontFamily: "inherit", fontSize: 16, fontWeight: 700, textAlign: "left"
              }}>
                {section.title}
                <span style={{ color: "#475569", fontSize: 12, transform: expandedItems[`${topic.id}-${si}`] !== false ? "rotate(180deg)" : "none", transition: "0.2s" }}>▼</span>
              </button>

              {expandedItems[`${topic.id}-${si}`] !== false && (
                <div style={{ padding: "0 20px 20px" }}>
                  {section.body && <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.7 }}>{section.body}</p>}

                  {section.subsections && section.subsections.map((sub, subi) => {
                    const subKey = `${topic.id}-${si}-${subi}`;
                    const isOpen = expandedItems[subKey] !== false;
                    return (
                      <div key={subi} style={{ marginBottom: 12, border: "1px solid #1a2540", borderRadius: 10, overflow: "hidden" }}>
                        <button onClick={() => toggle(subKey)} style={{
                          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "12px 16px", border: "none", background: isOpen ? "#111827" : "#0d1525",
                          cursor: "pointer", color: topic.color, fontFamily: "inherit", fontSize: 14, fontWeight: 600, textAlign: "left"
                        }}>
                          {sub.title}
                          <span style={{ color: "#475569", fontSize: 11, transform: isOpen ? "rotate(180deg)" : "none", transition: "0.2s" }}>▼</span>
                        </button>

                        {isOpen && (
                          <div style={{ padding: "12px 16px", background: "#0d1525" }}>
                            {sub.body && <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.7 }}>{sub.body}</p>}
                            {sub.example && <Code>{sub.example}</Code>}
                            {sub.code && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Code Example</div>
                                <Code>{sub.code}</Code>
                              </div>
                            )}
                            {sub.notes && sub.notes.map((n, ni) => <Note key={ni} type={n.type}>{n.text}</Note>)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: "center", padding: "24px", borderTop: "1px solid #1E293B", color: "#334155", fontSize: 12 }}>
        Gaurav Sakariya — Cloud Engineer Interview Prep — MicroStrategy / Strategy One — March 17, 2026
      </div>
    </div>
  );
}
