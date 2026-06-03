"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Ban,
  Cpu,
  Loader2,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { BACKEND_DOMAIN } from "@/lib/backend";

const BACKEND = BACKEND_DOMAIN;

type AppUser = {
  _id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  user_role: "owner" | "admin" | "farmer";
  status: string;
  devices?: string[];
  device_id?: string | null;
  district?: string | null;
  region?: string | null;
  phone?: string | null;
  createdAt?: string;
};

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending_approval: "bg-amber-100 text-amber-700 border-amber-200",
  pending_verification: "bg-gray-100 text-gray-600 border-gray-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  suspended: "bg-orange-100 text-orange-700 border-orange-200",
};

const STATUS_LABEL: Record<string, string> = {
  approved: "Approved",
  pending_approval: "Pending Approval",
  pending_verification: "Unverified",
  rejected: "Rejected",
  suspended: "Suspended",
};

export default function AdminPanel({
  backendToken,
  currentRole,
  currentUserId,
}: {
  backendToken: string;
  currentRole: string;
  currentUserId: string;
}) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deviceModal, setDeviceModal] = useState<AppUser | null>(null);
  const [deleteModal, setDeleteModal] = useState<AppUser | null>(null);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${backendToken}`,
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (search.trim()) qs.set("q", search.trim());

      const res = await fetch(
        `${BACKEND}/api/admin/users?${qs.toString()}`,
        { headers: authHeaders, credentials: "include" }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.data);
      } else {
        toast.error(data.message || "Failed to load users.");
      }
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function action(
    url: string,
    method: string,
    body: Record<string, unknown> | null,
    successMsg: string,
    id: string
  ) {
    setBusyId(id);
    try {
      const res = await fetch(url, {
        method,
        headers: authHeaders,
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(successMsg);
        await loadUsers();
      } else {
        toast.error(data.message || "Action failed.");
      }
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  const approve = (u: AppUser) =>
    action(
      `${BACKEND}/api/admin/users/${u._id}/approve`,
      "PATCH",
      null,
      "User approved.",
      u._id
    );
  const reject = (u: AppUser) =>
    action(
      `${BACKEND}/api/admin/users/${u._id}/reject`,
      "PATCH",
      null,
      "User rejected.",
      u._id
    );
  const suspend = (u: AppUser) =>
    action(
      `${BACKEND}/api/admin/users/${u._id}/suspend`,
      "PATCH",
      null,
      "User suspended.",
      u._id
    );
  const setRole = (u: AppUser, role: string) =>
    action(
      `${BACKEND}/api/admin/users/${u._id}/role`,
      "PATCH",
      { role },
      "Role updated.",
      u._id
    );

  async function confirmDelete(u: AppUser) {
    setBusyId(u._id);
    try {
      const res = await fetch(`${BACKEND}/api/admin/users/${u._id}`, {
        method: "DELETE",
        headers: authHeaders,
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("User deleted.");
        setDeleteModal(null);
        await loadUsers();
      } else {
        toast.error(data.message || "Failed to delete user.");
      }
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  const counts = {
    pending: users.filter((u) => u.status === "pending_approval").length,
    approved: users.filter((u) => u.status === "approved").length,
    total: users.length,
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#2E8B57] flex items-center justify-center">
            <Users className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500">
              Manage users, roles, and device assignments
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={loadUsers}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Users" value={counts.total} />
        <StatCard label="Pending Approval" value={counts.pending} accent />
        <StatCard label="Approved" value={counts.approved} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="pending_verification">Unverified</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-semibold px-4 py-3">User</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="text-left font-semibold px-4 py-3">Role</th>
                <th className="text-left font-semibold px-4 py-3">Devices</th>
                <th className="text-right font-semibold px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    <Loader2 className="size-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u._id === currentUserId;
                  const isOwnerRow = u.user_role === "owner";
                  const busy = busyId === u._id;
                  return (
                    <tr key={u._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {[u.firstName, u.lastName].filter(Boolean).join(" ") ||
                            "—"}
                        </div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${
                            STATUS_STYLES[u.status] || STATUS_STYLES.pending_verification
                          }`}
                        >
                          {STATUS_LABEL[u.status] || u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {/* Only owner can change roles; owners' own role locked */}
                        {currentRole === "owner" && !isOwnerRow ? (
                          <Select
                            value={u.user_role}
                            onValueChange={(v) => setRole(u, v)}
                            disabled={busy}
                          >
                            <SelectTrigger className="h-8 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="farmer">farmer</SelectItem>
                              <SelectItem value="admin">admin</SelectItem>
                              <SelectItem value="owner">owner</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="capitalize text-gray-700">
                            {u.user_role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">
                            {u.devices && u.devices.length > 0
                              ? `${u.devices.length} device(s)`
                              : "none"}
                          </span>
                          <button
                            onClick={() => setDeviceModal(u)}
                            className="text-[#2E8B57] hover:text-[#256d44]"
                            title="Manage devices"
                          >
                            <Cpu className="size-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {u.status === "pending_approval" && (
                            <Button
                              size="sm"
                              onClick={() => approve(u)}
                              disabled={busy}
                              className="h-8 bg-[#2E8B57] hover:bg-[#256d44] text-white gap-1"
                            >
                              <CheckCircle2 className="size-3.5" />
                              Approve
                            </Button>
                          )}
                          {u.status === "suspended" && (
                            <Button
                              size="sm"
                              onClick={() => approve(u)}
                              disabled={busy}
                              className="h-8 bg-[#2E8B57] hover:bg-[#256d44] text-white gap-1"
                            >
                              <CheckCircle2 className="size-3.5" />
                              Reinstate
                            </Button>
                          )}
                          {(u.status === "pending_approval" ||
                            u.status === "pending_verification") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reject(u)}
                              disabled={busy}
                              className="h-8 gap-1 text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <XCircle className="size-3.5" />
                              Reject
                            </Button>
                          )}
                          {u.status === "approved" && !isSelf && !isOwnerRow && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => suspend(u)}
                              disabled={busy}
                              className="h-8 gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                            >
                              <Ban className="size-3.5" />
                              Suspend
                            </Button>
                          )}
                          {!isSelf && !isOwnerRow && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteModal(u)}
                              disabled={busy}
                              className="h-8 gap-1 text-red-600 border-red-200 hover:bg-red-50"
                              title="Delete user"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                          {busy && (
                            <Loader2 className="size-4 animate-spin text-gray-400" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deviceModal && (
        <DeviceModal
          user={deviceModal}
          backendToken={backendToken}
          onClose={() => setDeviceModal(null)}
          onSaved={() => {
            setDeviceModal(null);
            loadUsers();
          }}
        />
      )}

      {deleteModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setDeleteModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete user?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              This will permanently remove{" "}
              <span className="font-semibold text-gray-900">
                {[deleteModal.firstName, deleteModal.lastName]
                  .filter(Boolean)
                  .join(" ") || deleteModal.email}
              </span>{" "}
              ({deleteModal.email}).
            </p>
            <p className="text-xs text-gray-400 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteModal(null)}
                disabled={busyId === deleteModal._id}
              >
                Cancel
              </Button>
              <Button
                onClick={() => confirmDelete(deleteModal)}
                disabled={busyId === deleteModal._id}
                className="bg-red-600 hover:bg-red-700 text-white gap-2"
              >
                {busyId === deleteModal._id && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "bg-amber-50 border-amber-200"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  );
}

function DeviceModal({
  user,
  backendToken,
  onClose,
  onSaved,
}: {
  user: AppUser;
  backendToken: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState((user.devices || []).join(", "));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const devices = value
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      const res = await fetch(
        `${BACKEND}/api/admin/users/${user._id}/devices`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${backendToken}`,
          },
          credentials: "include",
          body: JSON.stringify({ devices }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Devices updated.");
        onSaved();
      } else {
        toast.error(data.message || "Failed to update devices.");
      }
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          Assign Devices
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.email}
        </p>
        <label className="text-xs font-medium text-gray-700">
          Device IDs (comma-separated)
        </label>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ESP32_001, ESP32_002"
          className="mt-1.5"
        />
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-[#2E8B57] hover:bg-[#256d44] text-white gap-2"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
