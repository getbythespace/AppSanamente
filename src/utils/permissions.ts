// src/utils/permissions.ts
import { OrgPlan, RoleType } from '@prisma/client'

export interface CurrentUser {
  id: string
  organizationId?: string | null
  organization?: { id: string; plan: OrgPlan } | null
  roles: Array<{ role: RoleType } | RoleType | string> // tolerante a formatos
}

/* ============ helpers básicos ============ */
export function rolesOf(user?: CurrentUser | null): Set<RoleType> {
  if (!user) return new Set()
  return new Set(
    (user.roles ?? []).map((r: any) => (typeof r === 'string' ? r : r.role)) as RoleType[]
  )
}

export function hasRole(user: CurrentUser | null | undefined, role: RoleType): boolean {
  return !!user && rolesOf(user).has(role)
}

export const isOwner        = (u?: CurrentUser | null) => hasRole(u!, RoleType.OWNER)
export const isAdmin        = (u?: CurrentUser | null) => hasRole(u!, RoleType.ADMIN)
export const isSuperadmin   = (u?: CurrentUser | null) => hasRole(u!, RoleType.SUPERADMIN)
export const isPsychologist = (u?: CurrentUser | null) => hasRole(u!, RoleType.PSYCHOLOGIST)
export const isAssistant    = (u?: CurrentUser | null) => hasRole(u!, RoleType.ASSISTANT)
export const isPatient      = (u?: CurrentUser | null) => hasRole(u!, RoleType.PATIENT)

export const isOwnerOrAdmin = (u?: CurrentUser | null) => isOwner(u) || isAdmin(u)

export function orgPlanOf(user?: CurrentUser | null): OrgPlan | null {
  return user?.organization?.plan ?? null
}

export const isPlanSolo  = (u?: CurrentUser | null) => orgPlanOf(u) === OrgPlan.SOLO
export const isPlanTeam  = (u?: CurrentUser | null) => orgPlanOf(u) === OrgPlan.TEAM
export const isPlanTrial = (u?: CurrentUser | null) => orgPlanOf(u) === OrgPlan.TRIAL

/* ============ permisos de invitación ============ */

/** Invitar ADMIN: SUPERADMIN siempre; OWNER solo si plan ≠ SOLO. ADMIN no crea ADMIN. */
export function canInviteAdmin(user?: CurrentUser | null): boolean {
  if (!user) return false
  if (isSuperadmin(user)) return true
  if (!isOwner(user)) return false
  return !isPlanSolo(user)
}

/** Invitar PSYCHOLOGIST: plan ≠ SOLO y rol ADMIN/OWNER/SUPERADMIN */
export function canInvitePsychologist(user?: CurrentUser | null): boolean {
  if (!user) return false
  if (isSuperadmin(user)) return true
  if (!(isOwner(user) || isAdmin(user))) return false
  return !isPlanSolo(user)
}

/** Invitar ASSISTANT: plan ≠ SOLO y rol ADMIN/OWNER/SUPERADMIN */
export function canInviteAssistant(user?: CurrentUser | null): boolean {
  if (!user) return false
  if (isSuperadmin(user)) return true
  if (!(isOwner(user) || isAdmin(user))) return false
  return !isPlanSolo(user)
}

/** Invitar PATIENT: permitido para ADMIN/PSYCHOLOGIST/ASSISTANT/OWNER/SUPERADMIN (incluye SOLO) */
export function canInvitePatient(user?: CurrentUser | null): boolean {
  if (!user) return false
  const rs = rolesOf(user)
  return (
    rs.has(RoleType.SUPERADMIN) ||
    rs.has(RoleType.OWNER) ||
    rs.has(RoleType.ADMIN) ||
    rs.has(RoleType.PSYCHOLOGIST) ||
    rs.has(RoleType.ASSISTANT)
  )
}

/* ============ cambios de plan ============ */

/** Owner en plan SOLO puede solicitar upgrade a TEAM. */
export function canRequestUpgrade(user?: CurrentUser | null): boolean {
  return !!user && isOwner(user) && isPlanSolo(user)
}

/** (alias por compatibilidad con tu naming previo) */
export const canRequestUpgradeSoloToTeam = canRequestUpgrade

/** Solo SUPERADMIN puede aprobar/rechazar solicitudes (usado por decision API) */
export function canApprovePlanChange(
  roles: Array<{ role: RoleType } | RoleType | string> | undefined
): boolean {
  if (!roles) return false
  const set = new Set(roles.map((r: any) => (typeof r === 'string' ? r : r.role)))
  return set.has(RoleType.SUPERADMIN)
}

/** Política anti-downgrade: solo permitimos pasar a TEAM como destino válido */
export function canChangeToPlan(target: OrgPlan): boolean {
  return target === OrgPlan.TEAM
}
