# AI Agent Guide: Deploying Projects to Vercel

This guide instructs AI agents (Antigravity, Claude Code, Cursor, etc.) on how to autonomously build, configure, and deploy this project to Vercel.

---

## 1. Prerequisites Check

Before deploying, the agent must verify:
1. **Node & Package Manager**: Verify Node.js version and package manager (`npm`, `pnpm`, `yarn`, or `bun`).
2. **Vercel CLI**: Ensure Vercel CLI is accessible:
   ```bash
   vercel --version || npx vercel --version
   ```
3. **Authentication**: Check login status:
   ```bash
   vercel whoami
   ```
   - If not authenticated, request the user to provide a `VERCEL_TOKEN` or run `vercel login` once interactively.

---

## 2. Pre-Deployment Validation & Build Step

Never deploy broken code. Always validate the local build first:

```bash
# 1. Install dependencies
npm install

# 2. Check TypeScript / linting (if configured)
npm run lint 2>/dev/null || true

# 3. Test production build
npm run build
```

> **Rule for Agent**: If the build fails, fix compilation and bundling errors before proceeding with any deployment command.

---

## 3. Deployment Procedures

### Option A: Using Token-Based Authentication (Best for Autonomous Agents)
When running non-interactively or in CI/agent loops, pass `VERCEL_TOKEN`:

1. **Preview Deployment (Default & Recommended)**:
   ```bash
   npx vercel --token "$VERCEL_TOKEN" --yes
   ```
2. **Production Deployment (Only when explicitly asked for Production/Live)**:
   ```bash
   npx vercel --prod --token "$VERCEL_TOKEN" --yes
   ```

---

### Option B: Using Logged-In CLI Session
If the user has already logged in via `vercel login`:

1. **First-Time Linking**:
   ```bash
   vercel link --yes
   ```
2. **Preview Deploy**:
   ```bash
   vercel deploy
   ```
3. **Production Deploy**:
   ```bash
   vercel deploy --prod
   ```

---

### Option C: Instant Temporary Deploy (Zero Login Required)
If no Vercel account or token is configured, Vercel allows creating an unclaimed preview URL:

```bash
vercel deploy --temporary
```
The agent should print the temporary preview link so the user can review and claim it.

---

## 4. Environment Variables Handling

If the application requires environment variables:

1. Check for `.env.example` or `.env.local`.
2. Push required variables using the Vercel CLI:
   ```bash
   vercel env add <VARIABLE_NAME> production < <value>
   vercel env add <VARIABLE_NAME> preview < <value>
   ```
3. Pull remote environment variables for local testing:
   ```bash
   vercel env pull .env.local
   ```

---

## 5. Post-Deployment Output Format

After completing the deployment, the agent **MUST** report:
1. **Deployment Status**: Success / Failure
2. **Deployment URL**: Clickable link to preview or production (e.g. `https://project-name.vercel.app`)
3. **Inspect URL**: Link to the Vercel dashboard deployment logs
4. **Any Remaining Manual Actions**: (e.g., custom domain configuration, missing secrets)
