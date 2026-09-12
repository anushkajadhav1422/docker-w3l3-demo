# W3 L3 - Advanced GitHub Actions Workflows, Docker & Production Deployment

## 📌 Task Overview

The objective of this task is to extend GitHub Actions CI/CD with reusable workflows, Docker image build and push to GitHub Container Registry (GHCR), production deployment protection, and failure notifications.

### Subtasks

1. Reusable GitHub Actions workflow
2. Docker image build and push to GHCR on release
3. Production environment with manual approval
4. Slack failure notification

---

# 1. Create Project Directory

Go to the home directory:

```bash
cd ~
```

Create the project:

```bash
mkdir devops-task-W3L3
```

Enter the project:

```bash
cd devops-task-W3L3
```

Check the current directory:

```bash
pwd
```

List files:

```bash
ls -la
```

---

# 2. Initialize Git Repository

Initialize Git:

```bash
git init
```

Check Git status:

```bash
git status
```

---

# 3. Create Node.js Application

Create the application directory:

```bash
mkdir app
```

Create `package.json`:

```bash
nano app/package.json
```

Add:

```json
{
  "name": "w3l3-demo",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "test": "node test.js"
  }
}
```

---

# 4. Create Application Server

Create:

```bash
nano app/server.js
```

Add:

```javascript
const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("W3L3 Advanced GitHub Actions CI/CD Demo\n");
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

# 5. Create Test File

Create:

```bash
nano app/test.js
```

Add:

```javascript
console.log("Running tests...");

const result = 2 + 3;

if (result === 5) {
  console.log("Test passed: 2 + 3 = 5");
} else {
  console.log("Test failed");
  process.exit(1);
}
```

Test locally:

```bash
cd app
npm test
cd ..
```

Expected:

```text
Running tests...
Test passed: 2 + 3 = 5
```

---

# 6. Create Dockerfile

Create:

```bash
nano Dockerfile
```

Add:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY app/package*.json ./
COPY app/server.js .
COPY app/test.js .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
```

The Dockerfile:

- Uses Node.js 22 Alpine
- Creates a non-root user
- Runs the application as the non-root user
- Exposes port 3000

---

# 7. Create .dockerignore

Create:

```bash
nano .dockerignore
```

Add:

```text
node_modules
.git
.github
.env
npm-debug.log
```

This prevents unnecessary files from being copied into the Docker image.

---

# 8. Test Docker Image Locally

Build the Docker image:

```bash
sudo docker build -t w3l3-demo:local .
```

Run the container:

```bash
sudo docker run -d -p 3000:3000 --name w3l3-demo w3l3-demo:local
```

Test the application:

```bash
curl http://localhost:3000
```

Expected:

```text
W3L3 Advanced GitHub Actions CI/CD Demo
```

Stop the container:

```bash
sudo docker stop w3l3-demo
```

Remove the container:

```bash
sudo docker rm w3l3-demo
```

---

# 9. Create GitHub Actions Directory

Create:

```bash
mkdir -p .github/workflows
```

Check:

```bash
ls -la .github/workflows
```

The workflow directory contains:

```text
.github/
└── workflows/
    ├── reusable.yml
    └── release.yml
```

---

# 10. Create Reusable Workflow

Create:

```bash
nano .github/workflows/reusable.yml
```

Add:

```yaml
name: Reusable CI

on:
  workflow_call:

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Run tests
        working-directory: app
        run: npm test
```

### What is a reusable workflow?

A reusable workflow contains common CI steps that can be called by another workflow.

The important part is:

```yaml
on:
  workflow_call:
```

The release workflow calls it with:

```yaml
uses: ./.github/workflows/reusable.yml
```

---

# 11. Create Release Workflow

Create:

```bash
nano .github/workflows/release.yml
```

Add:

```yaml
name: Release Docker Deployment

on:
  release:
    types: [published]

permissions:
  contents: read
  packages: write

jobs:

  test:
    name: Reusable CI
    uses: ./.github/workflows/reusable.yml

  docker:
    name: Build and Push Docker Image
    needs: test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout release code
        uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:${{ github.event.release.tag_name }}
            ghcr.io/${{ github.repository }}:latest

  production:
    name: Production Deployment
    needs: docker
    runs-on: ubuntu-latest

    environment:
      name: production

    steps:
      - name: Production deployment
        run: |
          echo "Production deployment approved."
          echo "Deploying Docker image:"
          echo "ghcr.io/${{ github.repository }}:${{ github.event.release.tag_name }}"

      - name: Deployment completed
        run: echo "Production deployment successful."

  notify:
    name: Notify on Failure
    if: ${{ failure() }}
    needs:
      - test
      - docker
      - production
    runs-on: ubuntu-latest

    steps:
      - name: Send Slack notification
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        run: |
          curl -X POST \
            -H 'Content-type: application/json' \
            --data "{\"text\":\"❌ GitHub Actions pipeline failed for ${{ github.repository }}. Release: ${{ github.event.release.tag_name }}\"}" \
            "$SLACK_WEBHOOK_URL"
```

---

# 12. Understand the Release Trigger

The workflow uses:

```yaml
on:
  release:
    types: [published]
```

This means the workflow starts when a GitHub Release is published.

Example:

```text
Create Release
      ↓
Publish Release
      ↓
GitHub Actions starts
```

---

# 13. Understand Job Dependencies

The workflow uses `needs`.

```yaml
docker:
  needs: test
```

This means Docker build starts after the reusable CI test succeeds.

```yaml
production:
  needs: docker
```

This means production deployment starts after the Docker image is successfully built and pushed.

The flow is:

```text
Release Published
       ↓
Reusable CI
       ↓
Docker Build + Push
       ↓
Production Approval
       ↓
Production Deployment
```

---

# 14. Configure GitHub Container Registry (GHCR)

GHCR is GitHub's container registry for storing Docker images.

The workflow gives the job permission:

```yaml
permissions:
  contents: read
  packages: write
```

The workflow logs in using:

```yaml
username: ${{ github.actor }}
password: ${{ secrets.GITHUB_TOKEN }}
```

The Docker image is tagged as:

```text
ghcr.io/<owner>/<repository>:<release-tag>
```

and:

```text
ghcr.io/<owner>/<repository>:latest
```

For this project:

```text
ghcr.io/anushkajadhav1422/docker-w3l3-demo:v1.0.0
```

Example for another release:

```text
ghcr.io/anushkajadhav1422/docker-w3l3-demo:v1.0.1
```

---

# 15. Create Production Environment

Go to:

```text
GitHub Repository
    ↓
Settings
    ↓
Environments
    ↓
New environment
```

Create:

```text
production
```

The release workflow references it:

```yaml
environment:
  name: production
```

---

# 16. Configure Manual Production Approval

Open:

```text
Settings
    ↓
Environments
    ↓
production
```

Configure:

```text
Required reviewers
```

Select the GitHub account that should review the deployment.

For a self-testing repository, make sure **Prevent self-review** is disabled if you need to approve your own deployment.

The deployment flow becomes:

```text
Docker Build + Push
       ↓
production waiting for review
       ↓
Review / Approve
       ↓
Production Deployment
```

This demonstrates a protected production deployment.

---

# 17. Create GitHub Release

Go to:

```text
GitHub Repository
    ↓
Releases
    ↓
Create a new release
```

Create a tag such as:

```text
v1.0.0
```

Then publish the release.

The release workflow starts automatically.

---

# 18. Verify GitHub Actions

Open:

```text
GitHub Repository
    ↓
Actions
    ↓
Release Docker Deployment
```

Expected flow:

```text
✓ Reusable CI
✓ Build and Push Docker Image
🟡 Production Deployment - waiting for review
```

After approval:

```text
✓ Production Deployment
```

---

# 19. Verify GHCR Package

Open:

```text
GitHub Profile
    ↓
Packages
```

The package for this project is:

```text
docker-w3l3-demo
```

The package contains Docker images produced by the release workflow.

Release tags can include:

```text
v1.0.0
v1.0.1
latest
```

---

# 20. Configure Slack Failure Notification

The purpose of this step is to send a Slack message when the GitHub Actions pipeline fails.

### Create Slack App

Open the Slack API app page and create a blank app.

Example app name:

```text
GitHub Actions Notifications
```

Enable:

```text
Incoming Webhooks
```

Add a webhook to the desired Slack channel.

For this project, the webhook was configured for:

```text
#new-channel
```

---

# 21. Add Slack Webhook to GitHub Secrets

Go to:

```text
GitHub Repository
    ↓
Settings
    ↓
Secrets and variables
    ↓
Actions
    ↓
New repository secret
```

Create:

```text
Name:
SLACK_WEBHOOK_URL
```

Paste the Slack webhook URL as the secret value.

### Security

Never put the Slack webhook URL directly into:

- `release.yml`
- GitHub source code
- README
- Public messages

The workflow uses:

```yaml
${{ secrets.SLACK_WEBHOOK_URL }}
```

---

# 22. Understand Slack Notification Job

The notification job uses:

```yaml
if: ${{ failure() }}
```

This means the job runs when a required pipeline job fails.

It uses:

```yaml
needs:
  - test
  - docker
  - production
```

The webhook is loaded securely:

```yaml
env:
  SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

The message is sent using `curl`.

Example notification:

```text
❌ GitHub Actions pipeline failed for
anushkajadhav1422/docker-w3l3-demo.
Release: v1.0.2
```

The message should appear in:

```text
Slack
  ↓
#new-channel
```

---

# 23. Test Slack Failure Notification

For testing only, temporarily change the production completion step:

```yaml
- name: Deployment completed
  run: |
    echo "Testing Slack failure notification"
    exit 1
```

Commit and push the change:

```bash
git add .github/workflows/release.yml
git commit -m "Test Slack failure notification"
git push origin main
```

Create a test release:

```text
v1.0.2
```

Publish the release.

Expected workflow:

```text
Reusable CI                  ✓
      ↓
Build and Push Docker        ✓
      ↓
Production Deployment       ❌
      ↓
Notify on Failure            ✓
      ↓
Slack #new-channel           📩
```

Expected Slack message:

```text
❌ GitHub Actions pipeline failed for
anushkajadhav1422/docker-w3l3-demo.
Release: v1.0.2
```

---

# 24. Restore Production Workflow

After confirming the Slack notification works, remove the intentional failure.

Restore:

```yaml
- name: Deployment completed
  run: echo "Production deployment successful."
```

Then:

```bash
git add .github/workflows/release.yml
git commit -m "Restore production deployment"
git push origin main
```

The production workflow is now back to normal.

---

# 25. Git Commands

Check status:

```bash
git status
```

Add files:

```bash
git add .
```

Commit:

```bash
git commit -m "Add W3L3 advanced CI/CD workflow"
```

Push:

```bash
git push origin main
```

If remote changes need to be integrated first:

```bash
git pull --rebase origin main
```

Then:

```bash
git push origin main
```

---

# 26. Complete Project Structure

```text
devops-task-W3L3/
│
├── app/
│   ├── package.json
│   ├── server.js
│   └── test.js
│
├── Dockerfile
├── .dockerignore
│
└── .github/
    └── workflows/
        ├── reusable.yml
        └── release.yml
```

---

# 27. Complete CI/CD Architecture

```text
Developer
    │
    │ git push
    ▼
GitHub Repository
    │
    ▼
GitHub Release Published
    │
    ▼
Reusable CI Workflow
    │
    ▼
Run Tests
    │
    ▼
Docker Build
    │
    ▼
Push Docker Image
    │
    ▼
GitHub Container Registry
    │
    ▼
Production Environment
    │
    ▼
Manual Approval
    │
    ▼
Production Deployment
    │
    ├─────────────── Success
    │
    └─────────────── Failure
                         │
                         ▼
                   Slack Notification
                         │
                         ▼
                   #new-channel
```

---

# 28. What I Learned

## Reusable Workflows

Reusable workflows allow common CI steps to be shared between workflows using `workflow_call`.

## GitHub Releases

A release workflow can automatically start when a release is published.

## Docker

Docker packages the application and its runtime into a container image.

## GHCR

GitHub Container Registry stores and distributes Docker images associated with GitHub.

## Production Environment

GitHub Environments can protect production deployments with required reviewers.

## Manual Approval

A protected environment can pause a deployment until an authorized reviewer approves it.

## GitHub Secrets

Secrets securely store sensitive values such as Slack webhook URLs.

## Slack Notifications

GitHub Actions can send failure notifications to Slack using an incoming webhook.

## Job Dependencies

The `needs` keyword controls the order and dependency between jobs.

---

# 29. Final Task Summary

In this task, I extended a GitHub Actions pipeline with advanced CI/CD features.

First, I created a reusable CI workflow using `workflow_call` and used it from the release workflow.

Next, I configured the release workflow to build a Docker image and push it to GitHub Container Registry using the GitHub-provided token.

I configured a protected `production` environment with manual approval before the production deployment.

Finally, I configured a Slack incoming webhook and stored it securely as the `SLACK_WEBHOOK_URL` GitHub repository secret. The workflow includes a failure notification job that sends a message to the configured Slack channel when the pipeline fails.

---

# ⭐ Final W3 L3 Architecture

```text
                    GitHub Release
                          │
                          ▼
                  Reusable CI Workflow
                          │
                          ▼
                       Testing
                          │
                          ▼
                Docker Build + Push
                          │
                          ▼
                     GHCR Image
                          │
                          ▼
                Production Environment
                          │
                    Manual Approval
                          │
                          ▼
                  Production Deploy
                          │
             ┌────────────┴────────────┐
             │                         │
          Success                   Failure
             │                         │
             ▼                         ▼
        Deployment Done          Slack Webhook
                                       │
                                       ▼
                                #new-channel
```
