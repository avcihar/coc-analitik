/**
 * Safe API Client for Clash of Clans Analytics
 * ============================================
 * Prevents "Unexpected token '<'..." errors by validating Content-Type and HTTP status
 * before JSON parsing. Maps CoC API error codes to clear Turkish user messages.
 */

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number = 0, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function safeFetchJson<T = any>(
  pathOrUrl: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const requestUrl = pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")
    ? pathOrUrl
    : `${baseUrl}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;

  let res: Response;
  try {
    res = await fetch(requestUrl, options);
  } catch (netErr: unknown) {
    const detail = netErr instanceof Error ? netErr.message : String(netErr);
    throw new ApiError(
      `Sunucuya bağlanılamadı (${detail}). Lütfen internet bağlantınızı ve sunucunun çalıştığını kontrol edin.`,
      0
    );
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.toLowerCase().includes("application/json");

  // Non-JSON response (e.g. HTML 404/502 page from Next.js dev server, reverse proxy or CDN)
  if (!isJson) {
    if (res.status === 404) {
      throw new ApiError(
        `İstenen API rotası bulunamadı (HTTP 404). Backend servisinin 8000 portunda çalıştığından emin olun.`,
        404
      );
    }
    if (res.status === 502 || res.status === 504) {
      throw new ApiError(
        `Sunucu ağ geçidi hatası (HTTP ${res.status}). Backend servisi kapalı veya yanıt veremiyor.`,
        res.status
      );
    }
    throw new ApiError(
      `Sunucudan beklenmeyen yanıt geldi (HTTP ${res.status}). Beklenen JSON verisi yerine farklı format alındı.`,
      res.status
    );
  }

  let body: any;
  try {
    body = await res.json();
  } catch (jsonErr: unknown) {
    throw new ApiError(
      `Sunucudan gelen JSON verisi çözümlenemedi (HTTP ${res.status}).`,
      res.status
    );
  }

  if (!res.ok) {
    if (res.status === 403) {
      throw new ApiError(
        body?.detail || "API anahtarı bu IP için yetkili değil, anahtarın izinli IP'sini kontrol edin.",
        403,
        body
      );
    }
    if (res.status === 404) {
      throw new ApiError(
        body?.detail || "Aranan kayıt veya oyuncu bulunamadı (404).",
        404,
        body
      );
    }
    if (res.status === 429) {
      throw new ApiError(
        "API hız sınırı aşıldı (429). Lütfen birkaç saniye bekleyip tekrar deneyin.",
        429,
        body
      );
    }
    if (res.status === 503) {
      throw new ApiError(
        "Clash of Clans sunucuları bakımda (503). Lütfen daha sonra tekrar deneyin.",
        503,
        body
      );
    }
    throw new ApiError(
      body?.detail || body?.message || `Sunucu Hatası (HTTP ${res.status})`,
      res.status,
      body
    );
  }

  return body as T;
}

