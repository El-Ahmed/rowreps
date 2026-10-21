# rowreps

Angular frontend.

## Run locally

```bash
npm install
npm start        # http://localhost:4200
npm test
npm run build    # output: dist/rowreps/browser
```

## Branches

- `main` is production. Nobody pushes to it directly; changes land through pull requests.
- Work on `feature/<name>` or `fix/<name>` branches.

## Deploy (Cloudflare Workers)

Cloudflare Workers Builds is connected to this repo and builds on every push. `wrangler.jsonc` serves `dist/rowreps/browser` as static assets.

- `main` → production, served on the custom domain.
- Any other branch → its own preview URL.

Build settings: build command `npm run build`, deploy command `npx wrangler deploy`, non-production deploy command `npx wrangler preview`, root directory `/`.

## Claude Code

Mention `@claude` in an issue or pull request comment and Claude works on it, pushing to a branch and opening a PR.
