# Pointing refractivelabs.com at GitHub Pages

The domain is registered at Squarespace (nameservers are Google Domains / Squarespace).
GitHub Pages is already configured for this repo with `refractivelabs.com` as the custom domain.

## 1. Squarespace DNS records

Squarespace → Domains → refractivelabs.com → DNS Settings.

Delete the existing Squarespace A records for `@` (the four 198.185.159.x / 198.49.23.x addresses)
and the `www` CNAME pointing at `ext-sq.squarespace.com`. Then add:

| Type  | Host | Value                                   |
|-------|------|-----------------------------------------|
| A     | @    | 185.199.108.153                         |
| A     | @    | 185.199.109.153                         |
| A     | @    | 185.199.110.153                         |
| A     | @    | 185.199.111.153                         |
| CNAME | www  | refractivelabs.github.io                |

Leave MX / TXT records for email alone.

## 2. Wait for DNS

Usually 5–30 minutes. Check with:

```
dig +short refractivelabs.com A
dig +short www.refractivelabs.com CNAME
```

## 3. Turn on HTTPS

Once DNS resolves, GitHub issues a Let's Encrypt cert automatically (can take up to an hour). Then either:

- GitHub → repo → Settings → Pages → check "Enforce HTTPS", or
- run: `gh api -X PUT repos/refractivelabs/refractivelabs.website/pages -F https_enforced=true`

## 4. (Optional) Verify the domain on the org

GitHub → Organization settings → Pages → Verified domains → add `refractivelabs.com`.
This prevents anyone else from claiming the domain on GitHub Pages if the repo is ever deleted.
