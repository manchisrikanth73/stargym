# Deploy StarGym

Build the web app, commit all staged/unstaged changes, and push to the current branch.

## Steps

1. Run `npm run build:web` and confirm it succeeds (look for "Exported: dist" in output).
2. Run `git status` and `git diff` to see what changed.
3. Stage all changed source files (never stage `cert.pem`, `key.pem`, or `dist/`).
4. Write a concise commit message describing what changed and why.
5. Commit and push to the current branch with `git push -u origin <branch>`.
6. Report the commit hash and confirm the push succeeded.
7. Remind the user to restart the server locally: `node server.js`
