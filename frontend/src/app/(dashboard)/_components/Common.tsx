import { BACKEND_DOMAIN } from "@/lib/backend";

const BackendDomain = BACKEND_DOMAIN;

const BackendApi = {
  Onboarding: {
    url: `${BackendDomain}/api/userOnboarding`,
    method: "post",
  },
  SettingCookies: {
    url: `${BackendDomain}/api/settingCookies`,
    method: "get",
  },
  Me: {
    url: `${BackendDomain}/api/me`,
    method: "get",
  },
  // ── Admin (RBAC) ──────────────────────────────────────────
  AdminUsers: {
    url: `${BackendDomain}/api/admin/users`,
    method: "get",
  },
  ApproveUser: (id: string) => ({
    url: `${BackendDomain}/api/admin/users/${id}/approve`,
    method: "patch",
  }),
  RejectUser: (id: string) => ({
    url: `${BackendDomain}/api/admin/users/${id}/reject`,
    method: "patch",
  }),
  SuspendUser: (id: string) => ({
    url: `${BackendDomain}/api/admin/users/${id}/suspend`,
    method: "patch",
  }),
  SetUserRole: (id: string) => ({
    url: `${BackendDomain}/api/admin/users/${id}/role`,
    method: "patch",
  }),
  SetUserDevices: (id: string) => ({
    url: `${BackendDomain}/api/admin/users/${id}/devices`,
    method: "patch",
  }),
  DeleteUser: (id: string) => ({
    url: `${BackendDomain}/api/admin/users/${id}`,
    method: "delete",
  }),
};

export default BackendApi;
