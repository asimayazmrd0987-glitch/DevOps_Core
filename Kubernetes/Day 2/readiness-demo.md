| Field                 | What it does                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `readinessProbe`      | Determines if the pod is **ready to receive traffic**. If it fails, the pod is removed from Service endpoints. |
| `livenessProbe`       | Determines if the pod is **still alive**. If it fails repeatedly, K8s **restarts** the container.              |
| `initialDelaySeconds` | Seconds to wait **before the first probe** after container start.                                              |
| `periodSeconds`       | How often to run the probe.                                                                                    |
