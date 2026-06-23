export async function verifyTurnstile(token: FormDataEntryValue | null, remoteIp?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  if (!token || typeof token !== "string") return false;

  const body = new URLSearchParams({
    secret,
    response: token
  });

  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    }
  });

  if (!response.ok) return false;

  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}
