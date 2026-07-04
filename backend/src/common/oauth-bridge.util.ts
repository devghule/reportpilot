// Renders a tiny page for OAuth popup windows. It posts the result back to
// the window that opened it (the sidebar iframe's window) and closes itself.
// Needed because popups can't return values directly — postMessage is the
// only way for the opener to receive the outcome.
export function oauthBridgePage(type: string, payload: unknown): string {
  const json = JSON.stringify({ type, payload }).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html>
  <body>
    <script>
      if (window.opener) {
        window.opener.postMessage(${json}, '*');
      }
      window.close();
    </script>
  </body>
</html>`;
}
