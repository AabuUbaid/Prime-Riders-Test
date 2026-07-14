import { supabase } from "./supabaseClient";
import {
  Car, FilePlus2, ClipboardList, Plus, Landmark, Users, Wrench, Globe, FileText,
  Link2, ShieldAlert, Calculator, DollarSign, Target, Grid3x3, Scale,
} from "lucide-react";

export const ROLE_MASTER = "master";
export const ROLE_ADMIN = "admin";
export const ROLE_SALES = "sales_staff";

export const BOTTOM_NAV_ITEMS = [
  { id: "stock", label: "Stock", Icon: Car, roles: [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES] },
  { id: "quote", label: "New Quote", Icon: FilePlus2, roles: [ROLE_MASTER, ROLE_ADMIN] },
  { id: "emi", label: "EMI Calc", Icon: Calculator, roles: [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES] },
  { id: "deals", label: "Deals", Icon: ClipboardList, roles: [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES] },
  { id: "hub", label: "More", Icon: Grid3x3, roles: [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES] },
];

export const HUB_ITEMS = [
  { id: "deals", label: "Deals", desc: "Manage saved quotations & bookings", Icon: ClipboardList, roles: [ROLE_MASTER] },
  { id: "demand", label: "Cars in Demand", desc: "Customer requests & live stock matches", Icon: Target, roles: [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES] },
  { id: "proforma", label: "Proforma", desc: "Formal proforma invoices", Icon: FileText, roles: [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES] },
  { id: "loans", label: "Bank Loans", desc: "Finance application tracker", Icon: Landmark, roles: [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES] },
  { id: "accounts", label: "Accounts", desc: "Income, expenses & profit", Icon: DollarSign, roles: [ROLE_MASTER] },
  { id: "balance", label: "Balance", desc: "Payable/Collectable ledger", Icon: Scale, roles: [ROLE_MASTER, ROLE_ADMIN] },
  { id: "staff", label: "Staff", desc: "Records, visa, leave, commission", Icon: Users, roles: [ROLE_MASTER, ROLE_ADMIN] },
  { id: "users", label: "User Access", desc: "Manage staff login accounts & credentials", Icon: ShieldAlert, roles: [ROLE_MASTER] },
  { id: "procurement", label: "Procurement Check", desc: "Vehicle inspection & accident history", Icon: Wrench, roles: [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES] },
  { id: "public", label: "Public Stock List", desc: "Shareable listing for customers", Icon: Globe, roles: [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES] },
  { id: "integrations", label: "Integrations", desc: "CRM, WhatsApp & barcode setup", Icon: Link2, roles: [ROLE_MASTER] },
];

export const DEFAULT_STOCK_FILTERS = {
  query: "",
  statusFilter: "All",
  sourceFilter: "All",
  agedOnly: false,
  upcomingOnly: false,
  minPrice: "",
  maxPrice: "",
};

export function roleFromMetadata(user) {
  const role = (user?.user_metadata?.role || user?.app_metadata?.role || "").toString().trim().toLowerCase();
  if (role === ROLE_MASTER || role === ROLE_ADMIN || role === ROLE_SALES) return role;
  if (role === "sales" || role === "sales executive") return ROLE_SALES;
  if (role === "manager") return ROLE_ADMIN;
  if (role === "admin") return ROLE_ADMIN;
  return null;
}

export function getAllowedBottomNav(role) {
  return BOTTOM_NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function getAllowedHubItems(role) {
  return HUB_ITEMS.filter((item) => item.roles.includes(role));
}

export function canAccessTab(tab, role) {
  if (!role) return false;
  return getAllowedBottomNav(role).some((item) => item.id === tab) || getAllowedHubItems(role).some((item) => item.id === tab);
}

export function canEditStock(role) {
  return [ROLE_MASTER, ROLE_ADMIN].includes(role);
}

export function canImportStock(role) {
  return role === ROLE_MASTER;
}

export function canDeleteStock(role) {
  return [ROLE_MASTER, ROLE_ADMIN].includes(role);
}

export function canManageQuotes(role) {
  return [ROLE_MASTER, ROLE_ADMIN].includes(role);
}

export function canViewQuotes(role) {
  return [ROLE_MASTER, ROLE_ADMIN].includes(role);
}

export function canUseDeals(role) {
  return [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES].includes(role);
}

export function canViewDeals(role) {
  return [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES].includes(role);
}

export function canUseEmi(role) {
  return [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES].includes(role);
}

export function canUseStocks(role) {
  return [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES].includes(role);
}

export function canManageStaff(role) {
  return [ROLE_MASTER, ROLE_ADMIN].includes(role);
}

export function canViewStaff(role) {
  return [ROLE_MASTER, ROLE_ADMIN].includes(role);
}

export function canManageUserRoles(role) {
  return role === ROLE_MASTER;
}

export function canViewAccounts(role) {
  return role === ROLE_MASTER;
}

export function canViewIntegrations(role) {
  return role === ROLE_MASTER;
}

export function canViewProcurement(role) {
  return [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES].includes(role);
}

export function canViewProforma(role) {
  return [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES].includes(role);
}

export function canViewLoans(role) {
  return [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES].includes(role);
}

export function canViewBalance(role) {
  return [ROLE_MASTER, ROLE_ADMIN].includes(role);
}

export function canViewPublicStock(role) {
  return [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES].includes(role);
}

export function canViewDemand(role) {
  return [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES].includes(role);
}

export function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

export async function getCurrentUserRole() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = session?.user;
  if (!user || !user.email) return null;

  const email = normalizeEmail(user.email);
  const { data, error } = await supabase
    .from("user_roles")
    .select("role,active")
    .eq("email", email)
    .maybeSingle();
  if (!error && data?.active && [ROLE_MASTER, ROLE_ADMIN, ROLE_SALES].includes(data.role)) {
    return data.role;
  }

  const metaRole = roleFromMetadata(user);
  return metaRole || ROLE_SALES;
}

export async function getCurrentUserDisplayName() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = session?.user;
  if (!user || !user.email) return "";

  const email = normalizeEmail(user.email);
  const { data, error } = await supabase
    .from("user_roles")
    .select("display_name")
    .eq("email", email)
    .maybeSingle();
  if (!error && data?.display_name) {
    return data.display_name;
  }
  const metaName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name;
  return metaName || user.email.split("@")[0];
}

export async function listUserRoles() {
  const { data, error } = await supabase.from("user_roles").select("email,role,active,display_name,created_at,updated_at");
  if (error) throw error;
  return data || [];
}

export async function upsertUserRole(record) {
  const currentRole = await getCurrentUserRole();
  if (currentRole !== ROLE_MASTER) throw new Error("Unauthorized: Only Master can manage user roles");

  const payload = {
    email: normalizeEmail(record.email),
    role: record.role,
    active: record.active ?? true,
    display_name: record.display_name || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("user_roles").upsert(payload, { onConflict: "email" });
  if (error) throw error;
  return data;
}

export async function deleteUserRole(email) {
  const currentRole = await getCurrentUserRole();
  if (currentRole !== ROLE_MASTER) throw new Error("Unauthorized: Only Master can manage user roles");

  const normalized = normalizeEmail(email);
  const { error } = await supabase.from("user_roles").delete().eq("email", normalized);
  if (error) throw error;
  return true;
}

export async function resetUserPassword(email) {
  const normalized = normalizeEmail(email);
  const { data, error } = await supabase.auth.resetPasswordForEmail(normalized);
  if (error) throw error;
  return data;
}
