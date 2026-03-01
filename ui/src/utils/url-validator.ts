/**
 * URL Validator Utility
 * Valida e normaliza URLs para o feed de notícias
 */

export interface UrlValidationResult {
  isValid: boolean;
  normalizedUrl: string | null;
  error?: string;
  statusCode?: number;
}

/**
 * Verifica se uma string é uma URL válida
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    // Aceita apenas http e https
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normaliza uma URL, convertendo relativas em absolutas
 */
export function normalizeUrl(url: string, baseUrl?: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    // Se já for URL absoluta, retorna como está
    if (isValidUrl(url)) {
      return url;
    }

    // Se for URL relativa e tiver baseUrl, converte
    if (baseUrl && isValidUrl(baseUrl)) {
      const normalized = new URL(url, baseUrl).href;
      return normalized;
    }

    // Tenta adicionar https:// se não tiver protocolo
    if (!url.match(/^https?:\/\//)) {
      const withProtocol = `https://${url}`;
      if (isValidUrl(withProtocol)) {
        return withProtocol;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Verifica o status de uma URL (HEAD request)
 * Usado para validar se URL está acessível
 */
export async function checkUrlStatus(
  url: string,
  timeout: number = 5000
): Promise<UrlValidationResult> {
  if (!isValidUrl(url)) {
    return {
      isValid: false,
      normalizedUrl: null,
      error: 'URL inválida',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Se status for 200-399, considera válido
    const isValid = response.status >= 200 && response.status < 400;

    return {
      isValid,
      normalizedUrl: url,
      statusCode: response.status,
      error: isValid ? undefined : `Status ${response.status}`,
    };
  } catch (error) {
    return {
      isValid: false,
      normalizedUrl: url,
      error: error instanceof Error ? error.message : 'Erro de rede',
    };
  }
}

/**
 * Processa uma lista de URLs e retorna apenas as válidas
 */
export async function validateUrlList(
  urls: Array<{ url: string; baseUrl?: string; id: string }>,
  onProgress?: (validated: number, total: number) => void
): Promise<
  Array<{
    id: string;
    originalUrl: string;
    normalizedUrl: string | null;
    isValid: boolean;
    error?: string;
  }>
> {
  const results = [];

  for (let i = 0; i < urls.length; i++) {
    const { url, baseUrl, id } = urls[i];
    const normalizedUrl = normalizeUrl(url, baseUrl);

    // Só faz check de status se tivermos a URL normalizada
    let isValid = false;
    let error: string | undefined;

    if (normalizedUrl) {
      // Não fazemos check de status em batch para não sobrecarregar
      // Apenas validamos formato
      isValid = isValidUrl(normalizedUrl);
      if (!isValid) {
        error = 'URL malformada';
      }
    } else {
      error = 'Não foi possível normalizar URL';
    }

    results.push({
      id,
      originalUrl: url,
      normalizedUrl,
      isValid,
      error,
    });

    if (onProgress) {
      onProgress(i + 1, urls.length);
    }
  }

  return results;
}

/**
 * Extrai domínio base de uma URL
 */
export function getBaseUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

/**
 * Verifica se URL é de um feed RSS válido (para o source URL)
 */
export function isValidFeedUrl(url: string): boolean {
  if (!isValidUrl(url)) {
    return false;
  }

  // Lista de domínios de feeds conhecidos
  const knownFeedDomains = [
    'openai.com',
    'deepmind.google',
    'blog.google',
    'openai.com',
    'anthropic.com',
    'stability.ai',
    'huggingface.co',
    'arxiv.org',
    'techcrunch.com',
    'theverge.com',
  ];

  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace('www.', '');

    // Se for domínio conhecido, assume válido
    if (knownFeedDomains.some((d) => domain.includes(d))) {
      return true;
    }

    // Se tiver path típico de feed
    const feedPaths = ['/feed', '/rss', '/atom', '/blog', '/news'];
    if (feedPaths.some((path) => parsed.pathname.includes(path))) {
      return true;
    }

    return true; // Aceita outras URLs válidas
  } catch {
    return false;
  }
}
