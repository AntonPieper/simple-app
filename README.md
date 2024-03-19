# Simple Kubernetes Application

This is a simple application to demonstrate how to deploy a simple application consisting of a frontend, backend and database to a kubernetes cluster.

## Install dependencies

Install the postgres operator using [HELM](https://helm.sh/docs/intro/install/):

```sh
# add repo for postgres-operator
helm repo add postgres-operator-charts https://opensource.zalando.com/postgres-operator/charts/postgres-operator

# install the postgres-operator
helm install postgres-operator postgres-operator-charts/postgres-operator -f postgres-operator-values.yaml
```
