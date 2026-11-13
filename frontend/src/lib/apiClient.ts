/**
 * Safe API Client for Clash of Clans Analytics
 * ============================================
 * Prevents "Unexpected token '<'..." errors by validating Content-Type and HTTP status
 * before JSON parsing and exposes semantic error codes for EN/TR UI localization.
 */

export type ApiErrorCode =
  | "NETWORK"
  | "NOT_FOUND_ROUTE"
  | "GATEWAY"
  | "SERVER_ERROR"
  | "UNEXPECTED_RESPONSE"
  | "INVALID_JSON"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMIT"
  | "MAINTENANCE"
  | "HTTP_STATUS";

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  data: any;

  constructor(
    message: string,
    status: number = 0,
    data?: any,
    code: ApiErrorCode = "HTTP_STATUS"
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export async function safeFetchJson<T = any>(
  pathOrUrl: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const requestUrl =
    pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")
      ? pathOrUrl
      : `${baseUrl}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;

  let res: Response;
  try {
    res = await fetch(requestUrl, options);
  } catch (netErr: unknown) {
    const detail = netErr instanceof Error ? netErr.message : String(netErr);
    throw new ApiError(
      `Sunucuya bağlanılamadı (${detail}). Lütfen bağlantınızı kontrol edip tekrar deneyin.`,
      0,
      undefined,
      "NETWORK"
    );
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.toLowerCase().includes("application/json");

  if (!isJson) {
    if (res.status === 404) {
      throw new ApiError(
        "İstenen API servisine şu an ulaşılamıyor.",
        404,
        undefined,
        "NOT_FOUND_ROUTE"
      );
    }
    if (res.status === 502 || res.status === 504) {
      throw new ApiError(
        "Sunucu geçici olarak yanıt veremiyor. Lütfen biraz bekleyip tekrar deneyin.",
        res.status,
        undefined,
        "GATEWAY"
      );
    }
    if (res.status === 500) {
      throw new ApiError(
        "Sunucuda dahili bir sorun oluştu. Lütfen tekrar deneyin.",
        500,
        undefined,
        "SERVER_ERROR"
      );
    }
    throw new ApiError(
      "Sunucudan beklenmeyen bir yanıt alındı.",
      res.status,
      undefined,
      "UNEXPECTED_RESPONSE"
    );
  }

  let body: any;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(
      "Sunucu yanıtı okunamadı. Lütfen tekrar deneyin.",
      res.status,
      undefined,
      "INVALID_JSON"
    );
  }

  if (!res.ok) {
    if (res.status === 403) {
      throw new ApiError(
        body?.detail || "API erişimi yetkili değil; sunucu IP iznini kontrol edin.",
        403,
        body,
        "FORBIDDEN"
      );
    }
    if (res.status === 404) {
      throw new ApiError(
        body?.detail || "Aranan oyuncu veya klan kaydı bulunamadı.",
        404,
        body,
        "NOT_FOUND"
      );
    }
    if (res.status === 429) {
      throw new ApiError(
        "Çok fazla istek gönderildi. Lütfen birkaç saniye bekleyip tekrar deneyin.",
        429,
        body,
        "RATE_LIMIT"
      );
    }
    if (res.status === 503) {
      throw new ApiError(
        "Clash of Clans sunucuları şu an bakımda. Lütfen daha sonra tekrar deneyin.",
        503,
        body,
        "MAINTENANCE"
      );
    }
    throw new ApiError(
      body?.detail || body?.message || "Sunucu hatası oluştu. Lütfen tekrar deneyin.",
      res.status,
      body,
      "HTTP_STATUS"
    );
  }

  return body as T;
}
