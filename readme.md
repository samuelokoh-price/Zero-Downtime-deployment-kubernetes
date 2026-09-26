# 🚀 Zero-Downtime Deployments with Kubernetes

> A hands-on Kubernetes project demonstrating **scaling, rolling updates, blue-green deployments, health checks, self-healing, and zero-downtime application updates** using Minikube.

![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge\&logo=kubernetes\&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge\&logo=docker\&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge\&logo=node.js\&logoColor=white)
![Minikube](https://img.shields.io/badge/Minikube-2D3748?style=for-the-badge\&logo=kubernetes\&logoColor=white)

---

## 📌 Overview

This project explores how Kubernetes can keep an application available while its workloads are being updated.

I built and deployed a simple Node.js application to a local Kubernetes cluster using **Minikube**, then progressively introduced different deployment techniques:

* Basic Kubernetes deployments
* Horizontal scaling with multiple replicas
* Rolling updates
* Blue-green deployments
* Health checks
* Service-based traffic switching
* Pod self-healing
* Failure testing and troubleshooting

The goal was not simply to deploy an application, but to understand **what happens to application traffic when infrastructure changes underneath it**.

---

## 🏗️ Architecture

The application runs as a Node.js container inside Kubernetes.

```text
                        ┌──────────────────────┐
                        │       Developer      │
                        │                      │
                        │ kubectl / curl       │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │   Kubernetes Service │
                        │    hello-service     │
                        └──────────┬───────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
             ┌─────────────┐               ┌─────────────┐
             │  Blue Pods  │               │ Green Pods  │
             │             │               │             │
             │  App v1/v2  │               │   App v3    │
             └─────────────┘               └─────────────┘
                    │                             │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                           Kubernetes Scheduler
```

During blue-green deployment, the Service selector determines which version receives traffic.

```text
                 hello-service
                      │
                      │ selector:
                      │ color=blue
                      ▼
              ┌───────────────┐
              │   BLUE v2     │
              │   🟦 🟦 🟦    │
              └───────────────┘

                      ↓ switch selector

                 hello-service
                      │
                      │ selector:
                      │ color=green
                      ▼
              ┌───────────────┐
              │  GREEN v3     │
              │   🟩 🟩 🟩    │
              └───────────────┘
```

---

# 🎯 Project Goals

The main objectives were to understand:

* How Kubernetes Deployments manage application replicas
* How Kubernetes replaces pods during updates
* How `maxUnavailable` and `maxSurge` affect rolling updates
* How Services route traffic to pods
* How blue-green deployments can switch application versions
* How Kubernetes performs automatic pod recovery
* How health probes affect workload management
* How to troubleshoot failed deployments
* How application configuration can cause seemingly successful deployments to return unexpected versions

---

# 🧪 Deployment Journey

## Stage 1 — Basic Deployment

The first step was deploying the Node.js application to Minikube.

A Kubernetes `Deployment` was created with:

* Container image
* Container port
* Environment variables
* Readiness/liveness probes
* Initial replica configuration

### Deploy

```bash
kubectl apply -f deployment.yaml
```

### Verify

```bash
kubectl get pods
```

Example:

```text
NAME                                READY   STATUS    RESTARTS   AGE
hello-deployment-xxxxx              1/1     Running   0          30s
```

At this stage, the objective was simply to establish a healthy application running inside Kubernetes.

---

# 📈 Stage 2 — Scaling

The application was then scaled from a single pod to multiple replicas.

```yaml
spec:
  replicas: 3
```

After applying the updated configuration:

```bash
kubectl apply -f deployment.yaml
```

The cluster now maintained three application pods.

```bash
kubectl get pods
```

This demonstrated one of Kubernetes' fundamental capabilities:

> Instead of relying on a single application instance, Kubernetes can maintain multiple replicas of the workload.

---

# 🔄 Stage 3 — Rolling Updates

The next step was updating the application without intentionally taking the service offline.

The Deployment was configured with:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 1
```

### What this means

```text
Current state:

Pod v1     Pod v1     Pod v1
  🟦         🟦         🟦


During update:

Pod v1     Pod v1     Pod v2
  🟦         🟦         🟩


Next:

Pod v1     Pod v2     Pod v2
  🟦         🟩         🟩


Final:

Pod v2     Pod v2     Pod v2
  🟩         🟩         🟩
```

`maxUnavailable: 0` ensures Kubernetes does not intentionally reduce the available replica count during the update.

`maxSurge: 1` allows Kubernetes to temporarily create one additional pod while replacing the old pods.

### Update the image

```bash
kubectl set image deployment/hello-deployment \
  hello-container=node-test/hello-app:v2
```

### Monitor the rollout

```bash
kubectl rollout status deployment/hello-deployment
```

### Inspect the Deployment

```bash
kubectl get deployment
```

### Inspect the pods

```bash
kubectl get pods
```

---

# 🟦🟩 Stage 4 — Blue-Green Deployment

The next experiment used a different deployment strategy.

Instead of gradually replacing the existing application, two independent environments were created:

| Environment | Version         | Purpose               |
| ----------- | --------------- | --------------------- |
| 🔵 Blue     | Current version | Live application      |
| 🟢 Green    | New version     | Candidate for release |

The two Deployments ran simultaneously.

```text
                   Kubernetes Service
                         │
                         │
                  color=blue
                         │
                         ▼
                ┌─────────────────┐
                │   BLUE v2       │
                │  🟦 🟦 🟦       │
                └─────────────────┘


                GREEN v3
                🟩 🟩 🟩

                Not receiving
                production traffic
```

The green environment was tested independently before receiving traffic.

### Test the green deployment

```bash
kubectl port-forward deployment/hello-green 8081:80
```

After verifying that the new version worked correctly, traffic was switched by changing the Service selector.

### Switch traffic to green

```bash
kubectl patch service hello-service \
  -p '{"spec":{"selector":{"app":"hello","color":"green"}}}'
```

The traffic path then became:

```text
                 hello-service
                      │
                      │ color=green
                      ▼
                ┌───────────────┐
                │   GREEN v3    │
                │ 🟩 🟩 🟩      │
                └───────────────┘
```

The blue deployment remained available, making rollback possible by switching the Service selector back to `color=blue`.

---

# 🔍 Stage 5 — Continuous Verification

To continuously observe which application version was receiving traffic, the application exposed a `/version` endpoint.

The Kubernetes Service was forwarded to the local machine:

```bash
kubectl port-forward service/hello-service 8080:80
```

Then the endpoint was continuously queried:

```bash
while true; do
  curl -s http://localhost:8080/version
  sleep 1
done
```

This provided a simple way to observe version changes while deployment operations were taking place.

---

# 🩺 Health Checks

The Deployment also used Kubernetes probes to help determine whether containers were healthy and ready to receive traffic.

Conceptually:

```text
                Pod
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   Liveness Probe    Readiness Probe
        │                 │
        ▼                 ▼
 "Is the container     "Can this pod
    alive?"             receive traffic?"
```

This distinction is important during zero-downtime deployments.

A newly created pod should not receive traffic simply because its container process started.

It should first become **ready**.

---

# 🧯 Errors Encountered & Troubleshooting

One of the most useful parts of this project was discovering that a deployment can technically succeed while the application still behaves incorrectly.

## ❌ Problem 1 — Rolling Update Returned the Old Version

### Symptom

The Deployment was successfully updated to the `v2` image, but the `/version` endpoint still returned:

```text
v1
```

### Investigation

The container image had been updated, but the application's `VERSION` environment variable was still configured as:

```text
VERSION=v1
```

This meant the infrastructure was running the new image, while the application itself was still reporting the old version.

### Fix

The environment variable was updated:

```bash
kubectl set env deployment/hello-deployment VERSION=v2
```

### Lesson

> A successful Kubernetes rollout does not automatically mean the application is behaving as expected.

This was a useful reminder to verify the **application's actual behavior**, not just Kubernetes' deployment status.

---

# ❌ Problem 2 — Green Deployment Failed

### Symptom

The green Deployment was created for `v3`, but the pods failed to start correctly.

### Investigation

The `v3` image had not been built inside Minikube's Docker environment.

Because Minikube was using its own container runtime, the locally built image was not automatically available to the Kubernetes nodes.

### Fix

Minikube's Docker environment was enabled:

```bash
eval $(minikube docker-env)
```

Then the image was built:

```bash
docker build -t node-test/hello-app:v3 .
```

After redeploying, Kubernetes could access the image.

### Lesson

> When using local Kubernetes environments such as Minikube, understanding where container images are built and stored is essential.

---

# 🧪 Useful Kubernetes Commands

### View pods

```bash
kubectl get pods
```

### View deployments

```bash
kubectl get deployments
```

### View services

```bash
kubectl get services
```

### Describe a pod

```bash
kubectl describe pod <pod-name>
```

### View pod logs

```bash
kubectl logs <pod-name>
```

### Watch pods change in real time

```bash
kubectl get pods -w
```

### Check rollout status

```bash
kubectl rollout status deployment/hello-deployment
```

### View rollout history

```bash
kubectl rollout history deployment/hello-deployment
```

### Roll back a Deployment

```bash
kubectl rollout undo deployment/hello-deployment
```

---

# 📂 Project Structure

```text
.
├── deployment.yaml
├── service.yaml
├── blue-deployment.yaml
├── green-deployment.yaml
├── Dockerfile
├── package.json
├── package-lock.json
└── README.md
```

> File names may vary depending on the exact version of the project.

---

# 🧠 What I Learned

This project helped me move beyond simply running `kubectl apply` and understand what Kubernetes is actually doing during an application release.

### 1. Deployment status ≠ application correctness

Kubernetes can report a successful rollout while the application still returns unexpected data.

Application-level verification is therefore important.

### 2. Services provide an abstraction over pods

Clients do not need to know which individual pod is running the application.

The Service provides a stable access point while Kubernetes manages the underlying pods.

### 3. Rolling and blue-green deployments solve the same problem differently

**Rolling update:**

```text
Gradually replace old pods
        ↓
Old + new versions temporarily coexist
        ↓
Eventually all pods run new version
```

**Blue-green:**

```text
Blue = current environment
Green = new environment
        ↓
Test green
        ↓
Switch Service
        ↓
Green receives traffic
```

### 4. Kubernetes self-healing is observable

Deleting a managed pod provides a simple demonstration:

```bash
kubectl delete pod <pod-name>
```

The Deployment controller detects the missing replica and creates a replacement.

### 5. Troubleshooting requires checking multiple layers

A useful troubleshooting path from this project was:

```text
User reports problem
       ↓
Is the application reachable?
       ↓
Is the Service working?
       ↓
Are pods running?
       ↓
Are containers healthy?
       ↓
Is the correct image running?
       ↓
Are environment variables correct?
       ↓
What do the application logs say?
       ↓
What does the application actually return?
```

---

# 🚧 Next Steps

The next stage of the project is to deliberately introduce failures and observe Kubernetes' behavior.

Planned experiments:

* Delete running pods and observe self-healing
* Introduce a broken image
* Introduce failing health checks
* Test failed rollouts
* Perform manual rollbacks
* Observe ReplicaSet behavior
* Test what happens when the application becomes unavailable
* Monitor pod replacement during failures

---

# 🎓 Key Concepts Demonstrated

| Concept                  | Demonstrated |
| ------------------------ | :----------: |
| Kubernetes Deployment    |       ✅      |
| Pod replicas             |       ✅      |
| Scaling                  |       ✅      |
| Readiness probes         |       ✅      |
| Liveness probes          |       ✅      |
| Rolling updates          |       ✅      |
| Blue-green deployments   |       ✅      |
| Service selectors        |       ✅      |
| Zero-downtime strategy   |       ✅      |
| Application verification |       ✅      |
| Troubleshooting          |       ✅      |
| Kubernetes self-healing  |      🔜      |
| Rollbacks                |      🔜      |
| Failure testing          |      🔜      |

---

# 💡 Why This Project Exists

This project was built as a practical experiment to understand how Kubernetes can support application releases without requiring a complete service shutdown.

Rather than only following deployment commands, the project deliberately introduced configuration mistakes and deployment problems to understand how to **observe, diagnose, and recover from failures**.

That troubleshooting mindset is an important part of operating production infrastructure.

---

## 👨‍💻 Author

**Samuel Okoh**

Cloud / DevOps Engineer in training

Focused on:

`Linux` · `AWS` · `Docker` · `Kubernetes` · `Terraform` · `CI/CD` · `Infrastructure Automation`

---

⭐ If you found this project useful, feel free to explore the repository and the deployment manifests.
