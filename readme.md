# Zero Downtime Deployment with kubernetes

This project demonstrates deploying a simple Node.js application on Kubernetes using **Minikube**. It covers the essential rollout strategies: basic deployment, scaling, rolling updates, and blue‑green deployment.

---

## Stage 1: Basic Deployment
- Created a `Deployment` manifest (`deployment.yaml`) for the Node.js app.
- Defined container image (`node-test/hello-app:v1`), ports, and probes.
- Applied with:
  ```bash
  kubectl apply -f deployment.yaml

**verified the pods**
    kubectl get pods
    ```

## Stage 2: Stage 2: Scaling
- Increased replicas to run multiple pods:
    spec:
      replicas: 3
- Applied changes and confirmed
    kubectl get pods

## Stage 3: Rolling Updates
- Updated the Deployment to use a new image (v2).
- Configured rolling update strategy in the yaml file:
    strategy:
        type: RollingUpdate
        rollingUpdate:
            maxUnavailable: 0
            maxSurge: 1
- Applied update:
    kubectl set image deployment/hello-deployment hello-container=node-test/hello-app:v2
- Verified rollout:
    kubectl rollout status deployment/hello-deployment

## Stage 4: Blue‑Green Deployment
- Created two separate deployments but slighly identical:
    Blue: current stable version (hello-blue)
    Green: new version (hello-green)
- Service initially pointed to blue pods in the yaml file:
    selector:
        app: hello
        color: blue
- Tested green pods directly using port‑forward.
- Switched Service selector to green:
    kubectl patch service hello-service -p '{"spec":{"selector":{"app":"hello","color":"green"}}}'
- Verified traffic now routed to green pods.

## Stage 5: Verification and Continuous Access
- Used port‑forwarding to access the app:
    kubectl port-forward service/hello-service 8080:80
- Continuously tested version endpoint:
    while true; do curl -s http://localhost:8080/version; sleep 1; done
- Confirmed smooth transitions between versions without downtime

## Errors Encountered & Fixes

**1. Rolling Update not showing new version**
- **Issue:** After rollout to v2, curl still returned v1.
- **Cause:** Deployment image was updated to v2, but the environment variable VERSION was still set to v1.
- **Fix:** Patched the Deployment directly:
        kubectl set env deployment/hello-deployment VERSION=v2

**2. Blue‑Green Deployment failed for v3**
- **Issue:** Created green-deployment.yaml pointing to v3, but pods failed.
- **Cause:** The v3 image hadn’t been built inside Minikube’s Docker.
- **Fix:** Built the image in Minikube’s Docker environment:
        eval $(minikube docker-env)
        docker build -t node-test/hello-app:v3 .

## Note
- Always ensure environment variables match the intended version during rollouts.
- Build new images inside Minikube’s Docker before deploying.
- Blue‑green deployment provides instant rollback by flipping Service selectors.
- Kubernetes self‑heals pods automatically when they fail or are deleted

## Next Steps
- **Stage 6:** Handling Failure — practice rollbacks, delete pods intentionally, and observe Kubernetes self‑healing.
