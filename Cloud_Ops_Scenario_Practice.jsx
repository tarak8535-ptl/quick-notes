import { useState } from "react";

// ===== COMPONENTS =====
const StepBlock = ({ num, title, content, color }) => (
  <div style={{ display: "flex", gap: 10, margin: "8px 0" }}>
    <div style={{ width: 26, height: 26, borderRadius: 7, background: color + "20", color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 2 }}>{num}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 12, lineHeight: 1.7, color: "#94A3B8" }}>{content}</div>
    </div>
  </div>
);

const CmdBlock = ({ children }) => (
  <pre style={{ background: "#060B18", border: "1px solid #1a2744", borderRadius: 7, padding: "10px 14px", fontSize: 11.5, lineHeight: 1.65, fontFamily: "'JetBrains Mono', monospace", color: "#7DD3FC", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "8px 0" }}>{children}</pre>
);

const Tag = ({ text, color }) => (
  <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: color + "20", color, marginRight: 4, marginBottom: 3 }}>{text}</span>
);

// ===== ALL SCENARIOS =====
const categories = [
  {
    id: "incident", name: "Incident Management", icon: "🚨", color: "#EF4444",
    desc: "Production is down. Alarms are firing. Customers are affected. What do you do?",
    scenarios: [
      {
        id: 1, severity: "P1", title: "Website returning 502 Bad Gateway to all users",
        tags: ["ALB", "EKS", "High Availability"],
        alert: "CloudWatch Alarm: ALB 5XX count > 100 in 5 minutes. Customer support receiving flood of complaints. Revenue dashboard shows orders dropping to zero.",
        triage: [
          { title: "Acknowledge & Communicate", content: "Post in #incident-channel: 'P1 — Website 502 for all users, investigating.' Assign Incident Commander. Start timer for SLA tracking." },
          { title: "Check ALB Target Health", content: "AWS Console → EC2 → Target Groups → check health status. If ALL targets are unhealthy, the problem is the application or EKS, not the ALB." },
          { title: "Check EKS Pod Status", content: "kubectl get pods -n production — are pods in CrashLoopBackOff, Pending, or ImagePullBackOff? kubectl describe pod <name> for events. kubectl logs <pod> --previous for crash logs." },
          { title: "Check Recent Deployments", content: "Was there a deployment in the last 30 minutes? kubectl rollout history deployment/web-app. If yes → immediate rollback: kubectl rollout undo deployment/web-app." },
        ],
        commands: `# Quick diagnostic sequence:
# 1. ALB target health
aws elbv2 describe-target-health \\
  --target-group-arn arn:aws:elasticloadbalancing:...:targetgroup/...

# 2. Pod status
kubectl get pods -n production -o wide
kubectl get events -n production --sort-by=.lastTimestamp | tail -20

# 3. Pod logs (current + previous crash)
kubectl logs deployment/web-app -n production --tail=100
kubectl logs deployment/web-app -n production --previous --tail=50

# 4. Rollback if recent deployment
kubectl rollout undo deployment/web-app -n production
kubectl rollout status deployment/web-app -n production

# 5. Check node resources
kubectl top nodes
kubectl top pods -n production --sort-by=memory`,
        rootCauses: [
          "Bad deployment — new image has a fatal error, pods crash on startup",
          "Resource exhaustion — nodes ran out of memory, OOMKilled pods",
          "Dependency failure — database or external API is down",
          "Certificate expired — ALB can't terminate TLS",
          "Config change — bad ConfigMap/Secret update broke app startup"
        ],
        prevention: [
          "Readiness probes: pods must pass health check before receiving traffic",
          "Rolling deployment with maxUnavailable=0: never remove old pods until new ones are ready",
          "Canary deployments: route 5% traffic to new version first, monitor before full rollout",
          "Pre-deployment smoke tests in CI/CD pipeline",
          "PodDisruptionBudget: maintain minimum healthy pods during any change"
        ]
      },
      {
        id: 2, severity: "P1", title: "Database connection pool exhausted — all API requests timing out",
        tags: ["RDS/Aurora", "Connection Pool", "Cascading Failure"],
        alert: "CloudWatch: RDS DatabaseConnections at max (100% of max_connections). Application logs: 'ConnectionTimeoutError: unable to acquire connection from pool within 30000ms'. API response times spiked from 200ms to 30s, then timing out.",
        triage: [
          { title: "Confirm the Bottleneck", content: "CloudWatch → RDS metrics → DatabaseConnections, CPUUtilization, FreeableMemory. Is connections at max? Is CPU high? Check RDS Performance Insights for top SQL queries consuming connections." },
          { title: "Identify Connection Leaks", content: "Run: SELECT * FROM pg_stat_activity WHERE state != 'idle' ORDER BY query_start; Look for long-running queries or transactions that haven't been committed/rolled back. These hold connections." },
          { title: "Emergency Mitigation", content: "Kill long-running idle connections: SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND query_start < NOW() - INTERVAL '5 minutes'; This frees connections immediately." },
          { title: "Scale if Needed", content: "If legitimate traffic increase: scale up RDS instance class (more max_connections), or add Aurora read replicas for read traffic. Long-term: implement RDS Proxy for connection pooling." },
        ],
        commands: `# Check RDS connection count
aws cloudwatch get-metric-statistics \\
  --namespace AWS/RDS \\
  --metric-name DatabaseConnections \\
  --dimensions Name=DBInstanceIdentifier,Value=prod-db \\
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \\
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \\
  --period 60 --statistics Maximum

# Connect to DB and check active connections
psql -h prod-db.cluster-xxx.us-east-1.rds.amazonaws.com -U admin -d mydb

-- Active connections by state
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;

-- Long-running queries (potential leak)
SELECT pid, now() - query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC LIMIT 20;

-- Kill idle-in-transaction connections (emergency)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
AND query_start < NOW() - INTERVAL '5 minutes';

-- Check max_connections setting
SHOW max_connections;`,
        rootCauses: [
          "Connection leak — app opens connections but doesn't close them (missing finally/close in code)",
          "Long-running transactions — batch job holds connections for minutes",
          "Sudden traffic spike — more app instances than DB connections available",
          "Missing connection pooling — each Lambda/pod creates its own connections",
          "Deadlocks — queries waiting on each other, holding connections indefinitely"
        ],
        prevention: [
          "RDS Proxy: managed connection pooling — reuses connections across Lambda/pods, handles pool exhaustion gracefully",
          "Application-level connection pool with proper maxPoolSize, idleTimeout, and connectionTimeout settings",
          "CloudWatch alarm on DatabaseConnections > 80% of max → alert before exhaustion",
          "Separate read traffic to read replicas using Aurora reader endpoint",
          "Query timeout settings to prevent long-running queries from holding connections"
        ]
      },
      {
        id: 3, severity: "P2", title: "Intermittent 504 Gateway Timeouts — 10% of requests failing",
        tags: ["ALB", "Lambda/EKS", "Timeout Chain"],
        alert: "CloudWatch: ALB TargetResponseTime P99 spiked to 62s (normally 500ms). 10% of requests returning 504. Not all users affected — seems random.",
        triage: [
          { title: "Understand the Timeout Chain", content: "504 means ALB timed out waiting for the backend to respond. ALB default idle timeout = 60s. Check if the backend is actually processing (slow) or if it's unreachable. ALB access logs show the exact timing." },
          { title: "Check ALB Access Logs", content: "S3 → ALB logs. Look for entries with target_processing_time > 60 and elb_status_code = 504. Group by target_ip to see if specific pods/instances are slow." },
          { title: "Identify Slow Endpoints", content: "CloudWatch Log Insights on application logs: filter by response_time > 5000. Which API endpoints are slow? Is it a specific endpoint hitting a slow dependency?" },
          { title: "Check Downstream Dependencies", content: "Is the database slow? Is an external API timing out? Check RDS Performance Insights, external API health. If a downstream service is slow, implement circuit breaker pattern." },
        ],
        commands: `# ALB Access Log analysis (in Athena or locally)
# Find slow targets
SELECT target_ip, count(*) as timeout_count,
  avg(target_processing_time) as avg_time
FROM alb_logs
WHERE elb_status_code = 504
  AND time > '2026-03-16T00:00:00'
GROUP BY target_ip
ORDER BY timeout_count DESC;

# Application log analysis (CloudWatch Log Insights)
fields @timestamp, @message, endpoint, response_time
| filter response_time > 5000
| stats count() as slow_count, avg(response_time) as avg_time
  by endpoint
| sort slow_count desc
| limit 20

# Check if specific pods are slow
kubectl top pods -n production --sort-by=cpu
kubectl top pods -n production --sort-by=memory

# Check if it's DNS resolution (common hidden cause)
kubectl exec -it <pod> -- nslookup db.example.com
kubectl exec -it <pod> -- curl -w "\\nDNS: %{time_namelookup}\\nConnect: %{time_connect}\\nTTFB: %{time_starttransfer}\\nTotal: %{time_total}\\n" -o /dev/null -s https://api.dependency.com/health`,
        rootCauses: [
          "Specific pods are overloaded — uneven load balancing due to sticky sessions or resource limits",
          "Downstream dependency (DB, external API) is intermittently slow",
          "DNS resolution timeouts in VPC — CoreDNS overloaded or ndots:5 causing excessive lookups",
          "Timeout chain mismatch — ALB timeout (60s) < app timeout (90s), so ALB drops the connection before app responds",
          "Garbage collection pauses in Java applications causing periodic unresponsiveness"
        ],
        prevention: [
          "Align timeout chain: Client (65s) > ALB (60s) > App (55s) > DB query (30s). Each layer should timeout before the layer above it.",
          "Circuit breaker pattern (Istio/Envoy): if dependency fails 5 times in 10s, stop calling it for 30s instead of timing out every request",
          "Request tracing with X-Ray to identify exactly where time is spent",
          "Set resource requests/limits on pods to prevent noisy neighbor problems",
          "Optimize DNS: use headless services, reduce ndots, cache DNS responses"
        ]
      },
      {
        id: 4, severity: "P1", title: "EKS cluster nodes not scaling — pods stuck in Pending state",
        tags: ["EKS", "Cluster Autoscaler", "Capacity"],
        alert: "Multiple pods in Pending state for 10+ minutes. kubectl describe shows: 'FailedScheduling: 0/5 nodes are available: 5 Insufficient cpu, 3 Insufficient memory.' HPA has scaled pods to 25 but nodes haven't increased.",
        triage: [
          { title: "Check Cluster Autoscaler Logs", content: "kubectl logs -l app=cluster-autoscaler -n kube-system --tail=100. Look for: 'scale up not possible' errors, 'could not find ASG' messages, or IAM permission errors." },
          { title: "Check ASG Limits", content: "AWS Console → EC2 → Auto Scaling Groups. Is the ASG at MaxSize? If max=5 and current=5, autoscaler can't add more. Increase MaxSize." },
          { title: "Check Instance Availability", content: "If using Spot instances, the specific instance type might not be available. Check: 'Could not launch Spot instance: InsufficientInstanceCapacity'. Add more instance types to the node group." },
          { title: "Emergency Manual Scale", content: "aws autoscaling set-desired-capacity --auto-scaling-group-name <asg> --desired-capacity 10. Or: kubectl scale deployment <name> --replicas=<lower> to reduce demand temporarily." },
        ],
        commands: `# Check pending pods
kubectl get pods -n production --field-selector=status.phase=Pending

# Why are pods pending?
kubectl describe pod <pending-pod> -n production | grep -A 5 Events

# Cluster Autoscaler logs
kubectl logs -l app=cluster-autoscaler -n kube-system --tail=200 | grep -E "(scale_up|error|cannot)"

# Check ASG status
aws autoscaling describe-auto-scaling-groups \\
  --auto-scaling-group-names eks-node-group-prod \\
  --query 'AutoScalingGroups[0].{Min:MinSize,Max:MaxSize,Desired:DesiredCapacity,Current:Instances|length(@)}'

# Check node resources (are existing nodes full?)
kubectl describe nodes | grep -A 5 "Allocated resources"

# Increase ASG max (emergency)
aws autoscaling update-auto-scaling-group \\
  --auto-scaling-group-name eks-node-group-prod \\
  --max-size 20

# If Spot capacity issue — check with:
aws ec2 describe-spot-instance-requests \\
  --filters Name=state,Values=open \\
  --query 'SpotInstanceRequests[].Status.Message'`,
        rootCauses: [
          "ASG MaxSize reached — autoscaler can't add nodes beyond the limit",
          "IAM permissions — Cluster Autoscaler role missing autoscaling:SetDesiredCapacity permission",
          "Spot instance capacity — specific instance type unavailable in the AZ",
          "Resource fragmentation — nodes have CPU but not memory (or vice versa), pods need both",
          "Subnet IP exhaustion — subnet CIDR is full, no IPs for new nodes",
          "Autoscaler misconfiguration — wrong ASG tags, node group not discovered"
        ],
        prevention: [
          "Set ASG MaxSize to 3-5x normal capacity to handle spikes",
          "Use Karpenter instead of Cluster Autoscaler — faster scaling, better instance selection, no ASG dependency",
          "Multiple instance types in Spot node groups for availability: ['m7g.xlarge', 'm6g.xlarge', 'c7g.xlarge', 'r7g.large']",
          "Monitor subnet IP utilization — alarm when available IPs < 20%",
          "Use /20 subnets (4091 IPs) instead of /24 (251 IPs) for EKS nodes"
        ]
      }
    ]
  },
  {
    id: "debug", name: "Debugging & Troubleshooting", icon: "🔍", color: "#F59E0B",
    desc: "Something is broken but not completely down. Time to investigate, find the root cause, and fix it.",
    scenarios: [
      {
        id: 5, severity: "P3", title: "Pod in CrashLoopBackOff — restarting every 30 seconds",
        tags: ["EKS", "Pods", "Application Error"],
        alert: "kubectl get pods shows: web-app-7b9c4d-x2k9f 0/1 CrashLoopBackOff 15 (5m42s). Application was working fine until the latest deployment 10 minutes ago.",
        triage: [
          { title: "Check Pod Events & Logs", content: "kubectl describe pod <name> — check Events section for OOMKilled, ImagePullBackOff, or scheduling failures. kubectl logs <name> --previous — get logs from the crashed container (--previous is critical since the current container has no logs yet)." },
          { title: "Identify the Crash Reason", content: "OOMKilled → container exceeded memory limit → increase limits or fix memory leak. Error in logs → application bug → check recent code changes. ImagePullBackOff → wrong image tag or ECR permissions → check image URI and IAM." },
          { title: "Check What Changed", content: "kubectl rollout history deployment/web-app — what changed? Compare current vs previous: image tag, env vars, ConfigMaps, Secrets. diff the deployment YAML." },
          { title: "Fix or Rollback", content: "If code bug: kubectl rollout undo deployment/web-app. If config issue: fix the ConfigMap/Secret and restart. If resource issue: kubectl edit deployment → increase memory limits." },
        ],
        commands: `# Diagnostic sequence for CrashLoopBackOff:

# 1. Get pod status details
kubectl get pod web-app-7b9c4d-x2k9f -n production -o yaml | grep -A 20 "containerStatuses"

# 2. Check events (OOMKilled, scheduling, etc.)
kubectl describe pod web-app-7b9c4d-x2k9f -n production | tail -30

# 3. Logs from the CRASHED container (--previous is key!)
kubectl logs web-app-7b9c4d-x2k9f -n production --previous --tail=100

# 4. If OOMKilled — check actual memory usage
kubectl top pod web-app-7b9c4d-x2k9f -n production
# Compare with the memory limit in deployment spec

# 5. Check if ConfigMap/Secret changed
kubectl get configmap app-config -n production -o yaml
kubectl get secret app-secret -n production -o yaml

# 6. Compare deployment revisions
kubectl rollout history deployment/web-app -n production
kubectl rollout history deployment/web-app -n production --revision=3
kubectl rollout history deployment/web-app -n production --revision=2

# 7. Rollback
kubectl rollout undo deployment/web-app -n production
# Verify:
kubectl rollout status deployment/web-app -n production

# 8. If you need to debug interactively:
kubectl run debug --image=busybox -it --rm -- sh
# Or attach to a running container:
kubectl exec -it <healthy-pod> -n production -- sh`,
        rootCauses: [
          "OOMKilled — container used more memory than its limit (exit code 137)",
          "Application error — unhandled exception on startup (check logs for stack trace)",
          "Missing environment variable — app expects DB_HOST but it's not set",
          "Wrong image tag — :latest pulled a broken image, or tag doesn't exist",
          "Liveness probe too aggressive — kills pod before it finishes starting (use startupProbe)",
          "ConfigMap/Secret deleted or changed — app can't read required config"
        ],
        prevention: [
          "Always use specific image tags (v1.2.3), never :latest in production",
          "startupProbe for slow-starting apps: failureThreshold: 30, periodSeconds: 10 (5 min max startup)",
          "Resource limits based on load testing: requests = average usage, limits = peak + 20% buffer",
          "Helm values diff in PR — reviewer can see what config changed before deployment",
          "Init containers to verify dependencies are ready before app starts"
        ]
      },
      {
        id: 6, severity: "P2", title: "Lambda function throttled — SQS messages piling up in queue",
        tags: ["Lambda", "SQS", "Concurrency"],
        alert: "CloudWatch: Lambda Throttles metric spiking. SQS ApproximateNumberOfMessagesVisible growing rapidly (10K → 50K in 30 min). Lambda ConcurrentExecutions at 1000 (account limit).",
        triage: [
          { title: "Confirm Throttling", content: "CloudWatch → Lambda → Throttles metric. Check ConcurrentExecutions — is it at the account limit (default 1000)? Check if reserved concurrency is set on the function." },
          { title: "Understand the Backpressure", content: "SQS queue depth growing = Lambda can't process fast enough. Messages aren't lost (SQS retains for up to 14 days) but processing is delayed. Check DLQ for failed messages." },
          { title: "Immediate Mitigation", content: "Request concurrency increase via AWS Support (takes hours). OR reduce batch size to process fewer messages per invocation. OR add reserved concurrency to critical functions." },
          { title: "Long-term Fix", content: "Optimize Lambda execution time (faster processing = more throughput per concurrent execution). Consider moving to Fargate/ECS for sustained high-throughput processing." },
        ],
        commands: `# Check Lambda throttling
aws lambda get-function-concurrency --function-name process-orders
aws cloudwatch get-metric-statistics \\
  --namespace AWS/Lambda \\
  --metric-name Throttles \\
  --dimensions Name=FunctionName,Value=process-orders \\
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \\
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \\
  --period 60 --statistics Sum

# Check account-level concurrency
aws lambda get-account-settings
# Look for: ConcurrentExecutions, UnreservedConcurrentExecutions

# Check SQS queue depth
aws sqs get-queue-attributes \\
  --queue-url https://sqs.us-east-1.amazonaws.com/123/orders \\
  --attribute-names ApproximateNumberOfMessagesVisible,ApproximateNumberOfMessagesNotVisible

# Check DLQ for failed messages
aws sqs get-queue-attributes \\
  --queue-url https://sqs.us-east-1.amazonaws.com/123/orders-dlq \\
  --attribute-names ApproximateNumberOfMessagesVisible

# Set reserved concurrency for critical function
aws lambda put-function-concurrency \\
  --function-name process-orders \\
  --reserved-concurrent-executions 200

# Request limit increase
aws service-quotas request-service-quota-increase \\
  --service-code lambda \\
  --quota-code L-B99A9384 \\
  --desired-value 3000`,
        rootCauses: [
          "Traffic spike — sudden burst of messages exceeds Lambda concurrency limit",
          "Slow Lambda — each execution takes 30s instead of 2s, holding concurrency slots",
          "Noisy neighbor — another Lambda function in the same account consuming all concurrency",
          "Misconfigured batch size — batch_size=1 means one message per Lambda invocation (inefficient)",
          "Downstream bottleneck — Lambda calls a slow API/DB, holding connections"
        ],
        prevention: [
          "Reserved concurrency on critical functions: guarantees capacity even when account is busy",
          "Optimize Lambda: reduce execution time, increase memory (more CPU), use connection reuse",
          "SQS batch processing: batch_size=10 with ReportBatchItemFailures — 10x more throughput",
          "CloudWatch alarm on ConcurrentExecutions > 800 (80% of limit) — early warning",
          "For sustained high throughput (>1000 msg/s): consider Fargate/ECS instead of Lambda"
        ]
      },
      {
        id: 7, severity: "P3", title: "Terraform apply failed mid-way — state is inconsistent",
        tags: ["Terraform", "IaC", "State"],
        alert: "CI/CD pipeline shows: 'Error applying plan: 3 of 8 resources created. State may be inconsistent.' Terraform state shows partially created infrastructure. Team is afraid to run apply again.",
        triage: [
          { title: "Don't Panic — Assess State", content: "terraform state list — see what was actually created. terraform plan — see what Terraform thinks needs to happen. The state file tracks what exists. Terraform will try to create the remaining resources and skip the ones that exist." },
          { title: "Understand the Failure", content: "Read the error message carefully. Common causes: IAM permission missing, resource limit reached, dependency not ready, invalid parameter. Fix the root cause first." },
          { title: "Fix and Re-apply", content: "Fix the error (e.g., add IAM permission), then run terraform plan to verify. If plan looks correct, run terraform apply. Terraform will reconcile — create missing resources, skip existing ones." },
          { title: "If State is Truly Broken", content: "terraform state rm <resource> to remove orphaned entries. terraform import <resource> <id> to import manually created resources. terraform refresh to sync state with reality. Last resort: terraform state pull > backup.json before any surgery." },
        ],
        commands: `# 1. BACKUP STATE FIRST (always!)
terraform state pull > state-backup-$(date +%Y%m%d-%H%M%S).json

# 2. See what Terraform knows about
terraform state list

# 3. See what Terraform wants to do
terraform plan
# Carefully read: will it create, update, or destroy?

# 4. If a resource exists in AWS but not in state:
terraform import aws_instance.web i-1234567890abcdef0

# 5. If a resource is in state but doesn't exist in AWS:
terraform state rm aws_instance.web

# 6. If state is locked (previous run didn't unlock):
terraform force-unlock <LOCK_ID>
# Get LOCK_ID from the error message

# 7. Refresh state to match reality:
terraform refresh
# Caution: this can REMOVE resources from state if they
# were manually deleted — always backup first!

# 8. Targeted apply (fix one resource at a time):
terraform apply -target=aws_security_group.web
terraform apply -target=aws_instance.web

# 9. If all else fails — recreate from scratch:
# Move broken resources out of state, let Terraform recreate
terraform state rm aws_eks_cluster.broken
terraform apply  # Will create a new cluster`,
        rootCauses: [
          "IAM permissions — Terraform role missing permission for a specific resource type",
          "API rate limiting — too many API calls, AWS throttled the request",
          "Resource dependency — resource B depends on A, but A wasn't ready yet",
          "Invalid parameter — wrong AMI ID, unavailable instance type, full subnet",
          "State locking — previous run crashed without releasing the DynamoDB lock",
          "Provider version mismatch — newer provider changed resource behavior"
        ],
        prevention: [
          "Always run terraform plan in CI/CD and require human approval before apply",
          "Pin provider versions: required_providers { aws = { version = \"~> 5.30\" } }",
          "Small, focused state files — blast radius is limited if one fails",
          "Separate terraform apply per component: VPC first, then EKS, then app",
          "State backup before every apply: terraform state pull > backup.json",
          "Use -parallelism=5 to reduce API rate limiting"
        ]
      },
      {
        id: 8, severity: "P2", title: "Container images failing to pull from ECR — ImagePullBackOff",
        tags: ["ECR", "EKS", "IAM", "Networking"],
        alert: "New deployment stuck. All new pods showing ImagePullBackOff. Existing pods running fine (they already have the image cached). kubectl describe pod shows: 'Failed to pull image: 403 Forbidden' or 'connection timed out'.",
        triage: [
          { title: "Identify the Error Type", content: "kubectl describe pod <name> — check the Events section. '403 Forbidden' = authentication/authorization issue. 'connection timed out' = networking issue. 'manifest unknown' = wrong image tag." },
          { title: "If 403 Forbidden", content: "Check: 1) ECR login token expired (tokens expire every 12 hours). 2) Node IAM role missing ecr:GetDownloadUrlForLayer permission. 3) ECR repository policy denies the account/role. 4) If cross-account: ECR resource policy must allow the pulling account." },
          { title: "If Connection Timeout", content: "Check: 1) VPC Endpoints for ECR (ecr.api and ecr.dkr) — needed if nodes are in private subnets without NAT. 2) NAT Gateway is healthy and route table is correct. 3) Security Group allows outbound HTTPS (443) to ECR endpoints." },
          { title: "Quick Fix", content: "For auth: kubectl create secret docker-registry ecr-cred or refresh node IAM role. For networking: verify VPC endpoints exist and Security Groups allow traffic." },
        ],
        commands: `# Check pod events
kubectl describe pod <pod-name> -n production | grep -A 10 Events

# Verify ECR image exists
aws ecr describe-images \\
  --repository-name web-app \\
  --image-ids imageTag=v1.2.3

# Check if nodes can reach ECR (exec into a node or pod)
kubectl run test --image=amazonlinux:2 -it --rm -- \\
  curl -s https://123456789.dkr.ecr.us-east-1.amazonaws.com/v2/

# Check node IAM role has ECR permissions
aws iam list-attached-role-policies \\
  --role-name eks-node-role-prod
# Should include AmazonEC2ContainerRegistryReadOnly

# Check VPC endpoints (needed for private subnets)
aws ec2 describe-vpc-endpoints \\
  --filters Name=service-name,Values=com.amazonaws.us-east-1.ecr.dkr \\
  --query 'VpcEndpoints[].{ID:VpcEndpointId,State:State}'

# Check Security Group on VPC endpoint
aws ec2 describe-vpc-endpoints \\
  --vpc-endpoint-ids vpce-xxx \\
  --query 'VpcEndpoints[].Groups'
# Must allow inbound 443 from node Security Group

# Manual ECR login test from a pod
kubectl run ecr-test --image=amazon/aws-cli -it --rm -- \\
  ecr get-login-password --region us-east-1`,
        rootCauses: [
          "Node IAM role missing ECR pull permissions (AmazonEC2ContainerRegistryReadOnly)",
          "Missing VPC Endpoints for ECR in private subnets (ecr.api, ecr.dkr, s3 gateway)",
          "ECR repository policy blocks the account/role",
          "Wrong image URI (account ID, region, or tag typo)",
          "NAT Gateway failed or route table misconfigured — nodes can't reach ECR",
          "Security Group blocks outbound 443 to ECR endpoints"
        ],
        prevention: [
          "Always create ECR VPC Endpoints when using private EKS clusters",
          "Use terraform to manage ECR repository policies — don't modify manually",
          "Validate image URI in CI/CD pipeline before deploying (aws ecr describe-images)",
          "Use immutable tags: tag images with git commit SHA, never :latest",
          "Pre-pull critical images to nodes using DaemonSet (reduces cold start pull time)"
        ]
      }
    ]
  },
  {
    id: "security", name: "Security Incidents", icon: "🔐", color: "#A78BFA",
    desc: "Unauthorized access, data exposure, or suspicious activity detected. Respond fast and contain the blast radius.",
    scenarios: [
      {
        id: 9, severity: "P1", title: "AWS access keys leaked in public GitHub repository",
        tags: ["IAM", "Credential Leak", "Emergency"],
        alert: "AWS sends 'Your AWS Access Key is Exposed' email. Or: GuardDuty finding: 'UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration' — someone is using the leaked keys from an unknown IP.",
        triage: [
          { title: "IMMEDIATELY Deactivate the Keys", content: "Do not wait. Deactivate the access key NOW. If you can't identify the user immediately, deactivate ALL suspicious keys. Time is critical — automated bots scan GitHub for keys and exploit them within minutes." },
          { title: "Assess the Blast Radius", content: "What permissions did the compromised user/role have? Check IAM policies attached. If it had admin access, assume ALL resources are potentially compromised. Check CloudTrail for what the attacker did." },
          { title: "Investigate Attacker Activity", content: "CloudTrail → filter by AccessKeyId. Look for: new IAM users/roles created, EC2 instances launched (crypto mining), S3 data accessed/exfiltrated, Lambda functions created, security group changes." },
          { title: "Contain and Clean Up", content: "Delete any resources the attacker created (EC2, IAM users, Lambda). Rotate ALL credentials that the compromised key could access (DB passwords, API keys). Enable MFA on all IAM users. Apply SCP to prevent further unauthorized actions." },
        ],
        commands: `# 1. IMMEDIATELY deactivate the key
aws iam update-access-key \\
  --access-key-id AKIAIOSFODNN7EXAMPLE \\
  --status Inactive \\
  --user-name compromised-user

# 2. Delete the key entirely
aws iam delete-access-key \\
  --access-key-id AKIAIOSFODNN7EXAMPLE \\
  --user-name compromised-user

# 3. Check what the attacker did (CloudTrail)
aws cloudtrail lookup-events \\
  --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIAIOSFODNN7EXAMPLE \\
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \\
  --max-results 50

# 4. Look for unauthorized EC2 instances (crypto mining)
aws ec2 describe-instances \\
  --filters Name=instance-state-name,Values=running \\
  --query 'Reservations[].Instances[].{ID:InstanceId,Type:InstanceType,Launch:LaunchTime,Key:KeyName}'
# Look for: unfamiliar instances, GPU types (p3, g4), launched recently

# 5. Check for new IAM users/roles
aws iam list-users --query 'Users[?CreateDate>=\`2026-03-16\`]'
aws iam list-roles --query 'Roles[?CreateDate>=\`2026-03-16\`]'

# 6. Check for new Lambda functions
aws lambda list-functions \\
  --query 'Functions[?LastModified>=\`2026-03-16\`].{Name:FunctionName,Modified:LastModified}'

# 7. Revoke all active sessions for the compromised user
aws iam put-user-policy --user-name compromised-user \\
  --policy-name DenyAll --policy-document '{
    "Version":"2012-10-17",
    "Statement":[{"Effect":"Deny","Action":"*","Resource":"*"}]
  }'`,
        rootCauses: [
          "Developer accidentally committed .env or credentials file to public repo",
          "Hardcoded access keys in application code instead of using IAM roles",
          "CI/CD pipeline logs exposed access keys in build output",
          "Shared credentials file included in Docker image"
        ],
        prevention: [
          "NEVER use long-term access keys — use IAM roles for EC2, EKS (IRSA), Lambda (execution role)",
          "git-secrets or pre-commit hooks that scan for AWS keys before commit",
          "AWS Organizations SCP: deny CreateAccessKey to prevent key creation",
          "Enable GuardDuty: detects credential exfiltration and unusual API calls",
          "Rotate all keys every 90 days, audit with IAM Access Analyzer"
        ]
      },
      {
        id: 10, severity: "P2", title: "S3 bucket accidentally made public — data exposure risk",
        tags: ["S3", "Data Exposure", "Compliance"],
        alert: "AWS Config rule 's3-bucket-public-read-prohibited' triggered NON_COMPLIANT. Security Hub finding: 'S3 bucket data-bucket has public access enabled.' Macie alert: PII detected in publicly accessible bucket.",
        triage: [
          { title: "Immediately Block Public Access", content: "Apply S3 Block Public Access at the bucket level. This overrides any bucket policy or ACL that grants public access. Takes effect immediately." },
          { title: "Check What Was Exposed", content: "Review bucket policy and ACLs for public grants. Check S3 server access logs or CloudTrail data events to see if anyone accessed the data. Macie findings show if PII/sensitive data was in the bucket." },
          { title: "Assess Impact", content: "How long was the bucket public? What data was in it? Was any PII, credentials, or proprietary data exposed? If PII was exposed, this may be a reportable data breach under GDPR/CCPA." },
          { title: "Notify Stakeholders", content: "If sensitive data was exposed: notify security team, legal, compliance, and potentially affected users. Document the incident timeline for compliance reporting." },
        ],
        commands: `# 1. IMMEDIATELY block public access
aws s3api put-public-access-block --bucket data-bucket \\
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }'

# 2. Check current bucket policy
aws s3api get-bucket-policy --bucket data-bucket
# Look for: "Principal": "*" or "Principal": {"AWS": "*"}

# 3. Check ACLs
aws s3api get-bucket-acl --bucket data-bucket
# Look for: grants to "AllUsers" or "AuthenticatedUsers"

# 4. Remove public policy
aws s3api delete-bucket-policy --bucket data-bucket

# 5. Check CloudTrail for access (who downloaded data?)
# In Athena:
SELECT eventtime, sourceipaddress, useragent,
  requestparameters
FROM cloudtrail_logs
WHERE eventsource = 's3.amazonaws.com'
  AND eventname = 'GetObject'
  AND requestparameters LIKE '%data-bucket%'
  AND eventtime > '2026-03-10'
ORDER BY eventtime;

# 6. Block public access at the ACCOUNT level (prevent recurrence)
aws s3control put-public-access-block \\
  --account-id 123456789012 \\
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }'`,
        rootCauses: [
          "Developer set bucket policy with Principal: '*' for testing and forgot to remove",
          "CloudFormation/Terraform template had PublicRead ACL and was deployed to production",
          "Account-level Block Public Access was not enabled",
          "Bucket policy was changed manually outside of IaC (configuration drift)"
        ],
        prevention: [
          "Enable S3 Block Public Access at the ACCOUNT level — prevents any bucket from being public",
          "AWS Config Rule + auto-remediation: if any bucket becomes public, Lambda automatically blocks it",
          "SCP in AWS Organizations: deny s3:PutBucketPolicy with Condition allowing Principal: '*'",
          "Terraform: default all buckets to block_public_access = true",
          "Enable Macie for automatic PII detection in S3 buckets"
        ]
      }
    ]
  },
  {
    id: "dr", name: "Disaster Recovery", icon: "🔥", color: "#EC4899",
    desc: "Region failure, data loss, or catastrophic events. Can you recover? How fast?",
    scenarios: [
      {
        id: 11, severity: "P1", title: "Primary AWS region (us-east-1) experiencing major outage",
        tags: ["Multi-Region", "DR", "Failover"],
        alert: "AWS Health Dashboard shows us-east-1 degraded. All services in us-east-1 are affected. Website is completely down. Status page needs to be updated.",
        triage: [
          { title: "Confirm Regional Outage", content: "Check AWS Health Dashboard (health.aws.amazon.com). Check if it's a full regional outage or specific AZ/service. Check Route 53 health checks — are they failing for all us-east-1 endpoints?" },
          { title: "Activate DR Plan", content: "If you have multi-region setup: Route 53 failover routing should automatically redirect to secondary region (eu-west-1). If not automatic: manually update Route 53 records to point to DR region. Promote Aurora Global Database secondary to primary." },
          { title: "Verify DR Environment", content: "Confirm secondary region is healthy: EKS cluster running, Aurora read replica promoted, S3 cross-region replicated data is accessible. Run smoke tests against DR environment." },
          { title: "Communicate", content: "Update status page. Notify customers of degraded service and estimated recovery time. Internal comms: all hands on deck for DR." },
        ],
        commands: `# 1. Check Route 53 health checks
aws route53 get-health-check-status \\
  --health-check-id abc123

# 2. If manual failover needed — update Route 53
aws route53 change-resource-record-sets \\
  --hosted-zone-id Z123456 \\
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.myapp.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z987654",
          "DNSName": "dr-alb-eu-west-1.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# 3. Promote Aurora Global Database secondary
aws rds failover-global-cluster \\
  --global-cluster-identifier my-global-cluster \\
  --target-db-cluster-identifier dr-cluster-eu-west-1
# Takes ~1 minute. Secondary becomes read-write.

# 4. Verify DR EKS cluster
kubectl --context dr-eu-west-1 get pods -n production
kubectl --context dr-eu-west-1 get svc -n production

# 5. Verify S3 data availability in DR region
aws s3 ls s3://data-bucket-dr-eu-west-1/ --region eu-west-1

# 6. Run smoke tests
curl -f https://api.myapp.com/health  # Should hit DR region now`,
        rootCauses: [
          "AWS regional outage (rare but has happened: us-east-1 in Dec 2021)",
          "Single-region architecture — all eggs in one basket",
          "DNS failover not configured or health checks not set up",
          "Aurora Global Database not configured — data only in primary region"
        ],
        prevention: [
          "Active-passive multi-region: primary in us-east-1, DR in eu-west-1",
          "Route 53 failover routing with health checks — automatic DNS failover",
          "Aurora Global Database with <1s replication lag to DR region",
          "S3 Cross-Region Replication for data and artifacts",
          "Regular DR drills: test failover quarterly to ensure it actually works",
          "Infrastructure-as-Code: same Terraform modules deployed to both regions"
        ]
      },
      {
        id: 12, severity: "P1", title: "Production database accidentally deleted — need to restore data",
        tags: ["RDS/Aurora", "Backup", "Data Recovery"],
        alert: "CloudTrail: DeleteDBInstance API called on production database. Application returning 'connection refused' errors. Database is gone.",
        triage: [
          { title: "Confirm and Document", content: "Check CloudTrail: who deleted it, when, was final snapshot created? aws rds describe-db-instances to confirm instance is gone. Check if deletion protection was bypassed." },
          { title: "Restore from Snapshot", content: "If final snapshot exists: restore from it (fastest). If automated backups exist: restore to any point-in-time in the retention period. Aurora: use Backtrack to rewind to before deletion (if enabled, within 72 hours)." },
          { title: "Restore Procedure", content: "Create new RDS/Aurora instance from snapshot/PITR. Update Security Group and subnet group. Update application config with new database endpoint. Verify data integrity before switching traffic." },
          { title: "Post-Incident", content: "Enable deletion protection on the restored instance. Review IAM policies — who has rds:DeleteDBInstance permission? Add SCP to prevent production DB deletion." },
        ],
        commands: `# 1. Check CloudTrail for who deleted it
aws cloudtrail lookup-events \\
  --lookup-attributes AttributeKey=EventName,AttributeValue=DeleteDBInstance \\
  --start-time $(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%S)

# 2. List available snapshots
aws rds describe-db-cluster-snapshots \\
  --db-cluster-identifier prod-db \\
  --query 'DBClusterSnapshots[].{ID:DBClusterSnapshotIdentifier,Time:SnapshotCreateTime,Status:Status}'

# 3. Restore from snapshot
aws rds restore-db-cluster-from-snapshot \\
  --db-cluster-identifier prod-db-restored \\
  --snapshot-identifier rds:prod-db-2026-03-16-02-00 \\
  --engine aurora-postgresql \\
  --vpc-security-group-ids sg-xxx \\
  --db-subnet-group-name prod-db-subnet

# 4. Or Point-in-Time Recovery (more precise)
aws rds restore-db-cluster-to-point-in-time \\
  --source-db-cluster-identifier prod-db \\
  --db-cluster-identifier prod-db-restored \\
  --restore-to-time "2026-03-16T14:30:00Z" \\
  --vpc-security-group-ids sg-xxx

# 5. Create instances for the restored cluster
aws rds create-db-instance \\
  --db-instance-identifier prod-db-restored-1 \\
  --db-cluster-identifier prod-db-restored \\
  --engine aurora-postgresql \\
  --db-instance-class db.r6g.xlarge

# 6. Enable deletion protection
aws rds modify-db-cluster \\
  --db-cluster-identifier prod-db-restored \\
  --deletion-protection \\
  --apply-immediately

# 7. Update app config to new endpoint
# prod-db-restored.cluster-xxx.us-east-1.rds.amazonaws.com`,
        rootCauses: [
          "Human error — wrong database selected for deletion (dev vs prod)",
          "Automated cleanup script ran against production instead of dev",
          "Missing deletion protection flag on the database",
          "Overly broad IAM permissions — developer had rds:DeleteDBInstance on production"
        ],
        prevention: [
          "Deletion Protection: enabled on ALL production databases",
          "IAM Deny policy: deny rds:DeleteDB* on resources tagged Environment=production",
          "SCP in AWS Organizations: deny destructive actions on production accounts",
          "Automated backups: 35-day retention for production (max for Aurora)",
          "Aurora Backtrack: enable 72-hour backtrack window for instant rewind",
          "Naming convention + tagging: prod-db-main vs dev-db-test — clear distinction"
        ]
      }
    ]
  },
  {
    id: "cost", name: "Cost & Optimization", icon: "💰", color: "#10B981",
    desc: "Your AWS bill just doubled. Find the waste, optimize resources, and prevent cost overruns.",
    scenarios: [
      {
        id: 13, severity: "P3", title: "AWS bill jumped 40% this month — no known infrastructure changes",
        tags: ["Cost Explorer", "Billing", "Investigation"],
        alert: "AWS Budget alert: actual spend 140% of forecasted budget. Finance team is asking questions. No new services were intentionally launched.",
        triage: [
          { title: "Analyze with Cost Explorer", content: "AWS Cost Explorer → filter by service, region, instance type, tags. Compare this month vs last month. Which service increased? Is it EC2, RDS, data transfer, S3, or NAT Gateway? Group by tag (Environment, Team) to find the culprit." },
          { title: "Common Hidden Costs", content: "NAT Gateway data processing charges ($0.045/GB — can be huge). Forgotten EC2/RDS instances running in non-prod. Unattached EBS volumes still being charged. Cross-region data transfer. CloudWatch Logs ingestion/storage." },
          { title: "Investigate Anomalies", content: "Check for: large EC2 instances in unexpected regions (compromised account?), unusual S3 storage growth, high Lambda invocations from a misconfigured trigger, or Elastic IPs not attached to instances." },
          { title: "Take Action", content: "Terminate unused resources. Right-size over-provisioned instances. Implement S3 lifecycle policies. Consider Reserved Instances or Savings Plans for steady workloads. Set up tighter Budget alerts." },
        ],
        commands: `# Cost breakdown by service (last 30 days)
aws ce get-cost-and-usage \\
  --time-period Start=2026-02-16,End=2026-03-16 \\
  --granularity MONTHLY \\
  --metrics BlendedCost \\
  --group-by Type=DIMENSION,Key=SERVICE

# Find unattached EBS volumes ($$$)
aws ec2 describe-volumes \\
  --filters Name=status,Values=available \\
  --query 'Volumes[].{ID:VolumeId,Size:Size,Type:VolumeType,Created:CreateTime}'
# These are being charged but not used!

# Find stopped EC2 instances (EBS still charges!)
aws ec2 describe-instances \\
  --filters Name=instance-state-name,Values=stopped \\
  --query 'Reservations[].Instances[].{ID:InstanceId,Type:InstanceType,Stopped:StateTransitionReason}'

# Find unused Elastic IPs ($0.005/hr if not attached)
aws ec2 describe-addresses \\
  --query 'Addresses[?AssociationId==null].{IP:PublicIp,AllocID:AllocationId}'

# Find old snapshots (accumulate over time)
aws ec2 describe-snapshots --owner-ids self \\
  --query 'Snapshots[?StartTime<=\`2025-01-01\`].{ID:SnapshotId,Size:VolumeSize,Date:StartTime}'

# NAT Gateway cost check (often the surprise)
aws cloudwatch get-metric-statistics \\
  --namespace AWS/NATGateway \\
  --metric-name BytesOutToDestination \\
  --dimensions Name=NatGatewayId,Value=nat-xxx \\
  --start-time $(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \\
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \\
  --period 86400 --statistics Sum

# Set up budget alarm
aws budgets create-budget \\
  --account-id 123456789012 \\
  --budget '{
    "BudgetName": "monthly-total",
    "BudgetLimit": {"Amount": "5000", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \\
  --notifications-with-subscribers '[{
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80
    },
    "Subscribers": [{
      "SubscriptionType": "EMAIL",
      "Address": "ops@company.com"
    }]
  }]'`,
        rootCauses: [
          "NAT Gateway data processing — pods pulling images or calling APIs generate massive NAT traffic",
          "Forgotten dev/test instances left running over weekends/holidays",
          "CloudWatch Logs — verbose logging to CloudWatch at $0.50/GB ingestion",
          "Unattached EBS volumes from terminated instances",
          "Data transfer between AZs or regions (often overlooked)",
          "Compromised account — attacker launched crypto mining EC2 instances"
        ],
        prevention: [
          "Budget alerts at 50%, 80%, 100% of expected spend",
          "Resource tagging mandate — every resource tagged with Environment, Team, CostCenter",
          "Automated cleanup: Lambda function terminates untagged resources after 7 days",
          "VPC Endpoints for S3 and ECR — eliminates NAT Gateway charges for AWS service traffic",
          "Right-sizing recommendations from AWS Compute Optimizer",
          "Savings Plans for predictable baseline workloads (60%+ savings)"
        ]
      },
      {
        id: 14, severity: "P3", title: "EKS cluster costs are 3x higher than expected",
        tags: ["EKS", "Cost Optimization", "Right-sizing"],
        alert: "Monthly EKS bill is $15K instead of expected $5K. Team provisioned cluster 3 months ago and hasn't optimized since.",
        triage: [
          { title: "Analyze Node Utilization", content: "kubectl top nodes — are nodes under 30% CPU/memory? Over-provisioned nodes waste money. Check if nodes are the right instance type." },
          { title: "Check Pod Resource Requests vs Usage", content: "kubectl top pods vs deployment resource requests. If pods request 1 CPU but only use 0.2 CPU, you're wasting 80% of capacity. Kubernetes schedules based on REQUESTS, not actual usage." },
          { title: "Identify Optimization Opportunities", content: "Can any workloads move to Spot? Are dev/staging environments running 24/7? Is Fargate cheaper for some workloads? Can you use Graviton (ARM) instances?" },
          { title: "Implement Changes", content: "Right-size resource requests. Add Spot node groups for non-critical workloads. Scale down dev/staging at night. Switch to Graviton instances. Consider Karpenter for better bin-packing." },
        ],
        commands: `# Check node utilization
kubectl top nodes
# If CPU <30% and Memory <30%, nodes are over-provisioned

# Check pod resource requests vs actual usage
kubectl top pods -n production --sort-by=cpu
kubectl get pods -n production -o=custom-columns=\\
  'NAME:.metadata.name,CPU_REQ:.spec.containers[0].resources.requests.cpu,MEM_REQ:.spec.containers[0].resources.requests.memory'

# Find pods with excessive resource requests
# Example: pod requests 2 CPU but uses 0.1 CPU
# → Reduce request to 250m (with limit at 500m)

# Check if Spot instances are being used
kubectl get nodes -L eks.amazonaws.com/capacityType
# ON_DEMAND vs SPOT — move non-critical to Spot

# Check for always-running dev workloads
kubectl get deployments --all-namespaces | grep -i dev

# Scale down dev at night (CronJob approach)
kubectl scale deployment --all -n dev-namespace --replicas=0
# Scale up in morning: --replicas=3

# Karpenter provisioner for cost optimization
# karpenter.sh/provisioner:
# - instanceTypes: m7g.*, c7g.*, r7g.*  (Graviton)
# - capacityTypes: ["spot", "on-demand"]  (Spot first)
# - ttlSecondsAfterEmpty: 30  (remove empty nodes fast)`,
        rootCauses: [
          "Over-provisioned nodes: running m5.4xlarge when m7g.xlarge is sufficient",
          "Over-requested pods: 2 CPU requested but 0.2 used — 90% wasted",
          "All On-Demand: no Spot instances for fault-tolerant workloads",
          "x86 instances: not using Graviton (ARM) — 40% more expensive",
          "No autoscaling: fixed node count even when traffic is low",
          "Dev/staging running 24/7: paying for 168 hrs/week but used for 40"
        ],
        prevention: [
          "VPA (Vertical Pod Autoscaler) in recommend mode — tells you right resource requests",
          "Karpenter instead of Cluster Autoscaler — better instance selection, faster scaling, automatic Spot",
          "Kubecost or OpenCost for per-namespace, per-team cost visibility",
          "Scheduled scaling: dev/staging → 0 replicas at 8 PM, restore at 8 AM",
          "Graviton instances (m7g, c7g) as default — change only if ARM incompatible",
          "Spot for all non-critical workloads: CI/CD, dev, batch processing, stateless services"
        ]
      }
    ]
  },
  {
    id: "network", name: "Networking Issues", icon: "🌐", color: "#3B82F6",
    desc: "Connectivity failures, DNS issues, and network misconfigurations that break communication between services.",
    scenarios: [
      {
        id: 15, severity: "P2", title: "Pods can't connect to RDS database — connection refused",
        tags: ["VPC", "Security Groups", "EKS"],
        alert: "Application logs: 'FATAL: connection to database at 10.0.21.5:5432 failed: Connection refused'. All API endpoints returning 500. Deployed new EKS node group 30 minutes ago.",
        triage: [
          { title: "Verify Database is Running", content: "aws rds describe-db-instances — is the database Available? Check if it was rebooted, failed over, or is in maintenance. If it's running, the problem is network/security." },
          { title: "Check Security Groups", content: "Does the RDS Security Group allow inbound :5432 from the EKS node/pod Security Group? Common issue: new node group has a DIFFERENT Security Group that's not in the RDS inbound rules." },
          { title: "Check Network Reachability", content: "Are the EKS nodes and RDS in the same VPC? Are the subnets routed correctly? Can you reach the RDS endpoint from inside a pod? kubectl exec into a pod and try nc -zv <rds-endpoint> 5432." },
          { title: "Fix Security Group", content: "Add the new EKS node group Security Group to the RDS inbound rule on port 5432. Test connectivity. If using SG chaining, update the reference." },
        ],
        commands: `# 1. Verify RDS is running
aws rds describe-db-instances \\
  --db-instance-identifier prod-db \\
  --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address,SG:VpcSecurityGroups}'

# 2. Test connectivity from a pod
kubectl exec -it <pod> -n production -- \\
  nc -zv prod-db.cluster-xxx.us-east-1.rds.amazonaws.com 5432
# "Connection refused" = SG blocking
# "Connection timed out" = route/NACL issue

# 3. Check Security Group rules
# Get RDS Security Group
aws rds describe-db-instances --db-instance-identifier prod-db \\
  --query 'DBInstances[0].VpcSecurityGroups[].VpcSecurityGroupId'

# Check inbound rules
aws ec2 describe-security-groups --group-ids sg-rds-xxx \\
  --query 'SecurityGroups[0].IpPermissions'
# Look for: port 5432 allowed from EKS node SG

# 4. Get EKS node Security Group
aws eks describe-nodegroup \\
  --cluster-name prod-cluster \\
  --nodegroup-name new-node-group \\
  --query 'nodegroup.resources.remoteAccessSecurityGroup'

# 5. Add missing SG rule
aws ec2 authorize-security-group-ingress \\
  --group-id sg-rds-xxx \\
  --protocol tcp --port 5432 \\
  --source-group sg-eks-new-nodes

# 6. DNS resolution check from pod
kubectl exec -it <pod> -- nslookup prod-db.cluster-xxx.us-east-1.rds.amazonaws.com
# Should resolve to private IP in the VPC

# 7. Check NACL (if SG looks fine)
aws ec2 describe-network-acls \\
  --filters Name=association.subnet-id,Values=subnet-db-xxx \\
  --query 'NetworkAcls[0].Entries'`,
        rootCauses: [
          "Security Group not updated: new EKS node group SG not added to RDS inbound rules",
          "Subnet routing: EKS nodes in a different subnet that can't reach the database subnet",
          "NACL blocking: custom NACL on database subnet denying traffic from new source",
          "DNS failure: CoreDNS can't resolve the RDS endpoint (check CoreDNS pod health)",
          "RDS in different VPC without peering/TGW connectivity",
          "RDS failover changed the endpoint IP and DNS hasn't propagated"
        ],
        prevention: [
          "Use Security Group references (not CIDR) — sg-eks-nodes as source in RDS SG, not specific IPs",
          "Terraform manages all SG rules — new node groups auto-included via module",
          "Test network connectivity in CI/CD after infrastructure changes",
          "CloudWatch alarm on RDS connections dropping to zero — early warning",
          "Use RDS Proxy endpoint: doesn't change during failover, handles connection pooling"
        ]
      },
      {
        id: 16, severity: "P2", title: "DNS resolution failures causing intermittent errors across all services",
        tags: ["CoreDNS", "Route 53", "EKS"],
        alert: "Multiple services logging intermittent 'Name resolution failed' errors. Not constant — about 5% of DNS lookups fail. Happening across all namespaces. Started after cluster scaled up significantly.",
        triage: [
          { title: "Check CoreDNS Health", content: "kubectl get pods -n kube-system -l k8s-app=kube-dns — are CoreDNS pods healthy? kubectl top pods -n kube-system — is CoreDNS CPU/memory maxed out? If overloaded, DNS queries are dropped." },
          { title: "Scale CoreDNS", content: "CoreDNS deployment typically has 2 replicas. If the cluster scaled to 100+ nodes, 2 replicas is not enough. Scale up: kubectl scale deployment coredns -n kube-system --replicas=5." },
          { title: "Check for ndots:5 Issue", content: "By default, Kubernetes resolves names with ndots:5 — meaning 'db.example.com' triggers 5 failed lookups before trying the actual domain. This 5x multiplies DNS load. Fix with dnsConfig in pod spec." },
          { title: "Consider NodeLocal DNS Cache", content: "Deploy NodeLocal DNSCache — runs a DNS cache on every node. Pods query the local cache first, reducing load on CoreDNS by 80-90%. Standard solution for large EKS clusters." },
        ],
        commands: `# 1. Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns -o wide
kubectl top pods -n kube-system -l k8s-app=kube-dns

# 2. Check CoreDNS logs for errors
kubectl logs -l k8s-app=kube-dns -n kube-system --tail=50 | grep -i "error\\|timeout\\|refused"

# 3. Scale CoreDNS (immediate relief)
kubectl scale deployment coredns -n kube-system --replicas=5

# 4. Test DNS from a pod
kubectl run dns-test --image=busybox -it --rm -- sh
nslookup kubernetes.default.svc.cluster.local
nslookup google.com
# If internal works but external fails → ndots issue
# If both fail → CoreDNS is overwhelmed

# 5. Fix ndots issue in pod spec:
# spec:
#   dnsConfig:
#     options:
#     - name: ndots
#       value: "2"    # Reduce from default 5
#     - name: single-request-reopen
#       value: ""     # Prevents conntrack race condition

# 6. Deploy NodeLocal DNS Cache (long-term fix)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/kubernetes/master/cluster/addons/dns/nodelocaldns/nodelocaldns.yaml

# 7. Check DNS query rate
kubectl exec -it <coredns-pod> -n kube-system -- \\
  cat /proc/net/stat/nf_conntrack | head -2
# High drop count = DNS overload`,
        rootCauses: [
          "CoreDNS overwhelmed: 2 replicas handling 500+ nodes' worth of DNS queries",
          "ndots:5 default: every external domain lookup generates 5 search domain queries first",
          "Conntrack table full: Linux kernel connection tracking table exhausted on nodes",
          "VPC DNS throttling: AWS VPC DNS resolver has a per-ENI limit of 1024 packets/second",
          "Memory leak in CoreDNS: older versions had memory issues under high load"
        ],
        prevention: [
          "NodeLocal DNSCache on every EKS cluster — reduces CoreDNS load by 80-90%",
          "CoreDNS autoscaling: use proportional-autoscaler to scale CoreDNS replicas with cluster size",
          "Set ndots:2 in PodDefault or mutating webhook for all pods",
          "Use FQDN with trailing dot (db.example.com.) to skip search domain resolution",
          "Monitor CoreDNS metrics: coredns_dns_request_count, coredns_dns_response_rcode_count"
        ]
      }
    ]
  },
  {
    id: "deploy", name: "Deployment & Release", icon: "🚀", color: "#06B6D4",
    desc: "Deployments gone wrong, rollback decisions, and release engineering challenges.",
    scenarios: [
      {
        id: 17, severity: "P2", title: "Canary deployment showing 5x error rate — should you rollback?",
        tags: ["Deployment", "Canary", "Istio"],
        alert: "Canary deployment routing 10% traffic to v2.1.0. CloudWatch: v2.1.0 target group showing 15% error rate (vs 0.5% for v2.0.0 stable). Latency P99 is 3x higher on canary.",
        triage: [
          { title: "Assess the Impact", content: "10% of traffic affected × 15% error rate = 1.5% of total users seeing errors. Is this acceptable during canary? Compare with baseline error rate. If errors are 500s vs 400s — 500s are bugs, 400s might be expected." },
          { title: "Investigate the Errors", content: "Check canary pod logs for stack traces. Are errors for all endpoints or specific ones? Is it a dependency issue or code bug? Check if the error is consistent or intermittent." },
          { title: "Decision: Rollback or Fix-Forward", content: "If errors are caused by a simple config issue → fix and redeploy to canary. If errors are a code bug → ROLLBACK immediately. If errors are a dependency issue → fix dependency, don't rollback. Rule: if you can't identify root cause in 15 minutes, rollback." },
          { title: "Execute Rollback", content: "Istio: shift canary weight to 0%. K8s: kubectl rollout undo. ALB: remove canary target group from weighted routing. Verify error rates return to baseline." },
        ],
        commands: `# Check canary vs stable error rates
# CloudWatch Log Insights:
fields @timestamp, status_code, version
| filter version = "v2.1.0"
| stats count() as total,
  sum(status_code >= 500) as errors,
  (sum(status_code >= 500) / count()) * 100 as error_rate
| limit 1

# Istio canary — shift all traffic back to stable
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: web-app
spec:
  hosts: [web-app]
  http:
  - route:
    - destination:
        host: web-app
        subset: stable    # v2.0.0
      weight: 100
    - destination:
        host: web-app
        subset: canary    # v2.1.0
      weight: 0           # Rollback!
EOF

# Kubernetes rollback
kubectl rollout undo deployment/web-app -n production
kubectl rollout status deployment/web-app -n production

# ALB weighted rollback
aws elbv2 modify-rule --rule-arn <canary-rule-arn> \\
  --actions '[{
    "Type": "forward",
    "ForwardConfig": {
      "TargetGroups": [
        {"TargetGroupArn": "<stable-tg>", "Weight": 100},
        {"TargetGroupArn": "<canary-tg>", "Weight": 0}
      ]
    }
  }]'

# Post-rollback: verify error rate returned to baseline
# Wait 5 minutes, check CloudWatch metrics`,
        rootCauses: [
          "Code bug in new version — untested edge case in production data",
          "Missing environment variable in canary deployment config",
          "Database schema mismatch — new code expects column that doesn't exist yet",
          "Dependency version mismatch — new image has incompatible library",
          "Resource limits too low — new version uses more memory, getting OOMKilled"
        ],
        prevention: [
          "Automated canary analysis: Flagger or Argo Rollouts auto-rollback if error rate > threshold",
          "Progressive delivery: 1% → 5% → 10% → 25% → 50% → 100% with gates at each step",
          "Database migrations BEFORE code deployment (backward-compatible schema changes)",
          "Smoke tests in staging with production-like data before canary",
          "Feature flags: deploy code first (behind flag), enable flag gradually via canary"
        ]
      },
      {
        id: 18, severity: "P3", title: "CI/CD pipeline takes 45 minutes — need to reduce to under 15",
        tags: ["CI/CD", "CodeBuild", "Optimization"],
        alert: "Developers complaining about slow feedback loop. Pipeline stages: checkout (2min) → install deps (12min) → lint (3min) → test (15min) → build Docker (8min) → push ECR (3min) → deploy (2min). Total: 45 min.",
        triage: [
          { title: "Identify the Bottlenecks", content: "Install deps: 12min — likely downloading packages every time. Test: 15min — tests may be running sequentially. Docker build: 8min — no layer caching. These 3 stages account for 35 of 45 minutes." },
          { title: "Cache Dependencies", content: "CodeBuild supports caching to S3. Cache node_modules, pip packages, Maven/Gradle dependencies. First run still slow, subsequent runs skip download. Saves 10+ minutes." },
          { title: "Parallelize Tests", content: "Run test suites in parallel CodeBuild actions. Or use test splitting (split test files across N parallel containers). Each runs a subset, results merged." },
          { title: "Optimize Docker Build", content: "Multi-stage builds. Order Dockerfile layers: OS → deps → code (most-changed last). Use BuildKit cache mounts. Docker layer caching in CodeBuild. Consider pre-built base images." },
        ],
        commands: `# buildspec.yml with caching
version: 0.2
cache:
  paths:
    - 'node_modules/**/*'        # Cache npm packages
    - '/root/.cache/pip/**/*'    # Cache pip packages
    - '/root/.docker/**/*'       # Cache Docker layers

phases:
  install:
    commands:
      # Only install if lock file changed
      - |
        if [ -f node_modules/.cache-hash ] && \\
           [ "$(md5sum package-lock.json)" = "$(cat node_modules/.cache-hash)" ]; then
          echo "Cache hit — skipping npm install"
        else
          npm ci  # Faster than npm install
          md5sum package-lock.json > node_modules/.cache-hash
        fi
  build:
    commands:
      # Parallel tests
      - npm test -- --parallel --maxWorkers=4

      # Docker build with BuildKit caching
      - export DOCKER_BUILDKIT=1
      - docker build \\
          --cache-from $ECR_REPO:cache \\
          --build-arg BUILDKIT_INLINE_CACHE=1 \\
          -t $ECR_REPO:$TAG .
      - docker tag $ECR_REPO:$TAG $ECR_REPO:cache
      - docker push $ECR_REPO:$TAG
      - docker push $ECR_REPO:cache  # Push cache layer

# Optimized Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --production    # Only production deps

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
CMD ["node", "dist/server.js"]
# Result: 45min → ~12min`,
        rootCauses: [
          "No caching: fresh npm install / pip install every build",
          "Sequential tests: 500 tests running one by one instead of parallel",
          "No Docker layer caching: rebuilding entire image from scratch",
          "Large Docker context: sending unnecessary files to Docker daemon",
          "Monolith testing: all tests run even for small changes"
        ],
        prevention: [
          "S3 build cache in CodeBuild for all dependency managers",
          "Docker BuildKit with --cache-from ECR for layer caching",
          "Parallel test execution with worker splitting",
          "Multi-stage Dockerfile — smaller final image, faster push/pull",
          ".dockerignore — exclude node_modules, .git, test files from build context",
          "Change-based testing: only run tests for changed packages/modules"
        ]
      }
    ]
  }
];

// ===== MAIN COMPONENT =====
export default function CloudOpsScenarios() {
  const [activeCat, setActiveCat] = useState("incident");
  const [activeScenario, setActiveScenario] = useState(null);
  const [revealed, setRevealed] = useState({});
  const toggleReveal = (id, section) => setRevealed(p => ({ ...p, [`${id}-${section}`]: !p[`${id}-${section}`] }));
  const isRevealed = (id, section) => revealed[`${id}-${section}`];

  const cat = categories.find(c => c.id === activeCat);
  const scenario = activeScenario !== null ? cat?.scenarios[activeScenario] : null;
  const totalScenarios = categories.reduce((a, c) => a + c.scenarios.length, 0);

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", background: "#060D1B", minHeight: "100vh", color: "#CBD5E1" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "linear-gradient(160deg, #0a1020, #15102a, #0a1020)", borderBottom: "1px solid #1a2744", padding: "22px 24px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: "linear-gradient(135deg, #EF4444, #F59E0B)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🛠️</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: "#F1F5F9" }}>Cloud Operations — Scenario Practice Lab</h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748B" }}>{categories.length} categories • {totalScenarios} scenarios • Incidents → Debugging → Security → DR → Cost → Networking → Deployments</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 14, overflowX: "auto", paddingBottom: 2 }}>
          {categories.map(c => (
            <button key={c.id} onClick={() => { setActiveCat(c.id); setActiveScenario(null); setRevealed({}); }} style={{
              padding: "8px 14px", border: activeCat === c.id ? `2px solid ${c.color}` : "1px solid #1a2744",
              borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
              background: activeCat === c.id ? c.color + "15" : "#0d1525", color: activeCat === c.id ? c.color : "#64748B", transition: "all 0.15s"
            }}>
              {c.icon} {c.name} <span style={{ opacity: 0.5, marginLeft: 4 }}>({c.scenarios.length})</span>
            </button>
          ))}
        </div>
      </div>

      {cat && (
        <div style={{ padding: "16px 24px", maxWidth: 960, margin: "0 auto" }}>
          {!scenario ? (
            /* Scenario list */
            <div>
              <p style={{ fontSize: 13, color: "#94A3B8", margin: "0 0 16px", lineHeight: 1.6 }}>{cat.desc}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cat.scenarios.map((s, i) => (
                  <button key={i} onClick={() => { setActiveScenario(i); setRevealed({}); }} style={{
                    padding: "14px 16px", background: "#0d1525", border: "1px solid #1a2744", borderRadius: 10,
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.15s",
                    display: "flex", alignItems: "flex-start", gap: 12
                  }}>
                    <div style={{ padding: "4px 8px", borderRadius: 6, background: s.severity === "P1" ? "#EF444430" : s.severity === "P2" ? "#F59E0B30" : "#3B82F630", color: s.severity === "P1" ? "#EF4444" : s.severity === "P2" ? "#F59E0B" : "#3B82F6", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{s.severity}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", marginBottom: 4 }}>#{s.id}: {s.title}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>{s.tags.map(t => <Tag key={t} text={t} color={cat.color} />)}</div>
                    </div>
                    <span style={{ color: "#475569", fontSize: 18, flexShrink: 0 }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Scenario detail */
            <div>
              <button onClick={() => setActiveScenario(null)} style={{ background: "none", border: "none", color: cat.color, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
                ← Back to {cat.name} scenarios
              </button>

              {/* Alert Box */}
              <div style={{ background: "#1a0a0a", border: "1px solid #7f1d1d", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ padding: "3px 8px", borderRadius: 6, background: scenario.severity === "P1" ? "#EF4444" : "#F59E0B", color: "#fff", fontSize: 12, fontWeight: 800 }}>{scenario.severity}</span>
                  <h2 style={{ margin: 0, fontSize: 17, color: "#FCA5A5" }}>#{scenario.id}: {scenario.title}</h2>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: "#FCA5A5", opacity: 0.8 }}>
                  <strong>Alert:</strong> {scenario.alert}
                </div>
              </div>

              {/* Interactive Sections */}
              {/* Triage Steps */}
              <div style={{ background: "#0d1525", border: "1px solid #1a2744", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
                <button onClick={() => toggleReveal(scenario.id, "triage")} style={{
                  width: "100%", padding: "14px 18px", border: "none", background: isRevealed(scenario.id, "triage") ? cat.color + "10" : "transparent",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "#F1F5F9", textAlign: "left",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <span>🔍 Triage Steps — What would you do first?</span>
                  <span style={{ fontSize: 12, color: cat.color, fontWeight: 600 }}>{isRevealed(scenario.id, "triage") ? "Hide" : "Reveal Answer"}</span>
                </button>
                {isRevealed(scenario.id, "triage") && (
                  <div style={{ padding: "4px 18px 16px" }}>
                    {scenario.triage.map((s, i) => <StepBlock key={i} num={i + 1} title={s.title} content={s.content} color={cat.color} />)}
                  </div>
                )}
              </div>

              {/* Commands */}
              <div style={{ background: "#0d1525", border: "1px solid #1a2744", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
                <button onClick={() => toggleReveal(scenario.id, "commands")} style={{
                  width: "100%", padding: "14px 18px", border: "none", background: isRevealed(scenario.id, "commands") ? cat.color + "10" : "transparent",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "#F1F5F9", textAlign: "left",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <span>💻 Commands & Diagnostics</span>
                  <span style={{ fontSize: 12, color: cat.color, fontWeight: 600 }}>{isRevealed(scenario.id, "commands") ? "Hide" : "Reveal Answer"}</span>
                </button>
                {isRevealed(scenario.id, "commands") && (
                  <div style={{ padding: "4px 18px 16px" }}>
                    <CmdBlock>{scenario.commands}</CmdBlock>
                  </div>
                )}
              </div>

              {/* Root Causes */}
              <div style={{ background: "#0d1525", border: "1px solid #1a2744", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
                <button onClick={() => toggleReveal(scenario.id, "root")} style={{
                  width: "100%", padding: "14px 18px", border: "none", background: isRevealed(scenario.id, "root") ? cat.color + "10" : "transparent",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "#F1F5F9", textAlign: "left",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <span>🎯 Possible Root Causes</span>
                  <span style={{ fontSize: 12, color: cat.color, fontWeight: 600 }}>{isRevealed(scenario.id, "root") ? "Hide" : "Reveal Answer"}</span>
                </button>
                {isRevealed(scenario.id, "root") && (
                  <div style={{ padding: "4px 18px 16px" }}>
                    {scenario.rootCauses.map((r, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, margin: "6px 0", fontSize: 13, color: "#CBD5E1" }}>
                        <span style={{ color: "#EF4444", fontWeight: 700, flexShrink: 0 }}>•</span>
                        <span style={{ lineHeight: 1.6 }}>{r}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Prevention */}
              <div style={{ background: "#0d1525", border: "1px solid #1a2744", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
                <button onClick={() => toggleReveal(scenario.id, "prevent")} style={{
                  width: "100%", padding: "14px 18px", border: "none", background: isRevealed(scenario.id, "prevent") ? cat.color + "10" : "transparent",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "#F1F5F9", textAlign: "left",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <span>🛡️ How to Prevent This</span>
                  <span style={{ fontSize: 12, color: cat.color, fontWeight: 600 }}>{isRevealed(scenario.id, "prevent") ? "Hide" : "Reveal Answer"}</span>
                </button>
                {isRevealed(scenario.id, "prevent") && (
                  <div style={{ padding: "4px 18px 16px" }}>
                    {scenario.prevention.map((p, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, margin: "6px 0", fontSize: 13, color: "#CBD5E1" }}>
                        <span style={{ color: "#10B981", fontWeight: 700, flexShrink: 0 }}>✓</span>
                        <span style={{ lineHeight: 1.6 }}>{p}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Next scenario nav */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
                <button disabled={activeScenario === 0} onClick={() => { setActiveScenario(activeScenario - 1); setRevealed({}); }} style={{
                  padding: "8px 16px", border: "1px solid #1a2744", borderRadius: 8, cursor: activeScenario === 0 ? "default" : "pointer",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 600, background: "#0d1525", color: activeScenario === 0 ? "#334155" : cat.color, opacity: activeScenario === 0 ? 0.4 : 1
                }}>← Previous</button>
                <button disabled={activeScenario === cat.scenarios.length - 1} onClick={() => { setActiveScenario(activeScenario + 1); setRevealed({}); }} style={{
                  padding: "8px 16px", border: "1px solid #1a2744", borderRadius: 8, cursor: activeScenario === cat.scenarios.length - 1 ? "default" : "pointer",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 600, background: "#0d1525", color: activeScenario === cat.scenarios.length - 1 ? "#334155" : cat.color, opacity: activeScenario === cat.scenarios.length - 1 ? 0.4 : 1
                }}>Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ textAlign: "center", padding: "20px", color: "#1E293B", fontSize: 11, borderTop: "1px solid #0d1525", marginTop: 32 }}>
        Cloud Operations Scenario Practice Lab — Cloud Engineer Interview Preparation — March 2026
      </div>
    </div>
  );
}
