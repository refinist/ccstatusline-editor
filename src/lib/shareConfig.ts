import { TEMPLATES } from '@/templates';
import type { CcStatusConfig } from '@/widgets';

const PARAM_SHORT = 's';
// Template share links carry just the template id — the receiver rebuilds the
// config from the bundled template data, so sharing a template costs zero KV
// reads/writes (KV is reserved for user-authored configs).
const PARAM_TEMPLATE = 'tpl';

function homeRoot(): string {
  // origin + base, not the current route — so sharing from /templates still lands on the editor.
  return `${location.origin}${import.meta.env.BASE_URL}`;
}

/** Cheap shape check for a pasted/uploaded/shared config. Reused everywhere a config
 *  might come from outside the editor (share links, JSON import) — tighten here to
 *  tighten everywhere. */
export function isCcStatusConfig(value: unknown): value is CcStatusConfig {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as { lines?: unknown }).lines)
  );
}

/** Short share link: `?s=<id>` — needs the Worker + KV to resolve. */
export function buildShortShareUrl(id: string): string {
  const params = new URLSearchParams();
  params.set(PARAM_SHORT, id);
  return `${homeRoot()}?${params.toString()}`;
}

/** Template share link: `?tpl=<template id>` — resolved entirely client-side. */
export function buildTemplateShareUrl(tplId: string): string {
  const params = new URLSearchParams();
  params.set(PARAM_TEMPLATE, tplId);
  return `${homeRoot()}?${params.toString()}`;
}

export type ShareResult =
  | { id: string; error?: undefined }
  | { id?: undefined; error: 'rate_limited' | 'unavailable' };

/** POST the config to /api/share. The two failure modes the user can act on
 *  differently: rate_limited (wait a minute) vs unavailable (KV down/quota). */
export async function createShortShare(
  config: CcStatusConfig
): Promise<ShareResult> {
  try {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (res.status === 429) return { error: 'rate_limited' };
    if (!res.ok) return { error: 'unavailable' };
    const data: unknown = await res.json();
    const id = (data as { id?: unknown } | null)?.id;
    return typeof id === 'string' ? { id } : { error: 'unavailable' };
  } catch {
    return { error: 'unavailable' };
  }
}

async function resolveShortShare(id: string): Promise<CcStatusConfig | null> {
  try {
    const res = await fetch(`/api/share/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return isCcStatusConfig(data) ? data : null;
  } catch {
    return null;
  }
}

/** Editor-on-load entry point for `?tpl=<id>` / `?s=<id>` links:
 *  - `undefined` — no share param, nothing to do
 *  - `null` — a param was there but couldn't be resolved (expired/unknown/backend down)
 *  - `CcStatusConfig` — resolved successfully
 */
export async function resolveSharedConfig(): Promise<
  CcStatusConfig | null | undefined
> {
  const params = new URLSearchParams(location.search);
  const tplId = params.get(PARAM_TEMPLATE);
  if (tplId) {
    const tpl = TEMPLATES.find(t => t.id === tplId);
    // Clone so the editor mutates its own copy, never the bundled template data.
    return tpl ? structuredClone(tpl.config) : null;
  }
  const id = params.get(PARAM_SHORT);
  if (!id) return undefined;
  return await resolveShortShare(id);
}
