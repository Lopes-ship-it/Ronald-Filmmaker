/**
 * Builds a WhatsApp deep link with a pre-filled message.
 *
 * `baseUrl` is the raw link saved in site settings (`settings.whatsapp`),
 * which may already carry query params (phone, utm_source, etc) from the
 * WhatsApp "click to chat" link generator. This overwrites/sets only the
 * `text` param and leaves everything else in the URL untouched.
 *
 * An admin pasting a link straight from the generator sometimes drops the
 * scheme (`wa.me/55...` instead of `https://wa.me/55...`) — `new URL()`
 * throws on that, and previously this just returned the raw, scheme-less
 * string, which the browser then treats as a path relative to the site's
 * own domain instead of an external link. Retrying once with `https://`
 * prepended fixes the common case without needing the admin to notice.
 */
export function buildWhatsAppLink(baseUrl: string, message: string): string {
  const trimmed = baseUrl.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (message) {
      url.searchParams.set("text", message);
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}
