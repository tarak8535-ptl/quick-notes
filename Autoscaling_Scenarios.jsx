import { useState } from "react";

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

const Note = ({ type = "info", children }) => {
  const styles = {
    info: { bg: "#1E3A5F20", border: "#3B82F6", icon: "💡", label: "Key Point" },
    warn: { bg: "#92400E20", border: "#F59E0B", icon: "⚠️", label: "Watch Out" },
    tip: { bg: "#065F4620", border: "#10B981", icon: "✅", label: "Best Practice" },
    interview: { bg: "#9F123A20", border: "#F43F5E", icon: "🎯", label: "Interview Tip" },
  };
  const s = styles[type];
  return (
    <div style={{ padding: "10px 14px", background: s.bg, borderLeft: `3px solid ${s.border}`, borderRadius: "0 7px 7px 0", margin: "10px 0", fontSize: 12, lineHeight: 1.7, color: "#CBD5E1" }}>
      <strong style={{ color: s.border }}>{s.icon} {s.label}:</strong> {children}
    </div>
  );
};

const categories = [
  {
    id: "hpa",
    name: "HPA Scenarios",
    icon: "📈",
    color: "#3B82F6",
    desc: "Horizontal Pod Autoscaler: pods not scaling, scaling too slow, flapping, or scaling on wrong metrics.",
    scenarios: [
      {
        id: 1,
        severity: "P2",
        title: "Traffic spike — pods not scaling fast enough, latency spiking",
        tags: ["HPA", "Traffic Spike", "Latency"],
        alert: "Grafana: P99 latency jumped from 150ms → 4s. HPA shows 3/20 replicas. CPU at 95% across all pods. Users reporting timeouts. Black Friday sale launched 10 minutes ago.",
        triage: [
          { title: "Check HPA Status", content: "kubectl get hpa -n production — look at TARGETS vs MINPODS/MAXPODS. Is the HPA hitting maxReplicas? Is the metric being read correctly? Check REFERENCE column for the deployment name." },
          { title: "Check Why Scale-Up Is Slow", content: "HPA polls metrics every 15s by default. Scaling up is conservative: it waits for metric to be above threshold for 3 consecutive readings (45s). New pods also need to pass readiness probes before receiving traffic." },
          { title: "Check Node Capacity", content: "kubectl get nodes and kubectl describe nodes — is there enough CPU/memory headroom on nodes for new pods? If not, Cluster Autoscaler needs to provision new nodes first (adds 2-5 min delay)." },
          { title: "Emergency Manual Scale", content: "kubectl scale deployment api --replicas=20 -n production. This bypasses HPA timing. HPA will resume control after stabilizationWindowSeconds. Communicate to team: 'Manually scaled to 20, monitoring latency.'" },
        ],
        commands: `# Check HPA current state
kubectl get hpa -n production -o wide
kubectl describe hpa api-hpa -n production

# Sample output to inspect:
# REFERENCE     TARGETS          MINPODS  MAXPODS  REPLICAS
# api-hpa       85%/70%, 0/1000  3        20       3
# ← CPU at 85% (above 70% threshold) but still only 3 replicas
# ← why? stabilization window or node capacity

# Check HPA events (scaling decisions)
kubectl describe hpa api-hpa -n production | grep -A 20 Events

# See scaling history (if you have HPA scaler events)
kubectl get events -n production --field-selector reason=SuccessfulRescale

# Check if pods are pending (node capacity issue)
kubectl get pods -n production | grep Pending
kubectl describe pod <pending-pod> | grep -A 10 Events

# Emergency scale
kubectl scale deployment api --replicas=20 -n production

# Watch pods coming up
kubectl get pods -n production -w | grep api

# Monitor HPA live
watch -n 5 kubectl get hpa -n production`,
        rootCauses: [
          "HPA stabilization window (default 5min for scale-down, 0 for scale-up) causing delay",
          "Cluster Autoscaler hasn't provisioned new nodes yet — pods stuck Pending",
          "Readiness probe too slow — new pods aren't ready for traffic",
          "maxReplicas set too low for the traffic volume",
          "Metrics Server delay — HPA reads stale metrics",
        ],
        prevention: [
          "Set maxReplicas generously — you pay for actual usage, not the limit",
          "Pre-scale before known events: kubectl scale --replicas=15 before sale launch",
          "Keep warm nodes: configure Cluster Autoscaler overprovisioning (placeholder pods)",
          "Use fast readiness probes (5s period) so new pods become ready quickly",
          "Set scaleUp.stabilizationWindowSeconds: 0 to scale up immediately",
        ],
        config: `# Optimized HPA for spike-prone workloads
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 5        # higher floor for baseline load
  maxReplicas: 100      # generous ceiling
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60   # lower threshold = earlier scale-up
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0    # scale up instantly
      policies:
        - type: Percent
          value: 100                   # can double pod count per minute
          periodSeconds: 60
        - type: Pods
          value: 10                    # or add 10 pods per minute
          periodSeconds: 60
      selectPolicy: Max                # use whichever adds more pods
    scaleDown:
      stabilizationWindowSeconds: 300  # wait 5min before scaling down`,
      },
      {
        id: 2,
        severity: "P3",
        title: "HPA flapping — pods constantly scaling up and down",
        tags: ["HPA", "Flapping", "Thrashing"],
        alert: "Ops team notices pod count oscillating: 10 → 4 → 10 → 4 every few minutes. CPU alerts firing and clearing repeatedly. Deployment history shows 50+ replica changes in one hour.",
        triage: [
          { title: "Confirm Flapping", content: "kubectl get events -n production --field-selector reason=SuccessfulRescale | tail -20. You'll see alternating scale-up and scale-down events. Check timestamps — if they're < 5 minutes apart, it's thrashing." },
          { title: "Identify Root Cause", content: "Usually one of: (1) CPU threshold too close to actual usage, (2) scale-down stabilization window too short, (3) app has bursty CPU usage that looks like load but is actually GC or startup spikes." },
          { title: "Check Metric Behavior", content: "In Grafana, plot container_cpu_usage_seconds_total alongside HPA replica count. You'll see CPU spike → scale-up → CPU drops per pod → scale-down → CPU spikes again as fewer pods handle same load." },
        ],
        commands: `# Watch HPA changes in real time
kubectl get hpa api-hpa -n production -w

# Check scaling events history
kubectl get events -n production \\
  --field-selector reason=SuccessfulRescale \\
  --sort-by=.lastTimestamp

# Plot HPA metric over time (PromQL)
# In Grafana/Prometheus:
kube_horizontalpodautoscaler_status_current_replicas{
  namespace="production",
  horizontalpodautoscaler="api-hpa"
}

# CPU utilization per pod
avg(rate(container_cpu_usage_seconds_total{
  namespace="production", container="api"
}[2m])) / avg(kube_pod_container_resource_requests{
  namespace="production", resource="cpu"
}) * 100`,
        rootCauses: [
          "Target CPU utilization too close to actual — small fluctuations trigger both scale events",
          "scaleDown.stabilizationWindowSeconds too low (or 0) — scales down too eagerly",
          "App has bursty CPU: JVM GC, startup warming, cron jobs spike CPU briefly",
          "Resource requests set too low — makes utilization % look high even at normal load",
        ],
        prevention: [
          "Set scaleDown.stabilizationWindowSeconds: 300 (5 min) — most common fix",
          "Raise CPU target to 70-80% — leave room for natural variance",
          "Set resource requests accurately: run for 1 week, use p95 of actual CPU as request",
          "Use multiple metrics (CPU + RPS) so no single spike drives scaling",
        ],
        config: `# Anti-flapping HPA configuration
behavior:
  scaleDown:
    stabilizationWindowSeconds: 300   # must be above threshold for 5min to scale down
    policies:
      - type: Pods
        value: 2            # remove at most 2 pods at a time
        periodSeconds: 120  # no more than once every 2 minutes
  scaleUp:
    stabilizationWindowSeconds: 30    # small window for scale-up
    policies:
      - type: Percent
        value: 50           # add 50% more pods at a time
        periodSeconds: 60`,
      },
      {
        id: 3,
        severity: "P2",
        title: "HPA not scaling — stuck at minReplicas despite high load",
        tags: ["HPA", "Metrics Server", "Debugging"],
        alert: "CPU alerts firing at 90%+ but HPA shows 3/3 replicas (min=3, max=20). Condition shows 'unable to fetch metrics'. Application response time degrading.",
        triage: [
          { title: "Check HPA Conditions", content: "kubectl describe hpa api-hpa -n production. Look at 'Conditions' section. Common issues: AbleToScale=False, ScalingActive=False with message 'unable to fetch metrics from resource metrics API'." },
          { title: "Check Metrics Server", content: "kubectl top pods -n production. If this fails with 'Metrics API not available', Metrics Server is down or not installed. This breaks HPA entirely." },
          { title: "Check for Resource Limits Missing", content: "HPA CPU utilization requires resource requests to be set on all pods. If any pod is missing cpu request, HPA cannot calculate % utilization and will not scale." },
        ],
        commands: `# Check HPA conditions in detail
kubectl describe hpa api-hpa -n production

# Typical broken output:
# Conditions:
#   AbleToScale    True   ScaleDownStabilized
#   ScalingActive  False  FailedGetScale
#   Message: the HPA was unable to compute the replica count:
#            unable to get metrics for resource cpu: ...

# Check if metrics-server is running
kubectl get pods -n kube-system | grep metrics-server
kubectl top nodes    # fails if metrics-server is down
kubectl top pods -n production

# Reinstall metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Check resource requests are set
kubectl get pods -n production -o json | \\
  jq '.items[].spec.containers[].resources.requests'

# Verify HPA can read the metric directly
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/production/pods`,
        rootCauses: [
          "Metrics Server not installed or crashed",
          "Pod resource requests (cpu) not set — HPA can't calculate % utilization",
          "Custom metrics adapter (Prometheus Adapter) down — custom metric HPA fails",
          "RBAC: HPA service account lacks permission to read metrics API",
          "maxReplicas already reached (less obvious — looks like stuck)",
        ],
        prevention: [
          "Always set cpu/memory requests on every container — it's also a scheduling requirement",
          "Monitor Metrics Server health with an alert: kube_pod_status_ready{pod=~'metrics-server.*'} == 0",
          "Test HPA in staging with load tests before production deployment",
        ],
      },
    ],
  },
  {
    id: "cluster-autoscaler",
    name: "Cluster Autoscaler",
    icon: "🖥️",
    color: "#10B981",
    desc: "Node-level autoscaling: pending pods, slow scale-up, over-provisioning, and node group issues.",
    scenarios: [
      {
        id: 4,
        severity: "P2",
        title: "Pods stuck Pending — Cluster Autoscaler not adding nodes",
        tags: ["Cluster Autoscaler", "Pending Pods", "Node Groups"],
        alert: "kubectl get pods shows 15 pods in Pending state for 10+ minutes. New deployment is not coming up. kubectl describe pod shows 'Insufficient cpu' or 'no nodes available to schedule pods'.",
        triage: [
          { title: "Confirm Insufficient Resources", content: "kubectl describe pod <pending-pod> — look at Events section. 'Insufficient cpu/memory' means scheduler can't find a node with enough free resources. 'no nodes matched node selector' means selector/taint issue." },
          { title: "Check Cluster Autoscaler Logs", content: "kubectl logs -n kube-system deployment/cluster-autoscaler --tail=100 | grep -E 'scale|expand|error'. CA logs will show if it's trying to add nodes and what's blocking it." },
          { title: "Check ASG Limits", content: "In AWS: EC2 → Auto Scaling Groups → find your node group ASG → check Desired vs Max capacity. If Desired = Max, CA cannot add more nodes. You need to increase the ASG max." },
          { title: "Check for Scale-Up Blockers", content: "CA will NOT scale up if: (1) pod has PodAntiAffinity that can't be satisfied, (2) pod requests more than instance type can provide, (3) pod has a nodeSelector that no available instance type matches." },
        ],
        commands: `# Check pending pods and their reason
kubectl get pods -A | grep Pending
kubectl describe pod <pending-pod-name> -n production | grep -A 20 Events

# Check CA logs for scaling decisions
kubectl logs -n kube-system -l app=cluster-autoscaler --tail=200 | \\
  grep -E "scale-up|expanding|failed|error|node group"

# Check ASG limits (AWS CLI)
aws autoscaling describe-auto-scaling-groups \\
  --query 'AutoScalingGroups[?contains(Tags[?Key==\`k8s.io/cluster-autoscaler\`].Value, \`owned\`)].{Name:AutoScalingGroupName, Min:MinSize, Max:MaxSize, Desired:DesiredCapacity}'

# Check node capacity
kubectl describe nodes | grep -A 5 "Allocated resources"

# Force CA to re-evaluate (delete CA pod to restart)
kubectl rollout restart deployment/cluster-autoscaler -n kube-system

# Check CA status ConfigMap
kubectl get configmap cluster-autoscaler-status -n kube-system -o yaml`,
        rootCauses: [
          "ASG max capacity reached — CA cannot add more nodes than the ASG max allows",
          "AWS service limit hit — EC2 instance quota exhausted in the region/AZ",
          "Pod requests exceed largest instance type in node group (can never schedule)",
          "Node selector or taint/toleration mismatch — no node group can satisfy pod",
          "CA is disabled or misconfigured — wrong annotation on deployment",
          "PodAntiAffinity requiring one pod per node, but more pods than nodes",
        ],
        prevention: [
          "Set ASG max generously — cost control via quotas/budgets, not ASG max",
          "Request EC2 quota increases proactively in AWS before you need them",
          "Use Karpenter instead of CA — provisions right-sized nodes on demand, no ASG groups needed",
          "Implement Cluster Overprovisioner: dummy low-priority pods reserve node capacity for fast scale-up",
        ],
        config: `# Cluster Autoscaler deployment annotation (critical)
kubectl -n kube-system annotate deployment cluster-autoscaler \\
  cluster-autoscaler.kubernetes.io/safe-to-evict=false

# CA flags to tune:
# --scale-down-delay-after-add=10m     (default: don't scale down for 10min after scale-up)
# --scale-down-unneeded-time=10m       (node must be unneeded for 10min before removal)
# --max-node-provision-time=15m        (give up waiting for node after 15min)
# --balance-similar-node-groups=true   (spread across AZs)

# Overprovisioner: placeholder pods that get evicted when real pods arrive
apiVersion: apps/v1
kind: Deployment
metadata:
  name: overprovisioner
  namespace: kube-system
spec:
  replicas: 3       # 3 warm node reservations
  template:
    spec:
      priorityClassName: cluster-overprovisioner   # low priority
      containers:
        - name: pause
          image: k8s.gcr.io/pause:3.9
          resources:
            requests:
              cpu: "1"          # reserves 1 CPU on a node
              memory: "2Gi"     # reserves 2GB — tune to your pod sizes`,
      },
      {
        id: 5,
        severity: "P3",
        title: "Cluster Autoscaler scaling down nodes too aggressively — pods evicted",
        tags: ["Cluster Autoscaler", "Scale-Down", "PDB", "Eviction"],
        alert: "Monitoring shows periodic latency spikes every 10 minutes. Logs show pods being evicted and rescheduled. StatefulSet pods being disrupted. CA is removing nodes with running pods.",
        triage: [
          { title: "Confirm CA is Evicting", content: "kubectl get events -A | grep Evicted. kubectl logs -n kube-system deployment/cluster-autoscaler | grep 'removing node'. Correlate timestamps with latency spikes." },
          { title: "Check PodDisruptionBudgets", content: "kubectl get pdb -A. If no PDB exists for a deployment, CA can evict all its pods simultaneously during node removal. PDB is CA's signal to be careful." },
          { title: "Identify Unmoveable Pods", content: "CA skips node removal if it contains: pods with no controller (bare pods), pods with PDB that would be violated, pods with local storage, or pods with safe-to-evict=false annotation." },
        ],
        commands: `# Check CA scale-down log
kubectl logs -n kube-system deployment/cluster-autoscaler --tail=200 | \\
  grep -E "scale-down|removing|evict"

# Check eviction events
kubectl get events -A --field-selector reason=Evicted \\
  --sort-by=.lastTimestamp | tail -20

# See which nodes CA considers for removal
kubectl logs -n kube-system deployment/cluster-autoscaler | \\
  grep "is unneeded"

# Check existing PDBs
kubectl get pdb -A

# Annotate pod to prevent CA eviction
kubectl annotate pod <pod-name> \\
  cluster-autoscaler.kubernetes.io/safe-to-evict=false

# Check for pods blocking node removal
kubectl logs -n kube-system deployment/cluster-autoscaler | \\
  grep "not eligible for scale down"`,
        rootCauses: [
          "No PodDisruptionBudgets — CA evicts pods without respecting minimum availability",
          "scale-down-unneeded-time too short — nodes removed before traffic resumes",
          "StatefulSet pods being disrupted without proper PDB",
          "scale-down-utilization-threshold too high — removes nodes that still have useful pods",
        ],
        prevention: [
          "Add PDB to every production Deployment and StatefulSet — this is CA's primary safety mechanism",
          "Annotate pods that must not be evicted with safe-to-evict=false",
          "Increase --scale-down-unneeded-time to 15-20min for less aggressive removal",
          "Use --scale-down-utilization-threshold=0.5 (default) — don't raise it too high",
        ],
        config: `# PDB for every production workload
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
  namespace: production
spec:
  minAvailable: 2        # always keep at least 2 pods running
  selector:
    matchLabels:
      app: api

# CA scale-down tuning
--scale-down-unneeded-time=15m         # conservative: must be unneeded for 15min
--scale-down-utilization-threshold=0.4 # remove nodes using < 40% capacity
--scale-down-delay-after-failure=3m    # back off after failed scale-down`,
      },
    ],
  },
  {
    id: "keda",
    name: "KEDA Scenarios",
    icon: "⚡",
    color: "#A78BFA",
    desc: "Event-driven autoscaling: scaling from SQS, Kafka, cron schedules, and scale-to-zero patterns.",
    scenarios: [
      {
        id: 6,
        severity: "P2",
        title: "SQS queue depth growing — KEDA not scaling workers",
        tags: ["KEDA", "SQS", "Queue Backlog"],
        alert: "CloudWatch: SQS ApproximateNumberOfMessagesVisible growing rapidly (1 → 50,000 messages in 20 minutes). Worker deployment stuck at 1 replica. Queue processing delay now at 4 hours.",
        triage: [
          { title: "Check ScaledObject Status", content: "kubectl describe scaledobject sqs-worker-scaler -n production. Look at 'Conditions' — is KEDA active? Is the trigger fetching the queue metric? Check for auth errors." },
          { title: "Check KEDA Operator Logs", content: "kubectl logs -n keda deployment/keda-operator --tail=100. KEDA logs will show if it's successfully reading SQS queue depth and why it's not triggering scale-up." },
          { title: "Verify AWS Permissions", content: "KEDA needs sqs:GetQueueAttributes and sqs:GetQueueUrl on the queue. If using IRSA, check the KEDA service account annotation and IAM role trust policy." },
          { title: "Check TriggerAuthentication", content: "kubectl describe triggerauthentication keda-aws-auth -n production. Verify the secret reference or IRSA annotation is correct. A bad auth config silently prevents scaling." },
        ],
        commands: `# Check KEDA ScaledObject status
kubectl describe scaledobject sqs-worker-scaler -n production

# Check KEDA operator logs
kubectl logs -n keda deployment/keda-operator --tail=200 | \\
  grep -E "error|warn|sqs|scale"

# Check if KEDA metrics server is working
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1" | jq .

# Check SQS queue depth manually
aws sqs get-queue-attributes \\
  --queue-url https://sqs.us-east-1.amazonaws.com/123456/my-queue \\
  --attribute-names ApproximateNumberOfMessages

# Check TriggerAuthentication
kubectl describe triggerauthentication keda-aws-auth -n production

# Check ScaledObject is reconciled
kubectl get scaledobjects -n production -o wide

# Temporarily override and manually scale
kubectl scale deployment sqs-worker --replicas=20 -n production
# Note: KEDA will take control back within 30s — only works as brief emergency fix
# Better: fix the KEDA config, then let it scale naturally`,
        rootCauses: [
          "KEDA TriggerAuthentication misconfigured — can't authenticate to AWS SQS API",
          "IAM role missing sqs:GetQueueAttributes permission",
          "KEDA operator crashed or unhealthy",
          "Wrong queue URL in ScaledObject trigger config",
          "maxReplicaCount set too low for the queue depth",
          "KEDA metrics server (keda-metrics-apiserver) down — HPA can't read external metrics",
        ],
        prevention: [
          "Test KEDA scaling in staging with synthetic queue load before production",
          "Monitor KEDA operator health with alerting on pod restarts",
          "Set maxReplicaCount based on your queue throughput at peak, not average",
          "Use cooldownPeriod carefully — too long means slow response to new bursts",
        ],
        config: `# Complete KEDA SQS setup with IRSA
apiVersion: v1
kind: ServiceAccount
metadata:
  name: keda-sqs-sa
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456:role/KEDASQSRole

---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-aws-auth
  namespace: production
spec:
  podIdentity:
    provider: aws-eks    # uses IRSA

---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: sqs-worker-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: sqs-worker
  minReplicaCount: 0      # scale to zero when queue empty
  maxReplicaCount: 100
  cooldownPeriod: 60      # wait 60s before scaling down after queue drains
  triggers:
    - type: aws-sqs-queue
      authenticationRef:
        name: keda-aws-auth
      metadata:
        queueURL: https://sqs.us-east-1.amazonaws.com/123456/my-queue
        queueLength: "5"        # 1 pod per 5 messages
        awsRegion: us-east-1
        scaleOnInFlight: "true" # count in-flight messages too`,
      },
      {
        id: 7,
        severity: "P3",
        title: "Scale-to-zero cold start delay causing request timeouts",
        tags: ["KEDA", "Scale-to-Zero", "Cold Start"],
        alert: "Users report the first request after idle periods takes 30-60 seconds or times out. KEDA logs show pod scaling from 0 → 1 on first event. Ingress timeout is 30s.",
        triage: [
          { title: "Confirm Scale-to-Zero Is the Cause", content: "Check kubectl get pods -n production — is the deployment at 0 replicas? Check KEDA ScaledObject: minReplicaCount: 0. The cold start delay = time to schedule pod + pull image + pass readiness probe." },
          { title: "Measure Cold Start Time", content: "Time from 'kubectl scale --replicas=1' to pod Ready. Break it down: scheduling (1-5s), image pull (5-30s if not cached), app startup (varies). Image pull is usually the biggest factor." },
          { title: "Decide: Is Scale-to-Zero Right Here?", content: "Scale-to-zero is great for batch workers and event processors. It's problematic for user-facing APIs with strict latency SLAs. Consider minReplicaCount: 1 for user-facing services." },
        ],
        commands: `# Check current replica count
kubectl get deployment sqs-worker -n production
kubectl get scaledobject sqs-worker-scaler -n production

# Measure pod startup time
TIME_START=$(date +%s)
kubectl scale deployment sqs-worker --replicas=1 -n production
kubectl wait --for=condition=ready pod -l app=sqs-worker -n production --timeout=120s
TIME_END=$(date +%s)
echo "Cold start: $((TIME_END - TIME_START)) seconds"

# Check image pull time (look at Events)
kubectl describe pod -l app=sqs-worker -n production | grep -A 5 "Pulling image"

# Pre-pull images on nodes with DaemonSet to eliminate pull time
# Or use kube-image-puller / image pre-puller

# Check readiness probe timing
kubectl describe pod -l app=sqs-worker -n production | grep -A 10 "Readiness"`,
        rootCauses: [
          "minReplicaCount: 0 on user-facing service — cold start on every idle period",
          "Large container image (1GB+) causes long image pull time",
          "App startup time too long (JVM warm-up, database connection pool init)",
          "Readiness probe initialDelaySeconds too high",
          "Node cold start: Cluster Autoscaler also needs to add a node first",
        ],
        prevention: [
          "Use minReplicaCount: 1 for user-facing APIs — only use 0 for background workers",
          "Optimize image size: multi-stage builds, Alpine base, remove dev dependencies",
          "Pre-pull images with a DaemonSet so they're always cached on nodes",
          "Use startupProbe to allow slow start without hurting readiness probe cadence",
          "For truly serverless workloads, use AWS Lambda instead of scale-to-zero pods",
        ],
      },
      {
        id: 8,
        severity: "P3",
        title: "Kafka consumer lag — KEDA not keeping up with partition count",
        tags: ["KEDA", "Kafka", "Consumer Lag", "Partitions"],
        alert: "Grafana: Kafka consumer group lag growing — 500k messages behind, increasing. KEDA scaled to 10 workers but Kafka topic has 30 partitions. Throughput plateau hit.",
        triage: [
          { title: "Understand the Kafka Constraint", content: "In Kafka, maximum consumer parallelism = number of partitions. If topic has 30 partitions, you can have at most 30 active consumers in the same group. Extra consumers will sit idle." },
          { title: "Check KEDA Lag Trigger Config", content: "kubectl describe scaledobject kafka-worker-scaler. Is lagThreshold set appropriately? A lagThreshold of 50 with 500k messages = 10,000 pods requested, but maxReplicaCount caps it." },
          { title: "Check Consumer Throughput", content: "Is each consumer processing at maximum speed? Check CPU/memory. If consumers are CPU-bound, adding more doesn't help beyond partition count. Profile the consumer code." },
        ],
        commands: `# Check Kafka consumer group lag (using kafka-consumer-groups)
kafka-consumer-groups.sh \\
  --bootstrap-server kafka:9092 \\
  --describe \\
  --group order-processor

# KEDA ScaledObject for Kafka
kubectl describe scaledobject kafka-worker-scaler -n production

# Check how many consumers are active
kubectl get pods -n production -l app=kafka-worker | wc -l

# Check Kafka topic partition count
kafka-topics.sh --bootstrap-server kafka:9092 \\
  --describe --topic orders | grep PartitionCount

# If maxReplicas < partitions, raise it
kubectl patch scaledobject kafka-worker-scaler -n production \\
  --type='json' \\
  -p='[{"op":"replace","path":"/spec/maxReplicaCount","value":30}]'

# Monitor lag in Prometheus (if kafka-exporter installed)
kafka_consumergroup_lag_sum{consumergroup="order-processor"}`,
        rootCauses: [
          "maxReplicaCount less than partition count — KEDA can't scale enough consumers",
          "Consumer is single-threaded and CPU-bound — needs code optimization",
          "lagThreshold too low — KEDA under-estimates needed replicas",
          "Topic partition count too low — cap on parallelism",
        ],
        prevention: [
          "Set maxReplicaCount >= partition count in KEDA ScaledObject",
          "Size partition count based on peak expected consumers when creating topic",
          "Monitor lag as a time metric (seconds of lag) not just message count — more actionable",
          "Consider increasing Kafka topic partitions (can be increased, not decreased)",
        ],
        config: `# KEDA Kafka trigger — properly sized
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-worker-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: kafka-worker
  minReplicaCount: 1
  maxReplicaCount: 30     # match partition count
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka-headless.kafka:9092
        consumerGroup: order-processor
        topic: orders
        lagThreshold: "100"       # 1 pod per 100 messages of lag
        offsetResetPolicy: latest`,
      },
    ],
  },
  {
    id: "vpa",
    name: "VPA Scenarios",
    icon: "📐",
    color: "#F59E0B",
    desc: "Vertical Pod Autoscaler: right-sizing containers, OOMKilled pods, and resource recommendation workflows.",
    scenarios: [
      {
        id: 9,
        severity: "P3",
        title: "Pods OOMKilled repeatedly — memory limits set too low",
        tags: ["VPA", "OOMKilled", "Memory Limits"],
        alert: "kubectl get pods shows restart count climbing. kubectl describe pod shows Last State: OOMKilled. Memory usage graphs show pod hitting limit and being killed. CrashLoopBackOff imminent.",
        triage: [
          { title: "Confirm OOMKill", content: "kubectl describe pod <pod> — look for 'Last State: Terminated, Reason: OOMKilled'. Also: kubectl get events -n production | grep OOMKilling. The container hit its memory limit and the kernel killed it." },
          { title: "Check Current vs Actual Usage", content: "kubectl top pods -n production -- compare current usage to limits. If usage is 450Mi and limit is 512Mi you're running dangerously close. For JVM apps, also check heap + metaspace + native memory." },
          { title: "Immediate Fix", content: "kubectl edit deployment <name> and raise memory limit. Or use kubectl set resources. Don't set it to exact peak — add 30-50% headroom for spikes." },
        ],
        commands: `# Confirm OOMKill
kubectl describe pod <pod-name> -n production | grep -A 5 "Last State"
# Output: Reason: OOMKilled, Exit Code: 137

# Check memory usage vs limits
kubectl top pods -n production
kubectl describe pod <pod> | grep -A 10 "Limits"

# Raise limits immediately
kubectl set resources deployment api \\
  -n production \\
  --limits=memory=1Gi \\
  --requests=memory=512Mi

# Install VPA for recommendations
kubectl apply -f https://github.com/kubernetes/autoscaler/raw/master/vertical-pod-autoscaler/hack/vpa-up.sh

# Create VPA in Recommendation mode (no auto-apply)
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  updatePolicy:
    updateMode: "Off"    # just recommend, don't change pods

# Check VPA recommendations after 24h
kubectl describe vpa api-vpa -n production
# Look for:
# Container Recommendations:
#   Container Name: api
#   Lower Bound:   cpu: 50m, memory: 300Mi
#   Target:        cpu: 200m, memory: 600Mi
#   Upper Bound:   cpu: 500m, memory: 1Gi`,
        rootCauses: [
          "Memory limits set too low based on guesswork rather than actual measurement",
          "Application memory leak — usage grows over time until OOMKilled",
          "JVM heap not configured — JVM defaults to 25% of node RAM, ignores container limits",
          "Traffic spike causes higher memory usage than baseline",
          "Missing requests/limits causes QoS class = BestEffort, first to be killed under pressure",
        ],
        prevention: [
          "Use VPA in Recommendation mode for 7-14 days, then apply suggested values",
          "For JVM: set -Xmx to 70% of container memory limit to leave room for native memory",
          "Set memory request = 70% of limit (not equal) to leave headroom",
          "Alert when memory usage > 80% of limit — fix proactively before OOMKill",
        ],
        config: `# VPA in Auto mode — use cautiously (restarts pods to apply changes)
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  updatePolicy:
    updateMode: "Auto"     # auto-apply (restarts pods)
  resourcePolicy:
    containerPolicies:
      - containerName: api
        minAllowed:
          cpu: 100m
          memory: 256Mi
        maxAllowed:
          cpu: "4"
          memory: 4Gi
        controlledResources: ["cpu", "memory"]

# VPA modes:
# Off         → recommendations only, no changes
# Initial     → set on pod creation only, no restarts
# Recreate    → evict and recreate pods to apply
# Auto        → same as Recreate currently`,
      },
    ],
  },
  {
    id: "cost",
    name: "Cost Optimization",
    icon: "💰",
    color: "#F43F5E",
    desc: "Scaling-related cost scenarios: over-provisioning, Spot instances, right-sizing, and waste elimination.",
    scenarios: [
      {
        id: 10,
        severity: "P3",
        title: "AWS bill 3x higher than expected — cluster massively over-provisioned",
        tags: ["Cost", "Over-Provisioning", "Right-Sizing"],
        alert: "FinOps team flags: EKS cluster running 50 m5.4xlarge nodes at $8,640/month. kubectl top nodes shows average node utilization at 15% CPU, 20% memory. Estimated waste: $7,000+/month.",
        triage: [
          { title: "Measure Actual Utilization", content: "kubectl top nodes for real-time. In Grafana: plot sum(container_cpu_usage_seconds_total) / sum(kube_node_status_capacity_cpu_cores) * 100 over 2 weeks to get true average. Include memory too." },
          { title: "Find Over-Requested Workloads", content: "VPA recommendations will show pods with requests >> actual usage. kubectl top pods -A --sort-by=cpu then compare to kubectl get pods -o json | jq '.items[].spec.containers[].resources.requests.cpu'. Big gaps = waste." },
          { title: "Identify Idle/Dev Workloads", content: "Are staging/dev namespaces running 24/7 on production-grade nodes? Are there old deployments nobody is using? kubectl get deployments -A and check last deployment times." },
        ],
        commands: `# Cluster-wide resource utilization
kubectl top nodes
kubectl resource-capacity   # if kube-capacity plugin installed

# Over-requested pods (requests >> actual)
kubectl top pods -A --sort-by=cpu | head -20

# Find unused deployments (0 replicas or very old)
kubectl get deployments -A | grep " 0 "

# Goldilocks — VPA-based right-sizing UI
kubectl apply -f https://github.com/FairwindsOps/goldilocks/releases/latest/download/goldilocks.yaml
kubectl label namespace production goldilocks.fairwinds.com/enabled=true

# After 24h, check recommendations:
kubectl port-forward svc/goldilocks-dashboard 8080:80 -n goldilocks

# Cost analysis with kubecost
helm install kubecost kubecost/cost-analyzer \\
  --namespace kubecost --create-namespace

# Quick cost summary
kubectl cost namespace --show-all-resources

# Rightsizing: move to smaller instance types
# 50x m5.4xlarge (16 CPU, 64GB) → 25x m5.2xlarge (8 CPU, 32GB)
# if avg utilization is 15%, you only need ~8 CPUs per node effective`,
        rootCauses: [
          "Resource requests set too high out of caution — never tuned to actual usage",
          "No VPA or right-sizing process — original estimates never revisited",
          "Dev/staging running 24/7 on same node types as production",
          "minReplicas set too high — unnecessary baseline capacity",
          "No scale-down on weekends/nights for non-production workloads",
        ],
        prevention: [
          "Run Goldilocks or VPA recommendations monthly as a regular right-sizing review",
          "Use Kubecost or AWS Cost Explorer per-namespace to assign cost accountability to teams",
          "Schedule dev/staging to scale to 0 overnight: kubectl scale --replicas=0 via CronJob",
          "Use Spot/Preemptible instances for stateless workloads (60-90% cheaper)",
          "Set up AWS Compute Optimizer + EKS integration for node right-sizing suggestions",
        ],
        config: `# CronJob: scale down dev cluster overnight
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-down-dev
  namespace: kube-system
spec:
  schedule: "0 20 * * 1-5"   # 8pm weekdays
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: scaler-sa
          containers:
            - name: kubectl
              image: bitnami/kubectl
              command:
                - /bin/sh
                - -c
                - |
                  kubectl scale deployment --all --replicas=0 -n staging
                  kubectl scale deployment --all --replicas=0 -n dev
          restartPolicy: OnFailure

---
# Scale back up at 8am
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-up-dev
  namespace: kube-system
spec:
  schedule: "0 8 * * 1-5"    # 8am weekdays
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: scaler-sa
          containers:
            - name: kubectl
              image: bitnami/kubectl
              command:
                - /bin/sh
                - -c
                - |
                  kubectl scale deployment --all --replicas=2 -n staging
                  kubectl scale deployment --all --replicas=1 -n dev
          restartPolicy: OnFailure`,
      },
      {
        id: 11,
        severity: "P2",
        title: "Spot instance interruptions causing pod disruption",
        tags: ["Spot Instances", "Karpenter", "Interruption", "Cost"],
        alert: "AWS sends Spot interruption notice. Karpenter starts draining node. Pods evict. Some pods can't reschedule — PV stuck on old node. Service latency spikes during 2-min interruption window.",
        triage: [
          { title: "Understand the Timeline", content: "AWS sends a 2-minute interruption notice to the instance via instance metadata. Karpenter/Node Termination Handler intercepts this, cordons the node, and triggers graceful pod drain within the 2-minute window." },
          { title: "Check Node Termination Handler", content: "kubectl get pods -n kube-system | grep node-termination-handler. Is it running on every node? Check its logs for interruption events. If not installed, pods get hard-killed without graceful shutdown." },
          { title: "Handle PV Stuck Issue", content: "PVs with ReadWriteOnce are tied to a single AZ. If the Spot node in us-east-1a is interrupted, PV in us-east-1a can't attach to a replacement pod in us-east-1b. Use multi-AZ EFS or design stateless pods." },
        ],
        commands: `# Install Node Termination Handler (handles Spot interruptions gracefully)
helm install aws-node-termination-handler \\
  eks/aws-node-termination-handler \\
  --namespace kube-system \\
  --set enableSpotInterruptionDraining=true \\
  --set enableScheduledEventDraining=true

# Check NTH logs for interruption events
kubectl logs -n kube-system -l app=aws-node-termination-handler --tail=50

# Karpenter: use diverse instance types to reduce interruption risk
# Karpenter NodePool with multiple instance types
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: spot-pool
spec:
  template:
    spec:
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]   # fallback to on-demand
        - key: node.kubernetes.io/instance-type
          operator: In
          values:
            - m5.xlarge
            - m5a.xlarge
            - m4.xlarge
            - m5d.xlarge
            - m5n.xlarge    # many types = lower interruption rate

# Check Spot interruption frequency by type
# Use Spot Instance Advisor: spot-price.s3.amazonaws.com/spot.js`,
        rootCauses: [
          "Node Termination Handler not installed — no graceful drain on interruption",
          "Only one Spot instance type configured — higher interruption risk",
          "PodDisruptionBudget too strict — drain blocked, pods hard-killed at 2-min mark",
          "Stateful workloads on Spot with RWO PVs — can't reschedule to different AZ",
          "No on-demand fallback — if Spot pool dry, pods can't schedule",
        ],
        prevention: [
          "Run stateful/database workloads on on-demand nodes, use Spot only for stateless",
          "Configure 5-10 diverse instance families — Spot pools with more types have lower interruption rate",
          "Use Karpenter instead of Cluster Autoscaler — better Spot handling with consolidation",
          "Set terminationGracePeriodSeconds: 90 to allow graceful shutdown within the 2-min window",
        ],
      },
    ],
  },
  {
    id: "multi",
    name: "Multi-Dimensional Scaling",
    icon: "🎯",
    color: "#06B6D4",
    desc: "Complex scenarios combining HPA + CA + KEDA + VPA together.",
    scenarios: [
      {
        id: 12,
        severity: "P1",
        title: "Flash sale: 100x traffic spike — end-to-end scaling strategy",
        tags: ["HPA", "Cluster Autoscaler", "Pre-scaling", "Flash Sale"],
        alert: "Marketing: 'Flash sale goes live in 30 minutes, expecting 100x normal traffic.' Engineering: last flash sale took 12 minutes before cluster stabilized and latency normalized. Need a better plan.",
        triage: [
          { title: "Pre-Scale Application Tier", content: "Don't wait for HPA. kubectl scale all critical deployments to expected peak replicas 15 minutes before launch. HPA takes over once traffic arrives and metrics stabilize." },
          { title: "Pre-Scale Node Pool", content: "Cluster Autoscaler takes 3-5 minutes to provision nodes. Pre-provision warm nodes using placeholder overprovisioner pods, or manually scale the ASG: aws autoscaling set-desired-capacity." },
          { title: "Disable Scale-Down", content: "Temporarily raise HPA minReplicas and CA scale-down delay to prevent scale-down between traffic waves during the sale window." },
          { title: "Verify Dependencies", content: "Check RDS max_connections, ElastiCache connection limits, any external rate limits. Scale RDS read replicas if needed. Connection pooling (PgBouncer) is critical at high scale." },
          { title: "Monitor and Be Ready to Act", content: "Have kubectl scale commands ready. Have rollback commands ready. Have the on-call team on a call. Watch P99 latency and error rate — not just CPU." },
        ],
        commands: `# 30 minutes before: pre-scale everything
# 1. Scale application pods
kubectl scale deployment api --replicas=50 -n production
kubectl scale deployment worker --replicas=20 -n production
kubectl scale deployment frontend --replicas=30 -n production

# 2. Scale node group (ASG)
aws autoscaling set-desired-capacity \\
  --auto-scaling-group-name eks-production-nodes \\
  --desired-capacity 30

# 3. Raise HPA minReplicas for sale window
kubectl patch hpa api-hpa -n production \\
  -p '{"spec":{"minReplicas":50}}'

# 4. Disable HPA scale-down during sale (raise stabilization)
kubectl patch hpa api-hpa -n production --type='merge' -p='{
  "spec": {
    "behavior": {
      "scaleDown": {
        "stabilizationWindowSeconds": 3600
      }
    }
  }
}'

# 5. Verify all pods are Running and Ready
kubectl get pods -n production | grep -v Running
kubectl wait --for=condition=ready pod --all -n production --timeout=300s

# During sale: watch key metrics
watch -n 10 "kubectl top pods -n production --sort-by=cpu | head -20"

# After sale: restore normal config
kubectl patch hpa api-hpa -n production \\
  -p '{"spec":{"minReplicas":5}}'`,
        rootCauses: [
          "Reactive-only scaling — HPA/CA can't provision fast enough for instant spikes",
          "No pre-scaling playbook — every flash sale is a fire drill",
          "Forgot to scale dependencies (RDS, Redis, external APIs hit rate limits)",
          "Scale-down between traffic waves — cluster shrinks and can't re-scale fast enough",
        ],
        prevention: [
          "Create a pre-scaling runbook and automate it as a script or Ansible playbook",
          "Load test regularly at 2-3x expected peak to validate scaling behavior",
          "Set up predictive scaling: if marketing can tell you traffic times, automate ASG pre-scaling with a Lambda on a schedule",
          "Use AWS Application Auto Scaling with scheduled actions for known traffic patterns",
        ],
        config: `# Predictive scaling with scheduled ASG action (AWS)
aws autoscaling put-scheduled-update-group-action \\
  --auto-scaling-group-name eks-production-nodes \\
  --scheduled-action-name flash-sale-scale-up \\
  --start-time "2026-03-20T09:45:00Z" \\
  --desired-capacity 30 \\
  --min-size 20

aws autoscaling put-scheduled-update-group-action \\
  --auto-scaling-group-name eks-production-nodes \\
  --scheduled-action-name flash-sale-scale-down \\
  --start-time "2026-03-20T14:00:00Z" \\
  --desired-capacity 10 \\
  --min-size 5

# KEDA CronScaler — scale on schedule
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: flash-sale-scaler
spec:
  scaleTargetRef:
    name: api
  triggers:
    - type: cron
      metadata:
        timezone: America/New_York
        start: 45 9 * * *    # 9:45am
        end: 0 14 * * *      # 2:00pm
        desiredReplicas: "50"`,
      },
      {
        id: 13,
        severity: "P2",
        title: "HPA and VPA conflict — pods restarting constantly",
        tags: ["HPA", "VPA", "Conflict", "Anti-Pattern"],
        alert: "Pod restart count climbing. kubectl describe pod shows both VPA mutating admission and HPA scaling events. VPA is evicting pods to change resources; HPA is trying to maintain replica count. Pods in a restart loop.",
        triage: [
          { title: "Understand the Conflict", content: "VPA in Auto mode evicts pods to apply new resource values. HPA sees fewer replicas and scales up. New pods get VPA-mutated resources. This cycle can loop. HPA and VPA on the same resource (CPU) is explicitly anti-pattern." },
          { title: "Immediate Fix", content: "Set VPA to Off or Initial mode to stop evictions. kubectl patch vpa api-vpa --type='json' -p='[{op: replace, path: /spec/updatePolicy/updateMode, value: Off}]'" },
          { title: "Proper Split", content: "HPA should own CPU/memory scaling (horizontal). VPA should only manage resources HPA doesn't use. Best: use HPA for CPU, VPA for memory only. Or: use HPA exclusively and get VPA recommendations manually." },
        ],
        commands: `# Check both HPA and VPA exist on same deployment
kubectl get hpa -n production
kubectl get vpa -n production

# Check VPA is causing restarts
kubectl describe vpa api-vpa -n production | grep "Update Mode"
kubectl get events -n production | grep -E "VPA|VerticalPodAutoscaler"

# Stop VPA evictions immediately
kubectl patch vpa api-vpa -n production --type='merge' -p='{
  "spec": {"updatePolicy": {"updateMode": "Off"}}
}'

# Get VPA recommendation to apply manually
kubectl describe vpa api-vpa -n production | grep -A 20 "Recommendation"

# Apply recommendation to deployment manually
kubectl set resources deployment api -n production \\
  --requests=cpu=200m,memory=512Mi \\
  --limits=cpu=1,memory=1Gi`,
        rootCauses: [
          "VPA in Auto mode on same deployment as HPA with CPU metric — direct conflict",
          "VPA evicts pods to resize them; HPA immediately scales back up; loop continues",
        ],
        prevention: [
          "Never run VPA Auto mode on deployments managed by HPA with CPU target",
          "Use VPA Off/Initial mode to get recommendations, apply them manually to the manifest",
          "If using both: configure HPA on custom metrics (RPS), VPA on CPU/memory — no overlap",
          "Goldilocks tool shows VPA recommendations without enabling Auto mode — safest approach",
        ],
        config: `# Safe HPA + VPA combination:
# HPA: scales on RPS (custom metric, not CPU)
# VPA: manages CPU/memory requests (Off mode, just recommendations)

# HPA on custom metric (not CPU)
metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "500"

# VPA in recommendation-only mode
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  updatePolicy:
    updateMode: "Off"     # NEVER Auto when HPA is active on CPU`,
      },
    ],
  },
];

export default function AutoscalingScenarios() {
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [expandedScenario, setExpandedScenario] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  const toggleSection = (key) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const cat = categories.find((c) => c.id === activeCategory);

  const filteredCategories = searchTerm
    ? categories.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.scenarios.some(
            (s) =>
              s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              s.tags.some((t) =>
                t.toLowerCase().includes(searchTerm.toLowerCase())
              )
          )
      )
    : categories;

  const displayedScenarios = searchTerm
    ? cat.scenarios.filter(
        (s) =>
          s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.tags.some((t) =>
            t.toLowerCase().includes(searchTerm.toLowerCase())
          )
      )
    : cat.scenarios;

  const severityColor = { P1: "#EF4444", P2: "#F59E0B", P3: "#3B82F6" };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#080E1A", minHeight: "100vh", color: "#CBD5E1" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(145deg, #0F172A, #130a1f)", borderBottom: "1px solid #1E293B", padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "linear-gradient(135deg, #3B82F6, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📈</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#F1F5F9" }}>Autoscaling Scenarios</h1>
            <p style={{ margin: 0, fontSize: 12, color: "#64748B" }}>HPA · KEDA · Cluster Autoscaler · VPA · Cost Optimization · Real incidents</p>
          </div>
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search scenarios, tags (e.g. 'HPA', 'Kafka', 'Spot')..."
          style={{ width: "100%", padding: "10px 16px", fontSize: 13, fontFamily: "inherit", background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, color: "#E2E8F0", outline: "none", marginTop: 16, boxSizing: "border-box" }}
        />

        <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
          {filteredCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActiveCategory(c.id); setSearchTerm(""); setExpandedScenario(null); }}
              style={{
                padding: "7px 14px", border: activeCategory === c.id ? `2px solid ${c.color}` : "1px solid #1E3A5F",
                borderRadius: 20, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                background: activeCategory === c.id ? c.color + "18" : "#111827",
                color: activeCategory === c.id ? c.color : "#94A3B8", transition: "all 0.2s",
              }}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Category description */}
      {cat && (
        <div style={{ padding: "16px 28px 0", maxWidth: 960, margin: "0 auto" }}>
          <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>{cat.desc}</p>
        </div>
      )}

      {/* Scenarios */}
      <div style={{ padding: "16px 28px 40px", maxWidth: 960, margin: "0 auto" }}>
        {displayedScenarios.map((scenario) => {
          const isOpen = expandedScenario === scenario.id;
          return (
            <div key={scenario.id} style={{ marginBottom: 16, background: "#0F172A", borderRadius: 12, border: `1px solid ${isOpen ? cat.color + "40" : "#1E293B"}`, overflow: "hidden", transition: "border-color 0.2s" }}>
              {/* Scenario header */}
              <button
                onClick={() => setExpandedScenario(isOpen ? null : scenario.id)}
                style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 20px", border: "none", background: isOpen ? cat.color + "08" : "transparent", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 800, background: severityColor[scenario.severity] + "20", color: severityColor[scenario.severity] }}>
                    {scenario.severity}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9", marginBottom: 6 }}>{scenario.title}</div>
                  <div>{scenario.tags.map((t) => <Tag key={t} text={t} color={cat.color} />)}</div>
                </div>
                <span style={{ color: "#475569", fontSize: 12, flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "0.2s", marginTop: 4 }}>▼</span>
              </button>

              {isOpen && (
                <div style={{ borderTop: `1px solid #1E293B` }}>
                  {/* Alert */}
                  <div style={{ padding: "14px 20px", background: "#0d0f1a", borderBottom: "1px solid #1a2030" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#EF4444", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>🚨 Situation</div>
                    <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7 }}>{scenario.alert}</div>
                  </div>

                  {/* Triage steps */}
                  {scenario.triage && (
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #1a2030" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: cat.color, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>🔍 Investigation Steps</div>
                      {scenario.triage.map((step, i) => (
                        <StepBlock key={i} num={i + 1} title={step.title} content={step.content} color={cat.color} />
                      ))}
                    </div>
                  )}

                  {/* Commands */}
                  {scenario.commands && (
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #1a2030" }}>
                      <button
                        onClick={() => toggleSection(`${scenario.id}-cmd`)}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 8 }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#7DD3FC", textTransform: "uppercase", letterSpacing: 1 }}>💻 Commands & Diagnostics</span>
                        <span style={{ color: "#475569", fontSize: 10, transform: expandedSections[`${scenario.id}-cmd`] ? "rotate(180deg)" : "none", transition: "0.2s" }}>▼</span>
                      </button>
                      {expandedSections[`${scenario.id}-cmd`] !== false && (
                        <CmdBlock>{scenario.commands}</CmdBlock>
                      )}
                    </div>
                  )}

                  {/* Config */}
                  {scenario.config && (
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #1a2030" }}>
                      <button
                        onClick={() => toggleSection(`${scenario.id}-cfg`)}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 8 }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#A78BFA", textTransform: "uppercase", letterSpacing: 1 }}>⚙️ Recommended Config</span>
                        <span style={{ color: "#475569", fontSize: 10, transform: expandedSections[`${scenario.id}-cfg`] ? "rotate(180deg)" : "none", transition: "0.2s" }}>▼</span>
                      </button>
                      {expandedSections[`${scenario.id}-cfg`] !== false && (
                        <CmdBlock>{scenario.config}</CmdBlock>
                      )}
                    </div>
                  )}

                  {/* Root causes */}
                  {scenario.rootCauses && (
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #1a2030" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#F59E0B", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>⚠️ Root Causes</div>
                      {scenario.rootCauses.map((cause, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13, color: "#94A3B8", lineHeight: 1.6 }}>
                          <span style={{ color: "#F59E0B", flexShrink: 0 }}>→</span>
                          <span>{cause}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Prevention */}
                  {scenario.prevention && (
                    <div style={{ padding: "14px 20px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#10B981", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>✅ Prevention</div>
                      {scenario.prevention.map((item, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13, color: "#94A3B8", lineHeight: 1.6 }}>
                          <span style={{ color: "#10B981", flexShrink: 0 }}>✓</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
