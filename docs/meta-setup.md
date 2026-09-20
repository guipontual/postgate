# Instagram: what Meta requires

*[Português](meta-setup.pt-BR.md)*

None of this can be packaged — the token belongs to your account.

1. **An Instagram Business or Creator account.** Personal accounts cannot
   publish through the API.
2. **A linked Facebook Page**, if you take the Facebook Login path.
3. **A Meta app** (developers.facebook.com) with the Instagram product enabled
   and the `instagram_basic` and `instagram_content_publish` permissions.
4. **A long-lived token** (60 days) and the account's **IG User ID**.

Store them as `META_LONG_LIVED_TOKEN` and `IG_USER_ID`.

## Which host?

Meta has two paths, and a token for one is rejected by the other:

| path | host | set `META_GRAPH_HOST` to |
|---|---|---|
| Instagram API with Instagram Login | `graph.instagram.com` | *(default, leave empty)* |
| Instagram Graph API via Facebook Login | `graph.facebook.com` | `https://graph.facebook.com` |

Getting this wrong returns **"Cannot parse access token"**, which looks exactly
like an expired token and is not. If you see that message with a freshly minted
token, it is the host.

## What bites you later

- **60 days go by.** Call `renovarToken()` on a monthly cron and store the new
  value wherever you keep secrets. Refreshing does not extend forever, and it
  only works from a *currently valid* token — let it expire and you are back to
  minting one by hand.
- **Publishing limit**: 25 posts per 24h per account. The queue respects your
  cadence, not the limit — enqueue 40 and the last ones fail.
- **Stories take no caption.** The text must be in the 1080×1920 artwork
  itself. The caption stays useful on the approval card.
- **Reels take time.** The container goes through processing before it can be
  published; the code waits. A large video can exceed the wait.
