# Simple Kubernetes Application

This is a simple application to demonstrate how to deploy a simple application consisting of a frontend, backend and database to a kubernetes cluster.

## Install dependencies

Install the postgres operator using [HELM](https://helm.sh/docs/intro/install/):

### Add the postgres-operator repo

```sh
helm repo add postgres-operator-charts https://opensource.zalando.com/postgres-operator/charts/postgres-operator
```

### Install the postgres-operator

```sh
helm install postgres-operator postgres-operator-charts/postgres-operator -f postgres-operator-values.yaml
```

## Deploy the application

### Apply all the kubernetes resources

```sh
kubectl apply -f k8s/
```

### Create the database

```sh
# wait for the database to be ready
kubectl wait --for=condition=Ready pod -l cluster-name=simple-app-db

# create the database
export PGMASTER=$(kubectl get pods -o jsonpath={.items..metadata.name} -l application=spilo,cluster-name=simple-app-db,spilo-role=master -n default)
kubectl exec $PGMASTER -- psql -U simple_app_user -d simple_app -c "$(cat setup-db.sql)"
```

### Access the application

The frontend service is exposed on port 80. You can access the application using one of the following methods:

1.  Using `kubectl` port-forwarding:

    ```sh
    kubectl port-forward svc/frontend-service 8080:80
    ```

2.  Using `minikube`

    ```sh
    minikube service frontend-service
    ```
