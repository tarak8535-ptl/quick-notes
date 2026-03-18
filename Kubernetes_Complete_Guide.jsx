import { useState } from "react";

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
    id: "architecture",
    title: "Architecture & Core Concepts",
    icon: "🏛️",
    color: "#3B82F6",
    tags: ["Control Plane", "Nodes", "etcd", "API Server"],
    content: [
      {
        title: "Cluster Architecture Overview",
        body: "Kubernetes follows a master-worker architecture. The control plane manages the cluster state and scheduling decisions, while worker nodes run the actual workloads.",
        subsections: [
          {
            title: "Control Plane Components",
            body: "The control plane consists of several components that together manage the overall state of the cluster.",
            example: `Control Plane Components:
┌─────────────────────────────────────────────────────┐
│                    Control Plane                     │
│                                                     │
│  ┌──────────────┐   ┌──────────────┐               │
│  │  API Server  │   │  Controller  │               │
│  │ (kube-apiserver)│  │   Manager   │               │
│  └──────┬───────┘   └──────┬───────┘               │
│         │                  │                        │
│  ┌──────┴───────┐   ┌──────┴───────┐               │
│  │    etcd      │   │   Scheduler  │               │
│  │  (key-value) │   │(kube-scheduler)│              │
│  └──────────────┘   └──────────────┘               │
└─────────────────────────────────────────────────────┘

kube-apiserver   → single entry point for all REST operations
etcd             → distributed key-value store for cluster state
kube-scheduler   → assigns pods to nodes based on resources/affinity
controller-manager→ runs controllers (Node, ReplicaSet, Job...)
cloud-controller → integrates with cloud provider APIs (AWS, GCP)`,
            notes: [
              { type: "info", text: "etcd is the single source of truth — back it up regularly with etcdctl snapshot save." },
              { type: "interview", text: "What happens if the API server goes down? Existing pods keep running (kubelet continues). New scheduling and updates are blocked until API server recovers." },
            ],
          },
          {
            title: "Worker Node Components",
            body: "Each worker node runs three core components that communicate with the control plane.",
            example: `Worker Node Components:
┌─────────────────────────────────────────────┐
│                 Worker Node                 │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  kubelet │  │kube-proxy│  │Container │ │
│  │          │  │          │  │ Runtime  │ │
│  │ Registers│  │ Manages  │  │(containerd│ │
│  │ node &   │  │ iptables/│  │  /CRI-O) │ │
│  │ runs pods│  │  IPVS    │  │          │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│                                             │
│  Pods: [Pod1] [Pod2] [Pod3]                │
└─────────────────────────────────────────────┘

kubelet        → agent on each node; ensures containers run as specified
kube-proxy     → maintains network rules for Service routing
container runtime → pulls images, runs containers (containerd is default)`,
            notes: [
              { type: "tip", text: "kubelet uses the PodSpec to reconcile actual vs desired state — it's a control loop like everything else in k8s." },
            ],
          },
          {
            title: "Key Abstractions",
            body: "Kubernetes uses several abstractions to manage workloads declaratively.",
            example: `Abstraction Hierarchy:
Cluster
 └── Namespace
      ├── Pod (1+ containers, shared network/storage)
      │    └── Container (image + resources + env)
      ├── ReplicaSet (maintains N pod replicas)
      ├── Deployment (rolling updates over ReplicaSets)
      ├── StatefulSet (ordered, stable identity pods)
      ├── DaemonSet (one pod per node)
      ├── Job / CronJob (batch workloads)
      ├── Service (stable network endpoint)
      ├── Ingress (HTTP routing rules)
      ├── ConfigMap (non-secret config)
      └── Secret (sensitive config)

# Quick cheatsheet
kubectl get pods -n my-namespace
kubectl describe pod my-pod
kubectl logs my-pod -c my-container --tail=100
kubectl exec -it my-pod -- /bin/sh
kubectl top pod --sort-by=memory`,
          },
        ],
      },
      {
        title: "Pod Lifecycle",
        body: "Understanding pod lifecycle is essential for debugging and designing resilient apps.",
        subsections: [
          {
            title: "Pod Phases & Conditions",
            example: `Pod Phases:
Pending   → scheduled but containers not started (image pull, resource wait)
Running   → at least one container running
Succeeded → all containers exited 0 (Job completion)
Failed    → all containers exited, at least one non-zero
Unknown   → node communication lost

Pod Conditions (kubectl describe pod):
PodScheduled  → node assigned
Initialized   → init containers completed
ContainersReady → all containers passing readiness probes
Ready         → pod can serve traffic

# Check why a pod is stuck in Pending
kubectl describe pod <pod> | grep -A 10 Events
kubectl get events --sort-by=.lastTimestamp -n <namespace>`,
            notes: [
              { type: "warn", text: "CrashLoopBackOff means the container keeps crashing. Check logs from previous run: kubectl logs <pod> --previous" },
              { type: "interview", text: "Difference between Liveness and Readiness probes: Liveness restarts the container when it fails. Readiness removes the pod from Service endpoints — the container stays running." },
            ],
          },
          {
            title: "Init Containers & Probes",
            example: `apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  initContainers:
    - name: wait-for-db
      image: busybox
      command: ['sh', '-c', 'until nc -z db-service 5432; do sleep 2; done']

  containers:
    - name: app
      image: myapp:v2
      ports:
        - containerPort: 8080

      # Startup probe — gives app time to initialize
      startupProbe:
        httpGet:
          path: /healthz
          port: 8080
        failureThreshold: 30   # 30 * 10s = 5min max
        periodSeconds: 10

      # Liveness — restart if unhealthy
      livenessProbe:
        httpGet:
          path: /healthz
          port: 8080
        initialDelaySeconds: 0
        periodSeconds: 15
        failureThreshold: 3

      # Readiness — remove from Service endpoints if failing
      readinessProbe:
        httpGet:
          path: /ready
          port: 8080
        periodSeconds: 5
        failureThreshold: 2`,
            notes: [
              { type: "tip", text: "Always define a startupProbe for slow-starting apps — prevents liveness from killing them before they're ready." },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    icon: "🔒",
    color: "#F43F5E",
    tags: ["RBAC", "Network Policy", "Pod Security", "Secrets", "OPA"],
    content: [
      {
        title: "RBAC — Role-Based Access Control",
        body: "RBAC controls who can do what to which resources. It uses four objects: Role, ClusterRole, RoleBinding, ClusterRoleBinding.",
        subsections: [
          {
            title: "Roles & ClusterRoles",
            body: "Role is namespace-scoped. ClusterRole is cluster-wide. Both define a set of permissions (verbs on resources).",
            example: `# Role — namespace-scoped
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: pod-reader
rules:
  - apiGroups: [""]          # "" = core API group
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]

---
# ClusterRole — cluster-wide (also used for non-namespaced resources)
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-viewer
rules:
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["metrics.k8s.io"]
    resources: ["nodes", "pods"]
    verbs: ["get", "list"]

---
# RoleBinding — attaches Role to a subject
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: production
subjects:
  - kind: User
    name: jane
    apiGroup: rbac.authorization.k8s.io
  - kind: ServiceAccount
    name: ci-bot
    namespace: production
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io`,
            notes: [
              { type: "tip", text: "Use least privilege — give ServiceAccounts only the verbs they need. Avoid cluster-admin for application service accounts." },
              { type: "interview", text: "ClusterRoleBinding with a ClusterRole gives cluster-wide access. RoleBinding with a ClusterRole limits it to the namespace in the binding." },
            ],
          },
          {
            title: "ServiceAccount Best Practices",
            example: `# Create dedicated ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payment-service-sa
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/PaymentServiceRole

---
# Bind minimal role
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: payment-sa-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: payment-service-sa
    namespace: production
roleRef:
  kind: Role
  name: config-reader    # only reads ConfigMaps
  apiGroup: rbac.authorization.k8s.io

---
# Use in Pod
spec:
  serviceAccountName: payment-service-sa
  automountServiceAccountToken: false   # disable if not needed

# Audit RBAC — who can do what?
kubectl auth can-i create pods --as=system:serviceaccount:production:payment-service-sa
kubectl auth can-i delete secrets --as=jane -n production

# List all roles in namespace
kubectl get rolebindings,clusterrolebindings -A | grep jane`,
            notes: [
              { type: "warn", text: "The default ServiceAccount has automountServiceAccountToken: true — explicitly set it to false unless the pod needs API access." },
            ],
          },
          {
            title: "IRSA — IAM Roles for Service Accounts (EKS)",
            body: "IRSA lets pods assume AWS IAM roles without static credentials, using OIDC federation.",
            example: `# 1. Create OIDC provider for EKS cluster
eksctl utils associate-iam-oidc-provider \\
  --cluster my-cluster --approve

# 2. Create IAM role with trust policy
aws iam create-role --role-name PaymentServiceRole \\
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/EXAMPLED539D4633E53DE1B716D3041E"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.us-east-1.amazonaws.com/id/EXAMPLED:sub":
            "system:serviceaccount:production:payment-service-sa"
        }
      }
    }]
  }'

# 3. Attach policy to role
aws iam attach-role-policy --role-name PaymentServiceRole \\
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# 4. Annotate ServiceAccount
kubectl annotate serviceaccount payment-service-sa \\
  -n production \\
  eks.amazonaws.com/role-arn=arn:aws:iam::123456:role/PaymentServiceRole`,
          },
        ],
      },
      {
        title: "Network Policies",
        body: "NetworkPolicy resources control traffic flow between pods and external endpoints at L3/L4. Without a policy, all traffic is allowed.",
        subsections: [
          {
            title: "Deny-All Baseline + Allow Selectively",
            example: `# Step 1: Deny all ingress and egress in namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  podSelector: {}    # applies to ALL pods
  policyTypes:
    - Ingress
    - Egress

---
# Step 2: Allow frontend → backend on port 8080
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080

---
# Step 3: Allow backend → PostgreSQL
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-backend-to-db
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: backend
      ports:
        - protocol: TCP
          port: 5432

---
# Allow DNS egress (required for name resolution)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53`,
            notes: [
              { type: "warn", text: "NetworkPolicy requires a CNI plugin that supports it (Calico, Cilium, Weave). Flannel does NOT enforce NetworkPolicy." },
              { type: "tip", text: "Always allow UDP/TCP 53 egress if you have a deny-all egress rule, otherwise DNS resolution breaks." },
            ],
          },
          {
            title: "Cross-Namespace & CIDR Rules",
            example: `# Allow ingress from monitoring namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scrape
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
          podSelector:
            matchLabels:
              app: prometheus
      ports:
        - port: 9090

---
# Allow egress to external API (CIDR)
spec:
  podSelector:
    matchLabels:
      app: payment
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 203.0.113.0/24
            except:
              - 203.0.113.5/32    # block specific IP
      ports:
        - port: 443`,
          },
        ],
      },
      {
        title: "Pod Security",
        body: "Pod Security Admission (PSA) replaced PodSecurityPolicy in k8s 1.25+. It enforces security standards at the namespace level.",
        subsections: [
          {
            title: "Pod Security Standards & Admission",
            example: `# PSA — label namespaces with enforcement level
# Levels: privileged, baseline, restricted
kubectl label namespace production \\
  pod-security.kubernetes.io/enforce=restricted \\
  pod-security.kubernetes.io/enforce-version=latest \\
  pod-security.kubernetes.io/warn=restricted \\
  pod-security.kubernetes.io/audit=restricted

---
# Restricted-compliant pod spec
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
  namespace: production
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault

  containers:
    - name: app
      image: myapp:v2
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
      resources:
        requests:
          memory: "64Mi"
          cpu: "100m"
        limits:
          memory: "128Mi"
          cpu: "500m"
      volumeMounts:
        - mountPath: /tmp
          name: tmp-vol    # writable scratch space

  volumes:
    - name: tmp-vol
      emptyDir: {}`,
            notes: [
              { type: "tip", text: "readOnlyRootFilesystem: true prevents attackers from writing tools after a container escape. Mount emptyDir for /tmp if needed." },
              { type: "interview", text: "PSP is deprecated since 1.21 and removed in 1.25. The replacement is Pod Security Admission (built-in) or OPA/Kyverno for more complex policies." },
            ],
          },
          {
            title: "Secrets Management",
            example: `# Bad: secrets in env vars (visible in pod spec, logs)
env:
  - name: DB_PASS
    value: "plaintext-bad"

# Better: reference a Secret
env:
  - name: DB_PASS
    valueFrom:
      secretKeyRef:
        name: db-credentials
        key: password

# Best: mount as file (memory-backed tmpfs)
volumes:
  - name: secrets-vol
    secret:
      secretName: db-credentials
      defaultMode: 0400   # read-only owner only
volumeMounts:
  - name: secrets-vol
    mountPath: /secrets
    readOnly: true

---
# Create secret (base64 encoded by k8s)
kubectl create secret generic db-credentials \\
  --from-literal=password=supersecret \\
  --from-file=tls.crt=./server.crt

# Encrypt secrets at rest (etcd encryption config)
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources: ["secrets"]
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}    # fallback: unencrypted`,
            notes: [
              { type: "warn", text: "Kubernetes Secrets are base64-encoded, not encrypted, by default. Enable etcd encryption at rest or use external secret managers (AWS Secrets Manager, Vault)." },
              { type: "example", text: "External Secrets Operator syncs AWS Secrets Manager → Kubernetes Secret automatically, with rotation support." },
            ],
          },
          {
            title: "OPA / Kyverno Policy Enforcement",
            example: `# Kyverno policy — require resource limits on all pods
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: enforce
  rules:
    - name: check-limits
      match:
        any:
          - resources:
              kinds: ["Pod"]
      validate:
        message: "CPU and memory limits are required."
        pattern:
          spec:
            containers:
              - resources:
                  limits:
                    cpu: "?*"
                    memory: "?*"

---
# Kyverno policy — disallow latest image tag
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-latest-tag
spec:
  validationFailureAction: enforce
  rules:
    - name: require-image-tag
      match:
        any:
          - resources:
              kinds: ["Pod"]
      validate:
        message: "Image tag 'latest' is not allowed."
        pattern:
          spec:
            containers:
              - image: "!*:latest"`,
            notes: [
              { type: "tip", text: "Kyverno is easier to use than OPA/Gatekeeper for k8s-native policies — policies are written as YAML, not Rego." },
            ],
          },
        ],
      },
      {
        title: "Supply Chain & Image Security",
        body: "Securing the software supply chain prevents malicious images from running in the cluster.",
        subsections: [
          {
            title: "Image Scanning & Signing",
            example: `# Scan image with Trivy before push
trivy image --severity HIGH,CRITICAL myapp:v2
trivy image --exit-code 1 --severity CRITICAL myapp:v2  # fail CI on critical

# Sign image with Cosign (sigstore)
cosign sign --key cosign.key myregistry/myapp:v2

# Verify signature
cosign verify --key cosign.pub myregistry/myapp:v2

# Kyverno policy — only allow signed images
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signature
spec:
  validationFailureAction: enforce
  rules:
    - name: check-image-signature
      match:
        any:
          - resources:
              kinds: ["Pod"]
      verifyImages:
        - imageReferences: ["myregistry/*"]
          attestors:
            - entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      ...
                      -----END PUBLIC KEY-----`,
            notes: [
              { type: "tip", text: "Pin images by digest (myapp@sha256:abc123) not tag — tags are mutable and can be overwritten." },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "networking",
    title: "Networking",
    icon: "🌐",
    color: "#10B981",
    tags: ["Services", "Ingress", "CNI", "DNS", "Load Balancing"],
    content: [
      {
        title: "Services",
        body: "A Service gives a stable virtual IP and DNS name to a dynamic set of pods selected by label.",
        subsections: [
          {
            title: "Service Types",
            example: `Service Types:

ClusterIP (default)
  → Internal-only VIP, reachable within cluster
  → Use for: pod-to-pod communication

NodePort
  → Opens port 30000-32767 on every node
  → Use for: dev/testing, not production
  → Access: <NodeIP>:<NodePort>

LoadBalancer
  → Provisions cloud LB (ALB/NLB on AWS)
  → Use for: exposing services externally
  → Creates NodePort + ClusterIP underneath

ExternalName
  → Maps service to external DNS name (CNAME)
  → Use for: migrating services, external DBs

---
# ClusterIP
apiVersion: v1
kind: Service
metadata:
  name: backend-svc
spec:
  selector:
    app: backend
  ports:
    - port: 80         # port the service listens on
      targetPort: 8080 # port the pod listens on
  type: ClusterIP

---
# NLB on AWS (LoadBalancer)
apiVersion: v1
kind: Service
metadata:
  name: api-nlb
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: external
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: ip
    service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
spec:
  selector:
    app: api
  type: LoadBalancer
  ports:
    - port: 443
      targetPort: 8443`,
            notes: [
              { type: "info", text: "kube-proxy implements Services using iptables rules or IPVS. IPVS mode is faster at scale (1000+ services)." },
              { type: "interview", text: "Services use virtual IPs (ClusterIPs) — these are not routable. Traffic is intercepted by iptables/IPVS on the node and forwarded to a pod endpoint." },
            ],
          },
          {
            title: "Headless Services & StatefulSet DNS",
            example: `# Headless service — no ClusterIP, returns pod IPs directly
apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
spec:
  clusterIP: None    # headless
  selector:
    app: postgres
  ports:
    - port: 5432

---
# DNS entries for StatefulSet pods (with headless service):
# <pod-name>.<service-name>.<namespace>.svc.cluster.local
# postgres-0.postgres-headless.production.svc.cluster.local
# postgres-1.postgres-headless.production.svc.cluster.local

# Regular service DNS:
# <service-name>.<namespace>.svc.cluster.local
# backend-svc.production.svc.cluster.local

# From within same namespace (short form works too):
curl http://backend-svc
curl http://backend-svc.production
curl http://backend-svc.production.svc.cluster.local`,
          },
        ],
      },
      {
        title: "Ingress & Ingress Controllers",
        body: "Ingress exposes HTTP/HTTPS routes from outside the cluster to services. An Ingress Controller (nginx, AWS ALB, Traefik) implements the rules.",
        subsections: [
          {
            title: "NGINX Ingress",
            example: `# Install NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \\
  --namespace ingress-nginx --create-namespace

---
# Ingress with TLS and path routing
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.myapp.com
      secretName: api-tls-cert
  rules:
    - host: api.myapp.com
      http:
        paths:
          - path: /users
            pathType: Prefix
            backend:
              service:
                name: user-service
                port:
                  number: 80
          - path: /orders
            pathType: Prefix
            backend:
              service:
                name: order-service
                port:
                  number: 80`,
            notes: [
              { type: "tip", text: "Use cert-manager with Let's Encrypt to auto-provision and renew TLS certificates. It integrates natively with Ingress annotations." },
            ],
          },
          {
            title: "AWS ALB Ingress Controller",
            example: `# Install AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \\
  -n kube-system \\
  --set clusterName=my-cluster \\
  --set serviceAccount.create=false \\
  --set serviceAccount.name=aws-load-balancer-controller

---
# ALB Ingress (creates real ALB on AWS)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: alb-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123:certificate/abc
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/ssl-redirect: "443"
    alb.ingress.kubernetes.io/group.name: shared-alb   # share ALB across ingresses
spec:
  rules:
    - host: api.myapp.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80`,
            notes: [
              { type: "example", text: "Use alb.ingress.kubernetes.io/group.name to share one ALB across multiple Ingress objects — reduces cost vs one ALB per service." },
            ],
          },
          {
            title: "CNI Plugins Comparison",
            example: `CNI Plugin Comparison:

┌──────────────┬──────────────┬──────────────┬──────────────┐
│  Plugin      │  NetworkPol  │  Performance │  Features    │
├──────────────┼──────────────┼──────────────┼──────────────┤
│  Flannel     │     ✗        │  Good        │  Simple VXLAN│
│  Calico      │     ✓        │  Excellent   │  BGP routing │
│  Cilium      │     ✓        │  Best (eBPF) │  L7 policy   │
│  Weave       │     ✓        │  Good        │  Encryption  │
│  AWS VPC CNI │     ✓        │  Excellent   │  Native VPC  │
└──────────────┴──────────────┴──────────────┴──────────────┘

Cilium (eBPF-based):
- Replaces iptables with eBPF programs (10x faster at scale)
- L7-aware NetworkPolicy (HTTP methods, gRPC paths)
- Built-in observability (Hubble UI)
- Service mesh without sidecars (Cilium Service Mesh)

AWS VPC CNI:
- Pods get real VPC IP addresses
- No overlay network overhead
- Direct routing with security groups per pod
- Best for EKS deployments`,
            notes: [
              { type: "interview", text: "Why Cilium over Calico? Cilium uses eBPF which bypasses iptables — much better performance at 1000+ services. Also offers L7 policy and built-in observability via Hubble." },
            ],
          },
        ],
      },
      {
        title: "Service Mesh",
        body: "A service mesh adds mTLS, observability, traffic management, and retry logic transparently via sidecar proxies or eBPF.",
        subsections: [
          {
            title: "Istio Architecture & Features",
            example: `Istio Architecture:
┌─────────────────────────────────────────────┐
│  Control Plane: istiod                      │
│  (Pilot + Citadel + Galley merged)          │
│   → config distribution, cert management   │
└─────────────────────────────────────────────┘
           ↕ xDS protocol
┌─────────────────────────────────────────────┐
│  Data Plane: Envoy sidecars in each pod     │
│  [App | Envoy] → [App | Envoy]              │
│  Intercepts all in/out traffic via iptables │
└─────────────────────────────────────────────┘

Key Features:
  mTLS         → automatic mutual TLS between services
  Traffic Mgmt → weighted routing, canary, circuit breaking
  Observability→ distributed tracing, metrics, access logs
  Auth policy  → JWT validation, RBAC at L7

# Enable mTLS cluster-wide
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT   # PERMISSIVE for gradual migration

# Canary: 90% stable, 10% canary
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts: ["reviews"]
  http:
    - route:
        - destination:
            host: reviews
            subset: stable
          weight: 90
        - destination:
            host: reviews
            subset: canary
          weight: 10`,
            notes: [
              { type: "warn", text: "Istio sidecars add ~5ms latency and ~50MB memory per pod. Evaluate if the complexity is justified — Cilium Service Mesh is an alternative without sidecars." },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "monitoring",
    title: "Monitoring & Observability",
    icon: "📊",
    color: "#F59E0B",
    tags: ["Prometheus", "Grafana", "Loki", "Alerting", "Tracing"],
    content: [
      {
        title: "Prometheus & Grafana Stack",
        body: "The Prometheus + Grafana stack is the de facto standard for Kubernetes monitoring. kube-prometheus-stack installs everything with pre-built dashboards.",
        subsections: [
          {
            title: "Installation & Core Concepts",
            example: `# Install kube-prometheus-stack (Prometheus + Grafana + Alertmanager)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \\
  --namespace monitoring --create-namespace \\
  --set grafana.adminPassword=secret \\
  --set prometheus.prometheusSpec.retention=30d \\
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi

# What gets installed:
# - Prometheus (metrics scraping & storage)
# - Grafana (visualization)
# - Alertmanager (alert routing)
# - node-exporter (node-level metrics)
# - kube-state-metrics (k8s object metrics)
# - prometheus-operator (manages Prometheus via CRDs)

# Key metrics exposed:
kubectl top nodes                          # CPU/mem per node
kubectl top pods -A --sort-by=memory       # pod resource usage

# Port-forward to access locally
kubectl port-forward svc/kube-prometheus-stack-grafana 3000:80 -n monitoring
kubectl port-forward svc/kube-prometheus-stack-prometheus 9090:9090 -n monitoring`,
            notes: [
              { type: "info", text: "Prometheus uses a pull model — it scrapes /metrics endpoints. Pushgateway is for batch jobs that can't be scraped." },
            ],
          },
          {
            title: "ServiceMonitor & Custom Metrics",
            example: `# ServiceMonitor — tells Prometheus what to scrape
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: backend-metrics
  namespace: monitoring
  labels:
    release: kube-prometheus-stack   # must match Prometheus selector
spec:
  namespaceSelector:
    matchNames: ["production"]
  selector:
    matchLabels:
      app: backend
  endpoints:
    - port: metrics
      path: /metrics
      interval: 30s
      scrapeTimeout: 10s

---
# Expose /metrics from your app (Go example)
import (
  "github.com/prometheus/client_golang/prometheus"
  "github.com/prometheus/client_golang/prometheus/promauto"
)

requestsTotal := promauto.NewCounterVec(
  prometheus.CounterOpts{
    Name: "http_requests_total",
    Help: "Total HTTP requests",
  },
  []string{"method", "status"},
)
// Increment in handler:
requestsTotal.WithLabelValues("GET", "200").Inc()`,
          },
          {
            title: "PromQL — Essential Queries",
            example: `# CPU usage per pod (% of requested)
rate(container_cpu_usage_seconds_total{namespace="production"}[5m])
/ on(pod, namespace)
kube_pod_container_resource_requests{resource="cpu"}
* 100

# Memory usage vs limits
container_memory_working_set_bytes{namespace="production"}
/ on(pod, container)
kube_pod_container_resource_limits{resource="memory"}
* 100

# HTTP error rate (5xx)
sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
/
sum(rate(http_requests_total[5m])) by (service) * 100

# P99 latency
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
)

# Pod restart count (last hour)
increase(kube_pod_container_status_restarts_total[1h]) > 0

# Pods not ready
kube_pod_status_ready{condition="false"} == 1`,
          },
          {
            title: "Alerting Rules",
            example: `apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: app-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: app.rules
      interval: 30s
      rules:
        # High error rate
        - alert: HighErrorRate
          expr: |
            sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
            / sum(rate(http_requests_total[5m])) by (service) > 0.05
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "{{ $labels.service }} error rate > 5%"
            description: "Error rate is {{ $value | humanizePercentage }}"
            runbook: https://wiki.internal/runbooks/high-error-rate

        # Pod crash looping
        - alert: PodCrashLooping
          expr: increase(kube_pod_container_status_restarts_total[15m]) > 3
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is crash looping"

        # High memory usage
        - alert: HighMemoryUsage
          expr: |
            container_memory_working_set_bytes
            / kube_pod_container_resource_limits{resource="memory"} > 0.9
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Container {{ $labels.container }} memory > 90% of limit"`,
            notes: [
              { type: "tip", text: "Always include a runbook URL in alert annotations. Engineers debugging at 2am shouldn't have to figure out next steps from scratch." },
            ],
          },
        ],
      },
      {
        title: "Log Aggregation — Loki Stack",
        body: "Loki is a log aggregation system from Grafana Labs, designed for Kubernetes. It indexes labels (not log content) making it much cheaper than Elasticsearch.",
        subsections: [
          {
            title: "Loki + Promtail Setup",
            example: `# Install Loki stack
helm repo add grafana https://grafana.github.io/helm-charts
helm install loki-stack grafana/loki-stack \\
  --namespace monitoring \\
  --set loki.persistence.enabled=true \\
  --set loki.persistence.size=20Gi \\
  --set promtail.enabled=true

# Promtail runs as DaemonSet — tails /var/log/pods/* on every node
# Automatically adds labels: namespace, pod, container, node

# LogQL — query language (like PromQL for logs)
# All logs from production namespace, error level
{namespace="production"} |= "ERROR"

# Logs from specific pod containing "timeout"
{namespace="production", pod=~"payment-.*"} |~ "timeout"

# Parse structured JSON logs and filter
{app="backend"}
  | json
  | level="error"
  | response_time > 1000

# Count errors per service over time
sum(rate({namespace="production"} |= "ERROR" [5m])) by (app)

# Extract fields and build metrics from logs
sum_over_time(
  {app="api"}
  | json
  | unwrap response_ms [5m]
) by (endpoint)`,
            notes: [
              { type: "info", text: "Loki stores only metadata (labels) in its index and raw log chunks compressed in object storage (S3). Much cheaper than full-text indexing." },
            ],
          },
        ],
      },
      {
        title: "Distributed Tracing",
        body: "Tracing shows the full journey of a request across microservices, exposing latency bottlenecks and failure points.",
        subsections: [
          {
            title: "OpenTelemetry + Jaeger/Tempo",
            example: `# Install OpenTelemetry Operator
kubectl apply -f https://github.com/open-telemetry/opentelemetry-operator/releases/latest/download/opentelemetry-operator.yaml

# Deploy OpenTelemetry Collector
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  config: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318
    processors:
      batch:
        timeout: 1s
    exporters:
      jaeger:
        endpoint: jaeger-collector:14250
        tls:
          insecure: true
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [jaeger]

# Instrument Go app with OTel SDK
import "go.opentelemetry.io/otel"

tracer := otel.Tracer("payment-service")
ctx, span := tracer.Start(ctx, "process-payment")
defer span.End()

span.SetAttributes(
  attribute.String("user.id", userID),
  attribute.Float64("amount", amount),
)`,
            notes: [
              { type: "tip", text: "OpenTelemetry is vendor-neutral. Instrument once, send to Jaeger, Tempo, Datadog, or any backend by changing the exporter config." },
              { type: "interview", text: "The three pillars of observability: Metrics (what's wrong), Logs (why it's wrong), Traces (where it's wrong in the call chain)." },
            ],
          },
        ],
      },
      {
        title: "Key Kubernetes Dashboards",
        body: "Essential Grafana dashboards for cluster health monitoring.",
        subsections: [
          {
            title: "Important Metrics to Track",
            example: `Cluster-level dashboards (Grafana IDs):
  ID 315  → Kubernetes cluster monitoring (by CoreOS)
  ID 6417 → Kubernetes Pods
  ID 1860 → Node Exporter Full
  ID 13502→ Mixin dashboards

Key metrics to always monitor:

Node Health:
  node_cpu_utilization          > 80% → scale out nodes
  node_memory_utilization       > 85% → OOM risk
  node_disk_usage               > 80% → clean up or expand PV

Pod Health:
  kube_pod_container_status_restarts_total  → crash loops
  kube_pod_status_phase{phase!="Running"}   → stuck pods
  container_oom_events_total               → memory kills

Application SLIs:
  Availability    = 1 - error_rate
  Latency P50/P99 = histogram_quantile(0.99, ...)
  Throughput      = rate(requests_total[5m])
  Saturation      = CPU/memory % of limits

SLO example:
  99.9% availability over 30 days = 43.8 min downtime budget
  Alert at 99.5% (burn rate 2x) → warning
  Alert at 98%   (burn rate 10x)→ page on-call`,
          },
        ],
      },
    ],
  },
  {
    id: "workloads",
    title: "Workload Types",
    icon: "⚙️",
    color: "#A78BFA",
    tags: ["Deployments", "StatefulSets", "DaemonSets", "Jobs", "HPA", "VPA"],
    content: [
      {
        title: "Deployments & Rolling Updates",
        body: "Deployments manage stateless application rollouts with zero-downtime strategies.",
        subsections: [
          {
            title: "Deployment Strategies",
            example: `# Rolling update (default) — gradual replacement
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: production
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2        # 2 extra pods during update
      maxUnavailable: 0  # never go below 10 pods
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: myapp:v3
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"

---
# Recreate — kill all, then start new (causes downtime)
strategy:
  type: Recreate

---
# Rollback on failure
kubectl rollout status deployment/api        # watch progress
kubectl rollout history deployment/api       # see revisions
kubectl rollout undo deployment/api          # rollback to previous
kubectl rollout undo deployment/api --to-revision=3

# Pause/resume for canary testing
kubectl rollout pause deployment/api
kubectl rollout resume deployment/api`,
            notes: [
              { type: "tip", text: "Set maxUnavailable: 0 with maxSurge: 1-2 for zero-downtime rolling updates. Ensure your readiness probe is accurate or you'll route to broken pods." },
            ],
          },
        ],
      },
      {
        title: "StatefulSets",
        body: "StatefulSets are for workloads that need stable identity, ordered deployment, and persistent storage — databases, message queues, distributed systems.",
        subsections: [
          {
            title: "StatefulSet with Persistent Storage",
            example: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
spec:
  serviceName: postgres-headless   # required headless service
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data

  # VolumeClaimTemplate — each pod gets its own PVC
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: gp3
        resources:
          requests:
            storage: 100Gi

# Pod naming is deterministic:
# postgres-0, postgres-1, postgres-2
# DNS: postgres-0.postgres-headless.production.svc.cluster.local

# PVCs are NOT deleted when StatefulSet is deleted:
# data-postgres-0, data-postgres-1, data-postgres-2`,
            notes: [
              { type: "interview", text: "Key differences from Deployment: stable pod names (pod-0, pod-1), ordered creation/deletion, each pod gets its own PVC that persists across restarts." },
            ],
          },
        ],
      },
      {
        title: "Autoscaling — HPA & VPA & KEDA",
        body: "Kubernetes supports multiple autoscaling dimensions: pod count (HPA), pod resources (VPA), and event-driven scale-to-zero (KEDA).",
        subsections: [
          {
            title: "Horizontal Pod Autoscaler",
            example: `# HPA — scale based on CPU/memory
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
  minReplicas: 3
  maxReplicas: 50
  metrics:
    # CPU — scale when avg > 70%
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    # Memory — scale when avg > 80%
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    # Custom metric — requests per second
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0    # scale up immediately
      policies:
        - type: Percent
          value: 100                   # double pods at most
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300  # wait 5min before scaling down
      policies:
        - type: Pods
          value: 2                     # remove max 2 pods at a time
          periodSeconds: 60`,
            notes: [
              { type: "warn", text: "HPA requires metrics-server installed. For custom/external metrics you need Prometheus Adapter or KEDA." },
            ],
          },
          {
            title: "KEDA — Event-Driven Autoscaling",
            example: `# KEDA — scale based on queue depth, Kafka lag, etc.
helm repo add kedacore https://kedacore.github.io/charts
helm install keda kedacore/keda --namespace keda --create-namespace

---
# ScaledObject — SQS queue depth
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: worker-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: sqs-worker
  minReplicaCount: 0        # scale to zero!
  maxReplicaCount: 100
  triggers:
    - type: aws-sqs-queue
      metadata:
        queueURL: https://sqs.us-east-1.amazonaws.com/123/my-queue
        queueLength: "10"    # 1 pod per 10 messages
        awsRegion: us-east-1
      authenticationRef:
        name: keda-aws-auth

---
# Scale on Kafka consumer group lag
triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka:9092
      consumerGroup: order-processor
      topic: orders
      lagThreshold: "50"    # 1 pod per 50 messages of lag`,
            notes: [
              { type: "example", text: "KEDA with SQS: at night the queue is empty, workers scale to 0. At peak, 10,000 messages → 100 workers spin up in minutes. Massive cost savings." },
            ],
          },
        ],
      },
      {
        title: "DaemonSets & Jobs",
        body: "DaemonSets run exactly one pod per node. Jobs run finite tasks to completion.",
        subsections: [
          {
            title: "DaemonSet Use Cases",
            example: `# DaemonSet — runs on every node
# Use cases: log collectors, monitoring agents, CNI, node exporters
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      tolerations:
        - operator: Exists       # run on ALL nodes including masters
      hostNetwork: true          # needed for node-level metrics
      hostPID: true
      containers:
        - name: node-exporter
          image: prom/node-exporter:latest
          ports:
            - containerPort: 9100

---
# CronJob — scheduled batch tasks
apiVersion: batch/v1
kind: CronJob
metadata:
  name: db-backup
  namespace: production
spec:
  schedule: "0 2 * * *"    # 2am daily
  concurrencyPolicy: Forbid # don't overlap
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: postgres:15
              command: ["pg_dump", "-h", "postgres-svc", "mydb"]`,
          },
        ],
      },
    ],
  },
  {
    id: "usecases",
    title: "Use Cases & Patterns",
    icon: "🚀",
    color: "#06B6D4",
    tags: ["Microservices", "CI/CD", "ML", "Multi-tenancy", "GitOps"],
    content: [
      {
        title: "Microservices on Kubernetes",
        body: "Kubernetes is the de facto platform for microservices. It handles service discovery, rolling updates, scaling, and fault isolation.",
        subsections: [
          {
            title: "Production-Ready Microservice Checklist",
            example: `Production Microservice Checklist:

Deployment:
  ✅ replicas >= 3 (availability across AZs)
  ✅ Pod Anti-Affinity (spread pods across nodes)
  ✅ Rolling update strategy (maxUnavailable: 0)
  ✅ Resources requests & limits set
  ✅ PodDisruptionBudget (at least 1 pod always available)

Health:
  ✅ Liveness probe (restart on deadlock)
  ✅ Readiness probe (no traffic until ready)
  ✅ Startup probe (for slow-starting apps)

Security:
  ✅ Non-root user (runAsNonRoot: true)
  ✅ Read-only root filesystem
  ✅ Drop ALL capabilities
  ✅ Dedicated ServiceAccount (no default)
  ✅ NetworkPolicy (deny-all + allow selectively)
  ✅ Resource Quota per namespace

Observability:
  ✅ /metrics endpoint (Prometheus format)
  ✅ Structured JSON logging
  ✅ Health endpoints (/healthz, /ready)
  ✅ Distributed tracing (OTel SDK)
  ✅ Alerts defined for SLO breaches

---
# PodDisruptionBudget
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
spec:
  minAvailable: 2    # or maxUnavailable: 1
  selector:
    matchLabels:
      app: api

# Pod Anti-Affinity
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: api
          topologyKey: kubernetes.io/hostname`,
          },
        ],
      },
      {
        title: "GitOps with ArgoCD",
        body: "GitOps uses Git as the single source of truth for cluster state. ArgoCD continuously syncs the cluster to match the Git repository.",
        subsections: [
          {
            title: "ArgoCD Setup & Application",
            example: `# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Get initial admin password
kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath='{.data.password}' | base64 -d

# Create Application — syncs Git repo to cluster
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/k8s-manifests
    targetRevision: main
    path: apps/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true        # delete resources removed from Git
      selfHeal: true     # revert manual changes to cluster
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m

# GitOps workflow:
# 1. Dev pushes image tag update to Git
# 2. ArgoCD detects Git diff
# 3. ArgoCD applies change to cluster
# 4. Cluster reconciles to new state
# 5. ArgoCD reports sync status`,
            notes: [
              { type: "tip", text: "Use Kustomize or Helm with ArgoCD for environment overlays — base manifests + production/staging patches in separate directories." },
              { type: "interview", text: "GitOps advantage: full audit trail in Git history, easy rollback (git revert), PR-based change management, no direct kubectl access needed." },
            ],
          },
        ],
      },
      {
        title: "ML Workloads on Kubernetes",
        body: "Kubernetes has become a standard platform for machine learning training and inference, especially with GPU support.",
        subsections: [
          {
            title: "GPU Workloads & Training Jobs",
            example: `# Install NVIDIA GPU device plugin
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.0/nvidia-device-plugin.yml

# GPU-accelerated training job
apiVersion: batch/v1
kind: Job
metadata:
  name: model-training
  namespace: ml
spec:
  parallelism: 4           # 4 pods in parallel
  completions: 4           # need all 4 to complete
  template:
    spec:
      restartPolicy: OnFailure
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
      nodeSelector:
        accelerator: nvidia-tesla-a100
      containers:
        - name: trainer
          image: pytorch/pytorch:2.0.0-cuda11.7-cudnn8-runtime
          resources:
            limits:
              nvidia.com/gpu: 1    # 1 GPU per pod
              memory: "32Gi"
              cpu: "8"
          command: ["python", "train.py"]
          env:
            - name: MASTER_ADDR
              value: "model-training-0.training-svc"
            - name: WORLD_SIZE
              value: "4"

---
# Inference deployment with GPU
apiVersion: apps/v1
kind: Deployment
metadata:
  name: model-server
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: triton
          image: nvcr.io/nvidia/tritonserver:23.08-py3
          resources:
            limits:
              nvidia.com/gpu: 1
          ports:
            - containerPort: 8000   # HTTP
            - containerPort: 8001   # gRPC`,
            notes: [
              { type: "example", text: "Use Kubeflow Pipelines for end-to-end ML workflows (data prep → training → evaluation → serving) as DAGs on Kubernetes." },
            ],
          },
        ],
      },
      {
        title: "Multi-Tenancy Patterns",
        body: "Running multiple teams or environments on one cluster requires careful isolation to prevent resource starvation and security breaches.",
        subsections: [
          {
            title: "Namespace Isolation with Resource Quotas",
            example: `# ResourceQuota — limit what a team can consume
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-alpha-quota
  namespace: team-alpha
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
    pods: "50"
    persistentvolumeclaims: "10"
    services.loadbalancers: "2"

---
# LimitRange — defaults for pods that don't specify resources
apiVersion: v1
kind: LimitRange
metadata:
  name: team-alpha-limits
  namespace: team-alpha
spec:
  limits:
    - type: Container
      default:
        cpu: "500m"
        memory: "256Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "4"
        memory: "8Gi"
    - type: PersistentVolumeClaim
      max:
        storage: "50Gi"

---
# Namespace with RBAC + NetworkPolicy + Quota = soft multi-tenancy
# Hard multi-tenancy requires separate clusters (vcluster is middle ground)

# vcluster — virtual cluster per team (lightweight)
helm repo add loft-sh https://charts.loft.sh
helm install team-alpha-cluster loft-sh/vcluster \\
  --namespace team-alpha --create-namespace`,
            notes: [
              { type: "interview", text: "Soft multi-tenancy (namespaces + RBAC + quotas) is suitable for trusted teams. Hard multi-tenancy (separate clusters or vcluster) for external tenants or compliance requirements." },
            ],
          },
        ],
      },
      {
        title: "Disaster Recovery & High Availability",
        body: "Planning for cluster failures requires multi-AZ node groups, etcd backups, and cross-region strategies.",
        subsections: [
          {
            title: "HA Architecture & Backup",
            example: `# Multi-AZ node group (EKS)
eksctl create nodegroup \\
  --cluster my-cluster \\
  --name app-nodes \\
  --node-type m5.xlarge \\
  --nodes 6 --nodes-min 3 --nodes-max 12 \\
  --asg-access \\
  --node-zones us-east-1a,us-east-1b,us-east-1c

# Topology spread for pods across AZs
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: api

---
# Velero — cluster backup & restore
helm install velero vmware-tanzu/velero \\
  --namespace velero --create-namespace \\
  --set configuration.provider=aws \\
  --set configuration.backupStorageLocation.bucket=my-k8s-backups \\
  --set configuration.backupStorageLocation.config.region=us-east-1

# Schedule daily backup
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  schedule: "0 1 * * *"
  template:
    includedNamespaces: ["production", "staging"]
    ttl: 720h    # keep 30 days

# Restore from backup
velero restore create --from-backup daily-backup-20260315`,
            notes: [
              { type: "tip", text: "Backup both etcd snapshots (control plane state) and Velero backups (workload state + PV data). Test restores regularly — untested backups are not backups." },
            ],
          },
        ],
      },
    ],
  },
];

export default function KubernetesCompleteGuide() {
  const [activeTopic, setActiveTopic] = useState("architecture");
  const [expandedItems, setExpandedItems] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  const toggle = (key) =>
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));

  const topic = allTopics.find((t) => t.id === activeTopic);

  const filteredTopics = searchTerm
    ? allTopics.filter(
        (t) =>
          t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.tags.some((tag) =>
            tag.toLowerCase().includes(searchTerm.toLowerCase())
          ) ||
          t.content.some((c) =>
            c.title.toLowerCase().includes(searchTerm.toLowerCase())
          )
      )
    : allTopics;

  return (
    <div
      style={{
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        background: "#080E1A",
        minHeight: "100vh",
        color: "#CBD5E1",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(145deg, #0F172A, #0d1f0d)",
          borderBottom: "1px solid #1E293B",
          padding: "24px 28px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "linear-gradient(135deg, #326CE5, #10B981)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            ☸️
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: "#F1F5F9",
              }}
            >
              Kubernetes — Complete Guide
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: "#64748B" }}>
              Security · Networking · Monitoring · Use Cases · Production
              Patterns
            </p>
          </div>
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search topics, tags..."
          style={{
            width: "100%",
            padding: "10px 16px",
            fontSize: 13,
            fontFamily: "inherit",
            background: "#0F172A",
            border: "1px solid #1E3A5F",
            borderRadius: 8,
            color: "#E2E8F0",
            outline: "none",
            marginTop: 16,
            boxSizing: "border-box",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 14,
            flexWrap: "wrap",
          }}
        >
          {(searchTerm ? filteredTopics : allTopics).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTopic(t.id);
                setSearchTerm("");
              }}
              style={{
                padding: "7px 14px",
                border:
                  activeTopic === t.id
                    ? `2px solid ${t.color}`
                    : "1px solid #1E3A5F",
                borderRadius: 20,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 600,
                background:
                  activeTopic === t.id ? t.color + "18" : "#111827",
                color: activeTopic === t.id ? t.color : "#94A3B8",
                transition: "all 0.2s",
              }}
            >
              {t.icon} {t.title}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {topic && (
        <div
          style={{ padding: "20px 28px", maxWidth: 960, margin: "0 auto" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 30 }}>{topic.icon}</span>
            <h2
              style={{
                margin: 0,
                fontSize: 24,
                color: topic.color,
                fontWeight: 700,
              }}
            >
              {topic.title}
            </h2>
          </div>
          <div style={{ marginBottom: 24 }}>
            {topic.tags.map((t) => (
              <Tag key={t} text={t} color={topic.color} />
            ))}
          </div>

          {topic.content.map((section, si) => (
            <div
              key={si}
              style={{
                marginBottom: 24,
                background: "#0F172A",
                borderRadius: 12,
                border: "1px solid #1E293B",
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => toggle(`${topic.id}-${si}`)}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 20px",
                  border: "none",
                  background:
                    expandedItems[`${topic.id}-${si}`] !== false
                      ? topic.color + "10"
                      : "transparent",
                  cursor: "pointer",
                  color: "#F1F5F9",
                  fontFamily: "inherit",
                  fontSize: 16,
                  fontWeight: 700,
                  textAlign: "left",
                }}
              >
                {section.title}
                <span
                  style={{
                    color: "#475569",
                    fontSize: 12,
                    transform:
                      expandedItems[`${topic.id}-${si}`] !== false
                        ? "rotate(180deg)"
                        : "none",
                    transition: "0.2s",
                  }}
                >
                  ▼
                </span>
              </button>

              {expandedItems[`${topic.id}-${si}`] !== false && (
                <div style={{ padding: "0 20px 20px" }}>
                  {section.body && (
                    <p
                      style={{
                        margin: "0 0 16px",
                        fontSize: 14,
                        lineHeight: 1.7,
                      }}
                    >
                      {section.body}
                    </p>
                  )}

                  {section.subsections &&
                    section.subsections.map((sub, subi) => {
                      const subKey = `${topic.id}-${si}-${subi}`;
                      const isOpen = expandedItems[subKey] !== false;
                      return (
                        <div
                          key={subi}
                          style={{
                            marginBottom: 12,
                            border: "1px solid #1a2540",
                            borderRadius: 10,
                            overflow: "hidden",
                          }}
                        >
                          <button
                            onClick={() => toggle(subKey)}
                            style={{
                              width: "100%",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "12px 16px",
                              border: "none",
                              background: isOpen ? "#111827" : "#0d1525",
                              cursor: "pointer",
                              color: topic.color,
                              fontFamily: "inherit",
                              fontSize: 14,
                              fontWeight: 600,
                              textAlign: "left",
                            }}
                          >
                            {sub.title}
                            <span
                              style={{
                                color: "#475569",
                                fontSize: 11,
                                transform: isOpen
                                  ? "rotate(180deg)"
                                  : "none",
                                transition: "0.2s",
                              }}
                            >
                              ▼
                            </span>
                          </button>

                          {isOpen && (
                            <div
                              style={{
                                padding: "12px 16px",
                                background: "#0d1525",
                              }}
                            >
                              {sub.body && (
                                <p
                                  style={{
                                    margin: "0 0 12px",
                                    fontSize: 13,
                                    lineHeight: 1.7,
                                  }}
                                >
                                  {sub.body}
                                </p>
                              )}
                              {sub.example && <Code>{sub.example}</Code>}
                              {sub.notes &&
                                sub.notes.map((n, ni) => (
                                  <Note key={ni} type={n.type}>
                                    {n.text}
                                  </Note>
                                ))}
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

      <div
        style={{
          textAlign: "center",
          padding: "24px",
          borderTop: "1px solid #1E293B",
          color: "#334155",
          fontSize: 12,
        }}
      >
        Kubernetes Complete Guide — Security · Networking · Monitoring · Use
        Cases
      </div>
    </div>
  );
}
