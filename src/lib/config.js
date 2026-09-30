/**
 * Single source of truth for the deployed site URL.
 *
 * Nothing in the app navigates by absolute URL — routing and the mail API both
 * use relative paths, so the portal works on any domain without configuration.
 * This is only for the places that must *show* or *hand out* a full link, such
 * as the QR code you share on the morning of the event.
 *
 * Set VITE_SITE_URL on Vercel to pin it. Left unset, it resolves from the
 * browser, which is correct on localhost, on previews, and in production.
 */
const configured = String(import.meta.env.VITE_SITE_URL || '').trim().replace(/\/+$/, '')

export const SITE_URL =
  configured || (typeof window !== 'undefined' ? window.location.origin : '')

export const isSiteUrlPinned = Boolean(configured)

/** Absolute URL for a route, e.g. siteUrl('/participant/login'). */
export const siteUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`

export const PARTICIPANT_URL = () => siteUrl('/participant/login')
export const ADMIN_URL = () => siteUrl('/admin/login')
