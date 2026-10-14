# The invite site

What an invite link opens when the app is not installed, or when the tap lands
in a browser rather than in Tsumiki.

`j/index.html` is the page. `404.html` and `index.html` are copies of it, which
is not duplication for its own sake: GitHub Pages has no rewrite rules, so a
request for `/j/<code>` that matches no file is served `404.html`, and that
page reads the code out of the URL exactly as the real one does. On a host
that *can* rewrite — Cloudflare Pages, Netlify, Vercel — `_redirects` sends
`/j/*` to `j/index.html` instead and the 404 copy is never reached.

Regenerate the copies after editing `j/index.html`:

    cp web/j/index.html web/404.html

`.well-known/apple-app-site-association` is what makes iOS open the app
directly instead of the browser. It only works when served from the domain
listed in `associatedDomains` in app.json, at the domain root — which a GitHub
project page cannot do, since its root belongs to the user site. That half
waits for tsumiki.day.

The Supabase publishable key in the page is public by design: it is the same
key that ships inside the app binary, and every row it can reach is behind
RLS. `get_invite` is a security-definer function that takes the code, so
knowing the key alone shows nobody anything.
