// src/services/index.ts
type Json = Record<string, any> | any[];

function trimHtml(text: string, max = 200) {
  // recorta y quita tags básicos para evitar overlays gigantes con HTML
  const stripped = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return stripped.length > max ? stripped.slice(0, max) + '…' : stripped;
}

async function readErrorMessage(res: Response) {
  const ct = res.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) {
      const j = await res.json();
      return j?.error || j?.message || `${res.status} ${res.statusText}`;
    }
    const t = await res.text();
    return trimHtml(t || `${res.status} ${res.statusText}`);
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

export async function getJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json', ...(init?.headers || {}) },
      ...init,
    });

    if (!response.ok) {
      // caso especial: 401 => estructura consistente
      if (response.status === 401) {
        return { ok: false, error: 'No autenticado' } as unknown as T;
      }
      const msg = await readErrorMessage(response);
      throw new Error(msg);
    }

    // algunos endpoints podrían devolver 204
    if (response.status === 204) return undefined as unknown as T;

    const ct = response.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      return (await response.json()) as T;
    }
    // fallback: texto plano → lo devolvemos dentro de un objeto
    const txt = await response.text();
    return ({ data: txt } as unknown) as T;
  } catch (error) {
    console.error('Error in getJson:', error);
    throw error;
  }
}

export async function postJson<T = any>(url: string, body?: any, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(init?.headers || {}) },
      body: body != null ? JSON.stringify(body) : undefined,
      ...init,
    });

    if (!response.ok) {
      const msg = await readErrorMessage(response);
      throw new Error(msg);
    }

    if (response.status === 204) return undefined as unknown as T;
    return (await response.json()) as T;
  } catch (error) {
    console.error('Error in postJson:', error);
    throw error;
  }
}

export async function putJson<T = any>(url: string, body?: any, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(init?.headers || {}) },
      body: body != null ? JSON.stringify(body) : undefined,
      ...init,
    });

    if (!response.ok) {
      const msg = await readErrorMessage(response);
      throw new Error(msg);
    }

    if (response.status === 204) return undefined as unknown as T;
    return (await response.json()) as T;
  } catch (error) {
    console.error('Error in putJson:', error);
    throw error;
  }
}

export async function deleteRequest<T = any>(url: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Accept': 'application/json', ...(init?.headers || {}) },
      ...init,
    });

    if (!response.ok) {
      const msg = await readErrorMessage(response);
      throw new Error(msg);
    }

    if (response.status === 204) return undefined as unknown as T;
    return (await response.json()) as T;
  } catch (error) {
    console.error('Error in deleteRequest:', error);
    throw error;
  }
}
