const AUTH_KEY = "ocmapas.authToken";

function getStoredToken() {
  return window.localStorage.getItem(AUTH_KEY) || "";
}

function setStoredToken(token) {
  if (token) {
    window.localStorage.setItem(AUTH_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_KEY);
  }
}

async function request(path, { method = "GET", body, token, signal } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Pedido expirou. Tente novamente.");
    }
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error || "Erro na comunicação com o servidor.";
    throw new Error(message);
  }

  return data;
}

export const api = {
  getToken: getStoredToken,
  setToken: setStoredToken,

  async register(username, email, password) {
    const data = await request("/auth/register", {
      method: "POST",
      body: { username, email, password },
    });
    setStoredToken(data.token);
    return data.user;
  },

  async login(username, password) {
    const data = await request("/auth/login", {
      method: "POST",
      body: { username, password },
    });
    setStoredToken(data.token);
    return data.user;
  },

  async me() {
    const token = getStoredToken();
    if (!token) {
      return null;
    }

    const data = await request("/auth/me", { token });
    return data.user;
  },

  logout() {
    setStoredToken("");
  },

  async listMaps() {
    const data = await request("/maps", { token: getStoredToken() });
    return data.maps || [];
  },

  async getTodayGames() {
    const data = await request("/games/today", { token: getStoredToken() });
    return {
      today: String(data?.today || ""),
      count: Number(data?.count || 0),
      games: Array.isArray(data?.games) ? data.games : [],
    };
  },

  async backupMaps() {
    const data = await request("/maps/backup", { token: getStoredToken() });
    return data;
  },

  async importEt(date, timeoutMs = 90000) {
    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => {
      abortController.abort();
    }, timeoutMs);

    try {
      const data = await request("/maps/importar-et", {
        method: "POST",
        token: getStoredToken(),
        body: { date },
        signal: abortController.signal,
      });

      return {
        requestedDate: data?.requestedDate || date || "",
        lastImportedAt: data?.lastImportedAt || "",
        rows: Array.isArray(data?.data) ? data.data : [],
      };
    } finally {
      window.clearTimeout(timeoutId);
    }
  },

  async getEtHistory(date = "") {
    const query = date ? `/maps/et-history?date=${encodeURIComponent(date)}` : "/maps/et-history";
    const data = await request(query, { token: getStoredToken() });
    return {
      requestedDate: data?.requestedDate || "",
      lastImportedAt: data?.lastImportedAt || "",
      rows: Array.isArray(data?.data) ? data.data : [],
    };
  },

  async importWeatherStation(date, timeoutMs = 90000) {
    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => {
      abortController.abort();
    }, timeoutMs);

    try {
      const data = await request("/maps/importar-estacao-meteorologica", {
        method: "POST",
        token: getStoredToken(),
        body: { date },
        signal: abortController.signal,
      });

      return {
        requestedDate: data?.requestedDate || date || "",
        lastImportedAt: data?.lastImportedAt || "",
        rows: Array.isArray(data?.data) ? data.data : [],
      };
    } finally {
      window.clearTimeout(timeoutId);
    }
  },

  async getWeatherStationHistory(date = "") {
    const query = date
      ? `/maps/weather-station-history?date=${encodeURIComponent(date)}`
      : "/maps/weather-station-history";
    const data = await request(query, { token: getStoredToken() });
    return {
      requestedDate: data?.requestedDate || "",
      lastImportedAt: data?.lastImportedAt || "",
      rows: Array.isArray(data?.data) ? data.data : [],
    };
  },

  async listUsers() {
    const data = await request("/users", { token: getStoredToken() });
    return data.users || [];
  },

  async createMap(payload) {
    const data = await request("/maps", {
      method: "POST",
      token: getStoredToken(),
      body: payload,
    });
    return data.map;
  },

  async updateMap(id, payload) {
    const data = await request(`/maps/${id}`, {
      method: "PUT",
      token: getStoredToken(),
      body: payload,
    });
    return data.map;
  },

  async deleteMap(id) {
    await request(`/maps/${id}`, {
      method: "DELETE",
      token: getStoredToken(),
    });
  },

  async copyMap(id) {
    const data = await request(`/maps/${id}/copy`, {
      method: "POST",
      token: getStoredToken(),
    });
    return data.map;
  },

  async updateVisibility(id, isPublic) {
    const data = await request(`/maps/${id}/visibility`, {
      method: "PATCH",
      token: getStoredToken(),
      body: { isPublic },
    });
    return data.map;
  },

  async listShares(id) {
    const data = await request(`/maps/${id}/shares`, {
      token: getStoredToken(),
    });
    return data.shares || [];
  },

  async upsertShare(id, target, canEdit) {
    const body = typeof target === "object"
      ? {
          userId: target.userId,
          username: target.username,
          canEdit,
        }
      : {
          username: target,
          canEdit,
        };

    await request(`/maps/${id}/shares`, {
      method: "POST",
      token: getStoredToken(),
      body,
    });
  },

  async deleteShare(id, shareId) {
    await request(`/maps/${id}/shares/${shareId}`, {
      method: "DELETE",
      token: getStoredToken(),
    });
  },
};
