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

## Deploy (Cloudflare Pages)

Cloudflare Pages is connected to this repo and builds on every push:

- `main` → production, served on the custom domain.
- Any other branch → its own preview URL, e.g. `feature/login` → `https://feature-login.rowreps.pages.dev`.

Build settings: framework preset **Angular**, build command `npm run build`, output directory `dist/rowreps/browser`.

## Claude Code

Mention `@claude` in an issue or pull request comment and Claude works on it, pushing to a branch and opening a PR.
