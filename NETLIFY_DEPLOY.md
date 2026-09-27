# Deploying to Netlify with a real database

Netlify hosts the frontend and can run the backend as a serverless
**Function** (already wired up: `netlify/functions/api.ts`), but Netlify has
no MySQL of its own. You need one real, always-on MySQL database that both
your local machine and Netlify can reach over the internet. Everyone who
registers an account will have their own row in that database's `users`
table, and their simulations are scoped to their account -- exactly like it
works locally today, just pointed at a real host instead of `127.0.0.1`.

## 1. Get a free hosted MySQL database (TiDB Serverless)

TiDB Serverless speaks the standard MySQL protocol (works with this repo's
`mysql2` driver, no code changes) and has a genuinely free tier.

1. Go to https://tidbcloud.com and sign up (free).
2. Create a **Serverless** cluster (a couple of clicks, no card required).
3. Once it's ready, click **Connect** on the cluster.
4. Choose "General" / "Connect with a client" and copy the four values it
   shows you: **Host**, **Port** (usually 4000), **User**, and generate/copy
   a **Password**. Note the database name too (or just use `test`, or create
   one named `node_simulator` from the cluster's SQL console:
   `CREATE DATABASE node_simulator;`).

Don't have or want a TiDB account? Any standard MySQL host works the same
way -- Railway's MySQL add-on, Aiven's free MySQL tier, PlanetScale, or your
own VPS. You just need: host, port, user, password, database name, and
whether it requires TLS (TiDB and most managed hosts do).

## 2. Set environment variables in Netlify

In your Netlify site: **Site configuration → Environment variables**, add:

| Key | Value |
|---|---|
| `MYSQL_HOST` | the host from step 1 |
| `MYSQL_PORT` | `4000` (TiDB) or whatever your host gave you |
| `MYSQL_USER` | the user from step 1 |
| `MYSQL_PASSWORD` | the password from step 1 |
| `MYSQL_DATABASE` | `node_simulator` (or whatever you named it) |
| `MYSQL_SSL` | `true` |
| `MYSQL_CONNECTION_LIMIT` | `3` |
| `JWT_SECRET` | a long random string -- generate one with `openssl rand -hex 32` |

`JWT_SECRET` is what signs everyone's login session. Pick a real random value
here (not the placeholder from `.env.example`) -- anyone who knew it could
forge a valid login for any account.

The app creates its own tables (`users`, `folders`, `simulations`,
`simulation_backups`) automatically the first time it connects, so there's no
separate migration step to run.

## 3. Connect the repo and deploy

1. In Netlify: **Add new site → Import an existing project**, pick this
   repo/branch.
2. Build settings are already committed in `netlify.toml`
   (`npm run build`, publish `dist`, functions `netlify/functions`) --
   Netlify should detect them automatically.
3. Deploy. Netlify builds the Vite frontend into `dist/` and bundles
   `netlify/functions/api.ts` (the whole Express app, including auth and the
   simulations/folders API) into a serverless function automatically.

## 4. Try it

Open the deployed site. You should land on the sign-in page (not the old
"Instant Demo Sign In" auto-login -- that only exists as a manual button, real
visitors register their own account). Register a new account, confirm a
freshly created account starts with zero simulations, then check
`/.netlify/functions/api/health` returns `{"status":"ok",...}` to confirm the
function can reach the database.

## Local development is unaffected

`npm run dev` still runs the plain Express server against your local MySQL
exactly as before -- none of this changes local dev. `MYSQL_SSL` defaults to
`false`, so a local `.env` without it keeps working unchanged.
