# Kubernetes From Scratch

You already know Docker and YAML. That's not a coincidence in how this guide
is ordered — **Kubernetes is what runs your containers at scale, and it's
configured almost entirely in YAML.** Everything from the last two guides
was building toward this one.

---

## 1. What problem does Kubernetes actually solve?

Say you `docker run` your API Sisyphus container on one server. It works.
Then:

- The server crashes at 3 AM. Nobody restarts your container. It's down
  until a human notices.
- Traffic spikes. One container can't handle it — you need 5 copies running,
  load-balanced. Doing that by hand across multiple servers is a nightmare.
- You want to deploy a new version with zero downtime, and roll back
  instantly if it's broken.
- You have 15 different services (API, database, cache, worker queue) and
  need them to find and talk to each other reliably.

**Kubernetes (K8s) is software that manages containers across a cluster of
machines for you** — restarting crashed ones, scaling up/down, routing
traffic, rolling out updates safely, and doing it all from a declarative
config (YAML) instead of manual commands. You describe the *desired state*
("I want 3 copies of this container running"), and Kubernetes continuously
works to make reality match that description.

That last sentence is the single most important idea in this entire guide.
Kubernetes is not a script that runs once — it's a **control loop** that
never stops checking "does the real world match what was asked for?" and
fixing it if not.

---

## 2. The architecture — two kinds of machines

A Kubernetes **cluster** is a group of machines (real or virtual), split
into two roles:

### Control Plane (the "brain")
Makes decisions, but doesn't run your application containers.

| Component | What it does |
|---|---|
| **API Server** | The front door. Every command you run (`kubectl`) talks to this. |
| **etcd** | A database storing the entire cluster's state — what *should* be running. |
| **Scheduler** | Decides which worker node a new container should run on. |
| **Controller Manager** | Runs the control loops — constantly checks "does reality match etcd?" |

### Worker Nodes (where your containers actually run)

| Component | What it does |
|---|---|
| **kubelet** | An agent on each node that talks to the control plane and actually starts/stops containers. |
| **kube-proxy** | Handles networking so containers can reach each other. |
| **Container runtime** | The thing actually running containers (Docker, containerd). |

**The flow:** you write a YAML file describing what you want → `kubectl
apply` sends it to the API Server → it's saved in etcd → the Scheduler
assigns it to a node → that node's kubelet starts the container → the
Controller Manager keeps watching forever, and if that container dies, it
notices and starts a new one, automatically.

You will not manage this architecture by hand day to day — but understanding
it is why every debugging step later in this guide (`kubectl describe`,
`kubectl logs`) makes sense: you're always asking either "what does etcd
say should exist?" or "what does the node say is actually happening?"

---

## 3. The core objects (this is 90% of daily Kubernetes)

Everything below is written in YAML — the exact skills from your last guide
apply directly here. Every K8s manifest follows the same top-level shape:

```yaml
apiVersion: ...
kind: ...
metadata:
  name: ...
spec:
  ...
```

- **`apiVersion`** — which version of the Kubernetes API this object type uses
- **`kind`** — what kind of object this is (Pod, Deployment, Service, etc.)
- **`metadata`** — name, labels, namespace
- **`spec`** — the actual desired state, different for every kind

### 3.1 Pod — the smallest unit

A Pod is one or more containers that always run together on the same node,
sharing network and storage. Almost always, a Pod has exactly **one**
container — think of a Pod as "a container, plus some Kubernetes wrapping."

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: apv-pod
  labels:
    app: attack-path-visualizer
spec:
  containers:
    - name: apv
      image: your-dockerhub-username/attack-path-visualizer:latest
      ports:
        - containerPort: 80
```

**You will almost never create a bare Pod directly.** Pods are fragile —
if one dies, nothing brings it back automatically. That's what Deployments
are for.

### 3.2 Deployment — Pods that manage themselves

A Deployment wraps Pods with self-healing and scaling. This is the object
you'll use constantly.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: apv-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: attack-path-visualizer
  template:
    metadata:
      labels:
        app: attack-path-visualizer
    spec:
      containers:
        - name: apv
          image: your-dockerhub-username/attack-path-visualizer:latest
          ports:
            - containerPort: 80
```

Read this with your YAML knowledge: `spec.template` is itself a full Pod
definition, nested inside the Deployment. `replicas: 3` tells Kubernetes
"always keep exactly 3 copies of this Pod running." If one crashes, the
Deployment's controller notices and starts a replacement — automatically,
with no human involved.

**`selector.matchLabels` and `template.metadata.labels` must match.** This
is the single most common beginner mistake — if they don't match exactly,
the Deployment can't find its own Pods.

### 3.3 Service — stable networking

Pods die and get replaced constantly, and each replacement gets a *new*
internal IP address. If your frontend tries to talk directly to a backend
Pod's IP, it'll break the moment that Pod restarts. A **Service** gives a
stable address that automatically routes to whichever Pods are currently
alive and match its label selector.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: apv-service
spec:
  selector:
    app: attack-path-visualizer
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

Three `type` values you'll actually use:

| Type | What it does |
|---|---|
| `ClusterIP` (default) | Only reachable *inside* the cluster — for internal service-to-service traffic |
| `NodePort` | Opens a port on every node, reachable from outside — good for local testing |
| `LoadBalancer` | Provisions a real external load balancer (on cloud providers like AWS/GCP) |

### 3.4 ConfigMap & Secret — configuration, separated from code

Never hardcode config or credentials into your container image. ConfigMaps
hold non-sensitive config; Secrets hold sensitive values (base64-encoded,
not encrypted by default — that matters, see §7).

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: apv-config
data:
  NODE_ENV: production
  API_BASE_URL: https://api.example.com
---
apiVersion: v1
kind: Secret
metadata:
  name: apv-secret
type: Opaque
data:
  DB_PASSWORD: c2VjcmV0MTIz   # this is base64, not encryption
```

Then reference them from a Pod/Deployment:
```yaml
      containers:
        - name: apv
          image: your-image
          envFrom:
            - configMapRef:
                name: apv-config
            - secretRef:
                name: apv-secret
```

### 3.5 Namespace — isolation within a cluster

A Namespace is a way to partition one cluster into virtual sub-clusters —
e.g. `dev`, `staging`, `production`, all on the same physical cluster
without colliding.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dev
```

```bash
kubectl apply -f deployment.yaml -n dev
```

### 3.6 Ingress — routing traffic from the outside world by URL

A Service exposes one app. An **Ingress** sits in front of multiple
Services and routes based on domain/path — e.g. `api.example.com` goes to
one Service, `app.example.com` goes to another, both through one entry
point.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: apv-ingress
spec:
  rules:
    - host: apv.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: apv-service
                port:
                  number: 80
```

(Ingress requires an "Ingress Controller" installed in your cluster to
actually work — nginx-ingress is the most common. Don't worry about this
until you're past the basics.)

---

## 4. kubectl — the command line you'll live in

```bash
kubectl apply -f deployment.yaml     # create/update from a YAML file
kubectl get pods                     # list running pods
kubectl get deployments
kubectl get services
kubectl get all                      # everything at once

kubectl describe pod <pod-name>      # detailed info + recent events (your #1 debugging tool)
kubectl logs <pod-name>              # see container output/errors
kubectl logs -f <pod-name>           # follow logs live, like `tail -f`

kubectl exec -it <pod-name> -- bash  # shell into a running container

kubectl delete -f deployment.yaml    # tear down what you applied
kubectl scale deployment apv-deployment --replicas=5   # scale on the fly

kubectl rollout status deployment apv-deployment   # watch a rollout
kubectl rollout undo deployment apv-deployment     # roll back to previous version
```

**When something's broken, this is the actual debugging order that works:**
1. `kubectl get pods` — is it even running? What state is it in (`Pending`,
   `CrashLoopBackOff`, `ImagePullBackOff`)?
2. `kubectl describe pod <name>` — scroll to the **Events** section at the
   bottom. This tells you *why* — wrong image name, not enough resources,
   failed health check, etc.
3. `kubectl logs <name>` — see what the application itself printed before
   it died.

Get comfortable with that 3-step loop. It solves the overwhelming majority
of real Kubernetes problems.

---

## 5. Hands-on: run a real cluster on your own machine

You don't need a cloud account to learn this. **minikube** runs a real,
single-node Kubernetes cluster locally, inside Docker.

```bash
# install (check the official minikube docs for the current command for
# your OS — installation steps do change over time)
minikube start

# confirm it's running
kubectl get nodes

# open a dashboard in your browser (optional but great for visualizing)
minikube dashboard
```

Once `minikube start` finishes, `kubectl` is already pointed at it — every
command in §4 works immediately against your local cluster.

---

## 6. Real exercise: deploy Attack Path Visualizer to your local cluster

This ties everything together. Steps, not full solutions — write the YAML
yourself using §3 as reference, same approach as the YAML practice set.

1. **Build and tag a Docker image** of Attack Path Visualizer locally:
   ```bash
   docker build -t apv:local .
   ```
2. **Load it into minikube** (minikube can't see your local Docker images
   by default):
   ```bash
   minikube image load apv:local
   ```
3. **Write a Deployment** manifest using `image: apv:local`,
   `imagePullPolicy: Never` (so it uses the local image instead of trying
   to pull from a registry), 2 replicas, matching labels.
4. **Write a Service** of `type: NodePort` pointing at that Deployment.
5. Apply both: `kubectl apply -f deployment.yaml` and
   `kubectl apply -f service.yaml`
6. Check it's running: `kubectl get pods` — you should see 2 Pods.
7. Access it: `minikube service apv-service` — this opens it in your
   browser automatically.
8. **Break it on purpose:** `kubectl delete pod <one-of-the-pod-names>` —
   watch `kubectl get pods` immediately after. A replacement Pod appears
   within seconds. That's the self-healing control loop from §1, happening
   in front of you.

If you get stuck on any step, paste me the exact error from `kubectl
describe pod` or `kubectl logs` and I'll help you debug it — that's the
most realistic way to actually learn this.

---

## 7. Where this connects to DevSecOps (your actual direction)

Once the above is solid, the security-specific layer on top of Kubernetes
includes:

- **RBAC** (Role-Based Access Control) — controlling who/what can do what
  in the cluster
- **Network Policies** — restricting which Pods can talk to which (default
  Kubernetes networking is wide open between Pods, which surprises people)
- **Secrets are base64, not encrypted by default** — worth understanding
  properly before you ever put real credentials in a Secret; tools like
  **Sealed Secrets** or **HashiCorp Vault** exist specifically to fix this
- **Pod Security Standards** — restricting what containers are allowed to
  do (run as root, mount the host filesystem, etc.)
- **Image scanning** (Trivy, from the roadmap list) — scanning container
  images for known vulnerabilities *before* they run in the cluster

Don't try to learn these yet — they only make sense once §1–6 are genuinely
comfortable. This section is here so you know the path continues in a
direction that matches your actual goal, not so you chase it prematurely.

---

## 8. Quick-reference cheat sheet

```yaml
# Deployment skeleton
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-image:tag
          ports:
            - containerPort: 8080

---
# Service skeleton
apiVersion: v1
kind: Service
metadata:
  name: my-app-service
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

```bash
kubectl apply -f file.yaml
kubectl get pods / deployments / services / all
kubectl describe pod <name>
kubectl logs <name>
kubectl exec -it <name> -- bash
kubectl delete -f file.yaml
kubectl scale deployment <name> --replicas=N
```

---

## What to actually do next

Don't read this twice. **Install minikube and do §6 today**, even if it
takes a few tries and some `kubectl describe` debugging along the way —
that struggle is where this actually sinks in, the same way writing your
own YAML did. Come back with real errors from your own terminal, and we'll
work through them together.
