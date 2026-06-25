# POST-DEPLOY-HEALTHCHECK.md

Quick post-deploy success checklist for Weavenote.

## Success checklist

- [ ] `weavenote-app` is running
- [ ] App version matches the expected release
- [ ] Database status is `connected`
- [ ] No crash loop is visible in logs

## Suggested verification commands

Adjust these to match the deployment environment if needed.

### 1) Confirm container/app is running

```bash
docker ps --format '{{.Names}}\t{{.Status}}' | grep weavenote-app
```

Or if using Compose:

```bash
docker compose ps
```

### 2) Confirm deployed version

Check the running image tag, app release output, or the deployed commit/version endpoint.

Examples:

```bash
docker inspect weavenote-app --format '{{.Config.Image}}'
```

```bash
git rev-parse --short HEAD
```

### 3) Confirm database is connected

Check the application health endpoint, status page, or app logs for a successful database connection.

Example:

```bash
docker logs --tail 100 weavenote-app | grep -i database
```

Look for healthy messages such as `database connected` and absence of reconnect failures.

### 4) Confirm there is no crash loop

```bash
docker ps --format '{{.Names}}\t{{.RunningFor}}\t{{.Status}}' | grep weavenote-app
```

```bash
docker logs --tail 200 weavenote-app
```

Watch for repeated restarts, repeated boot banners, or recurring fatal errors.

## Pass criteria

A deploy is considered healthy when all of the following are true:

1. `weavenote-app` stays up normally
2. The reported version matches the intended release
3. Database connectivity is healthy
4. Logs show normal startup and steady-state behavior without restart churn
