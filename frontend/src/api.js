const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5001";

export async function apiRequest(path, options = {}) {
  const { method = "GET", body, token } = options;

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      ...(body !== undefined
        ? { body: JSON.stringify(body) }
        : {}),
    });
  } catch (error) {
    throw new Error(
      `Cannot connect to backend at ${API_BASE_URL}. Make sure Flask is running.`
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message ||
      data.error ||
      `Request failed (${response.status}).`
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

// A fresh random key for every "Submit" click. If the same request is sent
// twice (double click, network retry) the server returns the first result.
export function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

// Authentication APIs
export const authAPI = {
  register: (name, phone, password, referral_code = "") =>
    apiRequest("/api/auth/register", {
      method: "POST",
      body: { name, phone, password, referral_code },
    }),

  login: (phone, password) =>
    apiRequest("/api/auth/login", {
      method: "POST",
      body: { phone, password },
    }),

  me: (token) =>
    apiRequest("/api/auth/me", { token }),
};

// Deposit APIs (user)
export const depositAPI = {
  create: (token, payload) =>
    apiRequest("/api/wallet/deposits", {
      method: "POST",
      token,
      body: payload,
    }),

  list: (token) =>
    apiRequest("/api/wallet/deposits", { token }),
};

// Withdrawal APIs (user)
export const withdrawalAPI = {
  create: (token, payload) =>
    apiRequest("/api/wallet/withdrawals", {
      method: "POST",
      token,
      body: payload,
    }),

  list: (token, limit = 100) =>
    apiRequest(`/api/wallet/withdrawals?limit=${limit}`, { token }),
};

// User payout-number APIs
export const payoutNumberAPI = {
  list: (token) => apiRequest("/api/wallet/payout-numbers", { token }),
  create: (token, payload) => apiRequest("/api/wallet/payout-numbers", {
    method: "POST", token, body: payload,
  }),
  remove: (token, id) => apiRequest(`/api/wallet/payout-numbers/${id}`, {
    method: "DELETE", token,
  }),
  setDefault: (token, id) => apiRequest(`/api/wallet/payout-numbers/${id}/default`, {
    method: "PATCH", token,
  }),
};

// Admin APIs
export const adminAPI = {
  listPayoutNumbers: (token, status = "pending") =>
    apiRequest(`/api/admin/payout-numbers?status=${encodeURIComponent(status)}`, { token }),

  reviewPayoutNumber: (token, id, status, reason) =>
    apiRequest(`/api/admin/payout-numbers/${id}/review`, {
      method: "POST", token, body: { status, reason },
    }),

  listWithdrawals: (token, status = "all") =>
    apiRequest(
      `/api/admin/withdrawals?status=${encodeURIComponent(status)}`,
      { token }
    ),

  reviewWithdrawal: (token, publicId, action, reason) =>
    apiRequest(
      `/api/admin/withdrawals/${encodeURIComponent(publicId)}/review`,
      {
        method: "POST",
        token,
        body: { action, reason },
      }
    ),

  markWithdrawalPaid: (token, publicId, trxId) =>
    apiRequest(
      `/api/admin/withdrawals/${encodeURIComponent(publicId)}/mark-paid`,
      {
        method: "POST",
        token,
        body: { trx_id: trxId },
      }
    ),

  listDeposits: (token, status = "all") =>
    apiRequest(
      `/api/admin/deposits?status=${encodeURIComponent(status)}`,
      { token }
    ),

  reviewDeposit: (token, publicId, action, reason) =>
    apiRequest(
      `/api/admin/deposits/${encodeURIComponent(publicId)}/review`,
      {
        method: "POST",
        token,
        body: { action, reason },
      }
    ),
};
