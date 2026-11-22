
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
    throw new Error(
      data.message ||
      data.error ||
      `Request failed (${response.status}).`
    );
  }

  return data;
}

// Authentication APIs
export const authAPI = {
  register: (phone, password, referral_code = "") =>
    apiRequest("/api/auth/register", {
      method: "POST",
      body: { phone, password, referral_code },
    }),

  login: (phone, password) =>
    apiRequest("/api/auth/login", {
      method: "POST",
      body: { phone, password },
    }),

  me: (token) =>
    apiRequest("/api/auth/me", { token }),
};

// Withdrawal APIs
export const withdrawalAPI = {
  create: (token, payload) =>
    apiRequest("/api/wallet/withdrawals", {
      method: "POST",
      token,
      body: payload,
    }),
};

// Recharge APIs
export const rechargeAPI = {
  createRecharge: (token, payload) =>
    apiRequest("/api/wallet/recharges", {
      method: "POST",
      token,
      body: payload,
    }),
};

// Admin APIs
export const adminAPI = {
  listWithdrawals: (token, status = "all") =>
    apiRequest(
      `/api/admin/withdrawals?status=${encodeURIComponent(status)}`,
      { token }
    ),

  reviewWithdrawal: (token, publicId, action) =>
    apiRequest(
      `/api/admin/withdrawals/${encodeURIComponent(publicId)}/review`,
      {
        method: "POST",
        token,
        body: { action },
      }
    ),

  listRecharges: (token, status = "all") =>
    apiRequest(
      `/api/admin/recharges?status=${encodeURIComponent(status)}`,
      { token }
    ),

  reviewRecharge: (token, publicId, action) =>
    apiRequest(
      `/api/admin/recharges/${encodeURIComponent(publicId)}/review`,
      {
        method: "POST",
        token,
        body: { action },
      }
    ),

  creditWallet: (token, userId, amount) =>
    apiRequest(
      `/api/admin/users/${userId}/wallet/credit`,
      {
        method: "POST",
        token,
        body: { amount },
      }
    ),
};
