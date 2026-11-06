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
- `dev` → the only preview. Other branches don't get preview URLs.

Build settings: build command `npm run build`, deploy command `npx wrangler deploy`, non-production deploy command `npx wrangler preview`, root directory `/`.

## Exercise data

The exercise list comes from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) by [yuhonas](https://github.com/yuhonas), an open public domain dataset released under [The Unlicense](https://unlicense.org). Thank you!

`public/free-exercise-db/exercises.json` is a copy of its [`dist/exercises.json`](https://github.com/yuhonas/free-exercise-db/blob/main/dist/exercises.json) (commit `f00c92c`), next to its `LICENSE.md`. To update it:

```bash
curl -fsSL https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json -o public/free-exercise-db/exercises.json
```
