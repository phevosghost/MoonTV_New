# Stardm0 Migration

Application baseline: Stardm0/MoonTV, commit e6bcd14e53ffa5f7b18e072ae0f7debbf23f8be0 (4.2.5).
Previous production: a7ca81c8ee673e7ef38509fccc277e158f52d9e5.

## Preserved Settings

- Existing logo, favicon and all four desktop/PWA icons, byte for byte.
- Existing config.json and its 24 video sources, byte for byte.
- Existing Vercel project, domains and environment variables. No password is stored here.
- PASSWORD remains the private login variable; NEXT_PUBLIC_SITE_NAME and SITE_NAME remain supported.
- Content keyword filtering remains disabled, matching the previous site.
- JSON-first video details and double-encoded authentication cookies remain supported.
- Video segment proxy requires site authentication. Browser video caching remains off by default.

The current site uses localstorage, not a multi-user Redis database. Stardm0 does not include
the former IPTV module; this migration is a VOD upgrade, not a new live-TV integration.

## Future Updates

In GitHub Actions, run **Sync Stardm0 Safely**. It fetches upstream main, merges it into
a separate branch, restores this site's protected files, and runs compatibility checks,
type checking, unit tests and a production build before opening a pull request.
It does not merge the pull request or deploy production automatically.

Application-code conflicts stop the workflow and require manual resolution. Do not replace
authentication or config loading files wholesale to resolve such conflicts.
GitHub must allow Actions to create pull requests for the final step to succeed.

When intentionally updating video sources or artwork, update the SHA-256 entries in
customization-baseline.json in the same reviewed commit. Do not update the baseline merely
to hide an unexpected upstream overwrite.

The migration commit records both the old production history and the upstream history,
so subsequent merges compare against this Stardm0 baseline.

## Release Checks

Run `pnpm gen:runtime`, `node scripts/check-customizations.cjs`, `pnpm typecheck`,
`pnpm test --runInBand` and `pnpm build`. Test a Vercel preview with the existing login,
confirm the site name and the 24-source list, and play a known film before release.
Keep the previous deployment available for rollback.
