import express from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/pool.js";
import { mapRowToDto, normalizeJsonObject, normalizeUsername } from "../utils.js";

export const mapsRouter = express.Router();

let chromiumLoaderPromise = null;
let sharedBrowserPromise = null;
let irristratStorageState = null;
const etImportCache = new Map();
const weatherStationImportCache = new Map();

async function getChromium() {
  if (!chromiumLoaderPromise) {
    chromiumLoaderPromise = import("playwright")
      .then((playwrightModule) => playwrightModule.chromium)
      .catch((error) => {
        chromiumLoaderPromise = null;
        throw error;
      });
  }

  return chromiumLoaderPromise;
}

async function getSharedBrowser() {
  if (!sharedBrowserPromise) {
    sharedBrowserPromise = getChromium()
      .then((chromium) => chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      }))
      .then((browser) => {
        browser.on("disconnected", () => {
          sharedBrowserPromise = null;
        });

        return browser;
      })
      .catch((error) => {
        sharedBrowserPromise = null;
        throw error;
      });
  }

  return sharedBrowserPromise;
}

function formatDateLabel(dateInput) {
  if (!dateInput) {
    return "";
  }

  const parsedDate = new Date(dateInput);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function normalizeRequestedDate(dateInput) {
  const source = String(dateInput || "").trim();
  if (!source) {
    return new Date().toISOString().slice(0, 10);
  }

  const parsedDate = new Date(source);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsedDate.toISOString().slice(0, 10);
}

function toIsoDateString(dateInput) {
  if (!dateInput) {
    return "";
  }

  const parsedDate = new Date(dateInput);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toISOString().slice(0, 10);
}

function normalizeEtRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => {
      const dataLabel = String(row?.data || row?.dataOriginal || row?.dataCompleta || "").trim();
      const fullDate = String(row?.dataCompleta || "").trim();
      const normalizedFullDate = fullDate && !Number.isNaN(Date.parse(fullDate))
        ? new Date(fullDate).toISOString().slice(0, 10)
        : null;

      if (!dataLabel) {
        return null;
      }

      return {
        data: dataLabel,
        dataOriginal: String(row?.dataOriginal || dataLabel).trim() || dataLabel,
        dataCompleta: normalizedFullDate,
        et: String(row?.et || "0mm").trim() || "0mm",
        tempMax: String(row?.tempMax || "N/A").trim() || "N/A",
        tempMin: String(row?.tempMin || "N/A").trim() || "N/A",
      };
    })
    .filter(Boolean);
}

function normalizeWeatherStationRows(rows, requestedDate = "") {
  if (!Array.isArray(rows)) {
    return [];
  }

  const normalizedRequestedDate = normalizeRequestedDate(requestedDate || "");

  const normalizedRows = rows
    .map((row) => {
      const readingDate = toIsoDateString(row?.data || row?.readingDate || row?.Data || "");
      if (!readingDate) {
        return null;
      }

      return {
        data: readingDate,
        readingDate,
        requestedDate: normalizedRequestedDate,
        precipitacaoMm: String(row?.precipitacaoMm || row?.Precipitacao_mm || "0.00").trim() || "0.00",
        etMm: String(row?.etMm || row?.ET_mm || "0.00").trim() || "0.00",
        tempMinC: String(row?.tempMinC || row?.Temp_Min_C || "N/A").trim() || "N/A",
        tempMaxC: String(row?.tempMaxC || row?.Temp_Max_C || "N/A").trim() || "N/A",
      };
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right.readingDate).getTime() - new Date(left.readingDate).getTime());

  if (!normalizedRows.length) {
    return [];
  }

  const anchorIndex = normalizedRows.findIndex((row) => row.readingDate === normalizedRequestedDate);
  const startIndex = anchorIndex >= 0 ? anchorIndex : 0;

  return normalizedRows.slice(startIndex, startIndex + 10);
}

async function persistEtHistory(requestedDate, rows, userId) {
  if (!rows.length) {
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM et_history WHERE requested_date = $1", [requestedDate]);

    for (const row of rows) {
      await client.query(
        `INSERT INTO et_history (
          requested_date,
          data_label,
          data_completa,
          et,
          temp_max,
          temp_min,
          imported_by_user_id,
          imported_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [requestedDate, row.data, row.dataCompleta, row.et, row.tempMax, row.tempMin, userId],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function getLatestEtHistory() {
  const result = await pool.query(`
    WITH latest_requested_date AS (
      SELECT requested_date
      FROM et_history
      ORDER BY imported_at DESC, requested_date DESC
      LIMIT 1
    )
    SELECT
      eh.requested_date,
      eh.data_label,
      eh.data_completa,
      eh.et,
      eh.temp_max,
      eh.temp_min,
      eh.imported_at
    FROM et_history eh
    WHERE eh.requested_date = (SELECT requested_date FROM latest_requested_date)
    ORDER BY eh.data_completa NULLS LAST, eh.data_label ASC
  `);

  if (!result.rows.length) {
    return {
      requestedDate: "",
      lastImportedAt: "",
      rows: [],
    };
  }

  return {
    requestedDate: toIsoDateString(result.rows[0].requested_date),
    lastImportedAt: result.rows[0].imported_at,
    rows: result.rows.map((row) => ({
      data: row.data_label,
      dataOriginal: row.data_label,
      dataCompleta: toIsoDateString(row.data_completa),
      et: row.et,
      tempMax: row.temp_max,
      tempMin: row.temp_min,
      importedAt: row.imported_at,
    })),
  };
}

async function getEtHistoryByDate(requestedDate) {
  const result = await pool.query(`
    SELECT
      requested_date,
      data_label,
      data_completa,
      et,
      temp_max,
      temp_min,
      imported_at
    FROM et_history
    WHERE requested_date = $1
    ORDER BY data_completa NULLS LAST, data_label ASC
  `, [requestedDate]);

  if (!result.rows.length) {
    return {
      requestedDate,
      lastImportedAt: "",
      rows: [],
    };
  }

  const importedAtValues = result.rows
    .map((row) => row.imported_at)
    .filter(Boolean)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());

  return {
    requestedDate: toIsoDateString(result.rows[0].requested_date),
    lastImportedAt: importedAtValues[0] || "",
    rows: result.rows.map((row) => ({
      data: row.data_label,
      dataOriginal: row.data_label,
      dataCompleta: toIsoDateString(row.data_completa),
      et: row.et,
      tempMax: row.temp_max,
      tempMin: row.temp_min,
      importedAt: row.imported_at,
    })),
  };
}

async function persistWeatherStationHistory(requestedDate, rows, userId) {
  if (!rows.length) {
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM weather_station_history WHERE requested_date = $1", [requestedDate]);

    for (const row of rows) {
      await client.query(
        `INSERT INTO weather_station_history (
          requested_date,
          reading_date,
          precipitacao_mm,
          et_mm,
          temp_min_c,
          temp_max_c,
          imported_by_user_id,
          imported_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [requestedDate, row.readingDate, row.precipitacaoMm, row.etMm, row.tempMinC, row.tempMaxC, userId],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function getLatestWeatherStationHistory() {
  const result = await pool.query(`
    WITH latest_per_reading_date AS (
      SELECT DISTINCT ON (wsh.reading_date)
        wsh.requested_date,
        wsh.reading_date,
        wsh.precipitacao_mm,
        wsh.et_mm,
        wsh.temp_min_c,
        wsh.temp_max_c,
        wsh.imported_at
      FROM weather_station_history wsh
      ORDER BY wsh.reading_date DESC, wsh.imported_at DESC
    )
    SELECT
      requested_date,
      reading_date,
      precipitacao_mm,
      et_mm,
      temp_min_c,
      temp_max_c,
      imported_at
    FROM latest_per_reading_date
    ORDER BY reading_date DESC
    LIMIT 10
  `);

  if (!result.rows.length) {
    return {
      requestedDate: "",
      lastImportedAt: "",
      rows: [],
    };
  }

  return {
    requestedDate: toIsoDateString(result.rows[0].reading_date),
    lastImportedAt: result.rows[0].imported_at,
    rows: result.rows.map((row) => ({
      data: toIsoDateString(row.reading_date),
      readingDate: toIsoDateString(row.reading_date),
      precipitacaoMm: row.precipitacao_mm,
      etMm: row.et_mm,
      tempMinC: row.temp_min_c,
      tempMaxC: row.temp_max_c,
      importedAt: row.imported_at,
    })),
  };
}

async function getWeatherStationHistoryByDate(requestedDate) {
  const result = await pool.query(`
    WITH latest_per_reading_date AS (
      SELECT DISTINCT ON (wsh.reading_date)
        wsh.requested_date,
        wsh.reading_date,
        wsh.precipitacao_mm,
        wsh.et_mm,
        wsh.temp_min_c,
        wsh.temp_max_c,
        wsh.imported_at
      FROM weather_station_history wsh
      WHERE wsh.reading_date <= $1
      ORDER BY wsh.reading_date DESC, wsh.imported_at DESC
    )
    SELECT
      requested_date,
      reading_date,
      precipitacao_mm,
      et_mm,
      temp_min_c,
      temp_max_c,
      imported_at
    FROM latest_per_reading_date
    ORDER BY reading_date DESC
    LIMIT 10
  `, [requestedDate]);

  if (!result.rows.length) {
    return {
      requestedDate,
      lastImportedAt: "",
      rows: [],
    };
  }

  const importedAtValues = result.rows
    .map((row) => row.imported_at)
    .filter(Boolean)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());

  return {
    requestedDate,
    lastImportedAt: importedAtValues[0] || "",
    rows: result.rows.map((row) => ({
      data: toIsoDateString(row.reading_date),
      readingDate: toIsoDateString(row.reading_date),
      precipitacaoMm: row.precipitacao_mm,
      etMm: row.et_mm,
      tempMinC: row.temp_min_c,
      tempMaxC: row.temp_max_c,
      importedAt: row.imported_at,
    })),
  };
}

async function withTimeout(taskPromise, timeoutMs, timeoutMessage) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([taskPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseSelectorCandidates(rawValue, fallbackValues) {
  const source = String(rawValue || "").trim();
  if (!source) {
    return fallbackValues;
  }

  const parsed = source
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!parsed.length) {
    return fallbackValues;
  }

  const merged = [...parsed, ...fallbackValues];
  return Array.from(new Set(merged));
}

async function fillFirstMatchingSelector(page, selectors, value, fieldLabel) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ state: "visible", timeout: 6000 });
      await locator.fill(value);
      return selector;
    } catch {
      // Tenta o próximo seletor candidato.
    }
  }

  throw new Error(`Não foi possível localizar o campo ${fieldLabel}. Verifique os seletores IRRISTRAT_*.`);
}

async function clickFirstMatchingSelector(page, selectors, fieldLabel) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ state: "visible", timeout: 6000 });
      await locator.click();
      return selector;
    } catch {
      // Tenta o próximo seletor candidato.
    }
  }

  throw new Error(`Não foi possível localizar ${fieldLabel}. Verifique os seletores IRRISTRAT_*.`);
}

async function ensureLoginPanelVisible(page) {
  const isLoginFieldExpanded = async () => page.evaluate(() => {
    const userField = document.querySelector("#loginUsername") || document.querySelector('input[name="loginUsername"]');
    if (!userField) {
      return false;
    }

    const rect = userField.getBoundingClientRect();
    return rect.width > 20 && rect.height > 20;
  });

  if (await isLoginFieldExpanded()) {
    return;
  }

  const openLoginCandidates = [
    'button:has-text("Login")',
    'a:has-text("Login")',
    '[data-target="#login-form"]',
    '#loginToggle',
  ];

  for (const selector of openLoginCandidates) {
    try {
      await page.locator(selector).first().click({ timeout: 2000 });
      await page.waitForTimeout(250);
      if (await isLoginFieldExpanded()) {
        return;
      }
    } catch {
      // Tenta o próximo candidato.
    }
  }
}

async function importEtFromIrristrat(dateLabel) {
  const username = String(process.env.IRRISTRAT_USER || "").trim();
  const password = String(process.env.IRRISTRAT_PASS || "").trim();

  if (!username || !password) {
    throw new Error("Credenciais IrriStrat não configuradas no servidor.");
  }

  try {
    await getChromium();
  } catch {
    throw new Error("Dependência Playwright em falta. Execute npm install.");
  }

  const loginUrl = String(process.env.IRRISTRAT_LOGIN_URL || "https://irristrat.com/new/index.php");
  const homeUrl = String(process.env.IRRISTRAT_HOME_URL || "https://irristrat.com/new/home.php");
  const etSelector = String(process.env.IRRISTRAT_ET_SELECTOR || 'img[title="Evapotranspiração"]');
  const userSelectors = parseSelectorCandidates(process.env.IRRISTRAT_USER_SELECTOR, [
    '#loginUsername',
    'input[name="loginUsername"]',
    'input[name="user"]',
    'input[name="username"]',
    '#user',
    '#username',
    'input[type="text"]',
  ]);
  const passSelectors = parseSelectorCandidates(process.env.IRRISTRAT_PASS_SELECTOR, [
    '#loginPassword',
    'input[name="loginPassword"]',
    'input[name="pass"]',
    'input[name="password"]',
    '#pass',
    '#password',
    'input[type="password"]',
  ]);
  const submitSelectors = parseSelectorCandidates(process.env.IRRISTRAT_SUBMIT_SELECTOR, [
    '#loginSubmit',
    '#login-form button[type="submit"]',
    '#login-form button',
    'input[type="submit"]',
    'button[type="submit"]',
    'button[name="login"]',
    'button:has-text("Entrar")',
    'button:has-text("Login")',
  ]);

  const browser = await getSharedBrowser();
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    storageState: irristratStorageState || undefined,
  });
  const page = await context.newPage();

  try {
    await page.route("**/*", (route) => {
      const resourceType = route.request().resourceType();
      if (resourceType === "image" || resourceType === "font" || resourceType === "media") {
        return route.abort();
      }

      return route.continue();
    });

    page.setDefaultTimeout(45000);

    await page.goto(homeUrl, { waitUntil: "domcontentloaded" }).catch(async () => {
      await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
    });

    const needsLogin = await page.evaluate(() => {
      const hasLoginUserField = Boolean(document.querySelector("#loginUsername") || document.querySelector('input[name="loginUsername"]'));
      return hasLoginUserField || /\/new\/index\.php/i.test(window.location.pathname);
    });

    if (needsLogin) {
      const pageTitle = await page.title().catch(() => "");
      if (/just a moment|attention required|cloudflare/i.test(pageTitle)) {
        throw new Error("A página de login está protegida por challenge (Cloudflare). Tente novamente mais tarde.");
      }

      await page.locator("#ok_cookies").first().click({ timeout: 2000 }).catch(() => {});
      await ensureLoginPanelVisible(page);

      await fillFirstMatchingSelector(page, userSelectors, username, "de utilizador");
      await fillFirstMatchingSelector(page, passSelectors, password, "de password");
      await clickFirstMatchingSelector(page, submitSelectors, "o botão de login");
    }

    await page.waitForURL(/\/new\/home\.php/i, { timeout: 45000 }).catch(() => {});
    await page.waitForLoadState("domcontentloaded");
    await page.locator(etSelector).first().waitFor({ state: "attached", timeout: 45000 });

    irristratStorageState = await context.storageState();

    const rows = await page.evaluate(({ expectedDateLabel, etIconSelector }) => {
      const titleText = String(document.title || "");
      const yearMatch = titleText.match(/'(\d{2})/);
      const year = yearMatch ? `20${yearMatch[1]}` : String(new Date().getFullYear());

      const allRows = Array.from(document.querySelectorAll("tr"));

      if (!allRows.length) {
        return [];
      }

      const hasExpectedDate = (row) => {
        if (!expectedDateLabel) {
          return false;
        }

        return row.innerText.includes(expectedDateLabel);
      };

      const hasDateFormat = (row) => /\b\d{2}\/\d{2}\b/.test(row.innerText);

      const headerRow = allRows.find(hasExpectedDate)
        || allRows.find(hasDateFormat)
        || null;

      if (!headerRow) {
        return [];
      }

      const headerIndex = allRows.indexOf(headerRow);
      const dataRow = allRows[headerIndex + 1];

      if (!dataRow || !headerRow.cells?.length || !dataRow.cells?.length) {
        return [];
      }

      return Array.from(headerRow.cells).map((headerCell, index) => {
        const targetCell = dataRow.cells[index];
        const originalDateText = String(headerCell.innerText || "").trim();
        const dateParts = originalDateText.match(/(\d{2})\/(\d{2})/);
        const fullDateIso = dateParts ? `${year}-${dateParts[2]}-${dateParts[1]}` : originalDateText;

        if (!targetCell) {
          return {
            data: originalDateText,
            dataOriginal: originalDateText,
            dataCompleta: fullDateIso,
            et: "0mm",
            tempMax: "N/A",
            tempMin: "N/A",
          };
        }

        const etContainer = Array.from(targetCell.querySelectorAll("div")).find((div) =>
          div.querySelector(etIconSelector));

        const tempDiv = targetCell.querySelector('div[title="Temperatura"]');
        let tempMax = "N/A";
        let tempMin = "N/A";

        if (tempDiv) {
          tempMax = String(tempDiv.querySelector("b")?.innerText || "").trim() || "N/A";
          const fullTempText = String(tempDiv.innerText || "").trim();
          tempMin = fullTempText.replace(tempMax, "").trim() || "N/A";
        }

        return {
          data: originalDateText,
          dataOriginal: originalDateText,
          dataCompleta: fullDateIso,
          et: etContainer ? String(etContainer.innerText || "").trim() : "0mm",
          tempMax,
          tempMin,
        };
      }).filter((item) => item.data);
    }, { expectedDateLabel: dateLabel, etIconSelector: etSelector });

    return rows;
  } finally {
    await context.close().catch(() => {});
  }
}

async function importWeatherStationFromIrristrat(requestedDate) {
  const username = String(process.env.IRRISTRAT_USER || "").trim();
  const password = String(process.env.IRRISTRAT_PASS || "").trim();

  if (!username || !password) {
    throw new Error("Credenciais IrriStrat não configuradas no servidor.");
  }

  try {
    await getChromium();
  } catch {
    throw new Error("Dependência Playwright em falta. Execute npm install.");
  }

  const loginUrl = String(process.env.IRRISTRAT_LOGIN_URL || "https://irristrat.com/new/index.php");
  const homeUrl = String(process.env.IRRISTRAT_HOME_URL || "https://irristrat.com/new/home.php");
  const weatherReadingsUrl = String(process.env.IRRISTRAT_WEATHER_READINGS_URL || "https://irristrat.com/new/content/weather/em/readings/");
  const userSelectors = parseSelectorCandidates(process.env.IRRISTRAT_USER_SELECTOR, [
    '#loginUsername',
    'input[name="loginUsername"]',
    'input[name="user"]',
    'input[name="username"]',
    '#user',
    '#username',
    'input[type="text"]',
  ]);
  const passSelectors = parseSelectorCandidates(process.env.IRRISTRAT_PASS_SELECTOR, [
    '#loginPassword',
    'input[name="loginPassword"]',
    'input[name="pass"]',
    'input[name="password"]',
    '#pass',
    '#password',
    'input[type="password"]',
  ]);
  const submitSelectors = parseSelectorCandidates(process.env.IRRISTRAT_SUBMIT_SELECTOR, [
    '#loginSubmit',
    '#login-form button[type="submit"]',
    '#login-form button',
    'input[type="submit"]',
    'button[type="submit"]',
    'button[name="login"]',
    'button:has-text("Entrar")',
    'button:has-text("Login")',
  ]);

  const browser = await getSharedBrowser();
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    storageState: irristratStorageState || undefined,
  });
  const page = await context.newPage();

  try {
    await page.route("**/*", (route) => {
      const resourceType = route.request().resourceType();
      if (resourceType === "image" || resourceType === "font" || resourceType === "media") {
        return route.abort();
      }

      return route.continue();
    });

    page.setDefaultTimeout(45000);

    await page.goto(homeUrl, { waitUntil: "domcontentloaded" }).catch(async () => {
      await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
    });

    const needsLogin = await page.evaluate(() => {
      const hasLoginUserField = Boolean(document.querySelector("#loginUsername") || document.querySelector('input[name="loginUsername"]'));
      return hasLoginUserField || /\/new\/index\.php/i.test(window.location.pathname);
    });

    if (needsLogin) {
      const pageTitle = await page.title().catch(() => "");
      if (/just a moment|attention required|cloudflare/i.test(pageTitle)) {
        throw new Error("A página de login está protegida por challenge (Cloudflare). Tente novamente mais tarde.");
      }

      await page.locator("#ok_cookies").first().click({ timeout: 2000 }).catch(() => {});
      await ensureLoginPanelVisible(page);

      await fillFirstMatchingSelector(page, userSelectors, username, "de utilizador");
      await fillFirstMatchingSelector(page, passSelectors, password, "de password");
      await clickFirstMatchingSelector(page, submitSelectors, "o botão de login");
    }

    await page.waitForURL(/\/new\/home\.php/i, { timeout: 45000 }).catch(() => {});
    await page.goto(weatherReadingsUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");
    await page.locator("tr").first().waitFor({ state: "attached", timeout: 45000 });

    irristratStorageState = await context.storageState();

    const rows = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("tr"))
        .filter((tr) => {
          const firstCell = tr.cells[0]?.innerText.trim();
          return /^\d{4}-\d{2}-\d{2}$/.test(firstCell || "");
        })
        .map((tr) => {
          const cells = tr.cells;
          return {
            data: cells[0]?.innerText.trim(),
            readingDate: cells[0]?.innerText.trim(),
            precipitacaoMm: cells[1]?.innerText.trim() || "0.00",
            etMm: cells[2]?.innerText.trim() || "0.00",
            tempMinC: cells[4]?.innerText.trim() || "N/A",
            tempMaxC: cells[5]?.innerText.trim() || "N/A",
          };
        });
    });

    return normalizeWeatherStationRows(rows, requestedDate);
  } finally {
    await context.close().catch(() => {});
  }
}

const BASE_SELECT = `
  SELECT
    m.*,
    owner.username AS owner_username,
    ms.can_edit,
    COALESCE(
      (
        SELECT json_agg(u2.username ORDER BY u2.username)
        FROM map_shares ms2
        JOIN users u2 ON u2.id = ms2.shared_with_user_id
        WHERE ms2.map_id = m.id
      ),
      '[]'::json
    ) AS shared_usernames
  FROM maps m
  JOIN users owner ON owner.id = m.owner_id
  LEFT JOIN map_shares ms
    ON ms.map_id = m.id
   AND ms.shared_with_user_id = $1
`;

async function getAccessibleMap(mapId, userId) {
  const query = `
    ${BASE_SELECT}
    WHERE m.id = $2
      AND (
        m.owner_id = $1
        OR m.is_public = TRUE
        OR ms.shared_with_user_id IS NOT NULL
      )
    LIMIT 1
  `;
  const result = await pool.query(query, [userId, mapId]);
  return result.rows[0] || null;
}

mapsRouter.get("/", async (req, res) => {
  const query = `
    ${BASE_SELECT}
    WHERE
      m.owner_id = $1
      OR m.is_public = TRUE
      OR ms.shared_with_user_id IS NOT NULL
    ORDER BY m.updated_at DESC
  `;
  const result = await pool.query(query, [req.user.id]);
  const maps = result.rows.map((row) => mapRowToDto(row, req.user.id));
  return res.json({ maps });
});

mapsRouter.post("/importar-et", async (req, res) => {
  try {
    const requestedDate = normalizeRequestedDate(typeof req.body?.date === "string" ? req.body.date : "");
    const dateLabel = formatDateLabel(requestedDate);
    const cacheTtlMs = Number(process.env.IRRISTRAT_CACHE_TTL_MS || 180000);
    const cacheKey = dateLabel || "current";
    const cacheEntry = etImportCache.get(cacheKey);
    const now = Date.now();

    if (cacheEntry && Number.isFinite(cacheTtlMs) && cacheTtlMs > 0 && (now - cacheEntry.timestamp) <= cacheTtlMs) {
      const persistedHistory = await getEtHistoryByDate(requestedDate);
      return res.json({
        requestedDate,
        data: persistedHistory.rows.length ? persistedHistory.rows : cacheEntry.data,
        lastImportedAt: persistedHistory.lastImportedAt,
        cached: true,
      });
    }

    const maxImportTimeMs = Number(process.env.IRRISTRAT_IMPORT_TIMEOUT_MS || 90000);
    const importedData = await withTimeout(
      importEtFromIrristrat(dateLabel),
      Number.isFinite(maxImportTimeMs) ? maxImportTimeMs : 90000,
      "Tempo limite excedido ao importar ET. Tente novamente.",
    );

    const data = normalizeEtRows(importedData);

    await persistEtHistory(requestedDate, data, req.user.id);

    etImportCache.set(cacheKey, {
      timestamp: now,
      data,
    });

    const persistedHistory = await getEtHistoryByDate(requestedDate);

    return res.json({
      requestedDate,
      data,
      lastImportedAt: persistedHistory.lastImportedAt,
      cached: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao importar ET.";
    return res.status(500).json({ error: message });
  }
});

mapsRouter.get("/et-history", async (req, res) => {
  try {
    const requestedDate = typeof req.query?.date === "string"
      ? normalizeRequestedDate(req.query.date)
      : "";
    const history = requestedDate
      ? await getEtHistoryByDate(requestedDate)
      : await getLatestEtHistory();

    return res.json({
      requestedDate: history.requestedDate,
      lastImportedAt: history.lastImportedAt,
      data: history.rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar histórico ET.";
    return res.status(500).json({ error: message });
  }
});

mapsRouter.get("/et-history/latest", async (_req, res) => {
  try {
    const latestHistory = await getLatestEtHistory();
    return res.json({
      requestedDate: latestHistory.requestedDate,
      lastImportedAt: latestHistory.lastImportedAt,
      data: latestHistory.rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar histórico ET.";
    return res.status(500).json({ error: message });
  }
});

mapsRouter.post("/importar-estacao-meteorologica", async (req, res) => {
  try {
    const requestedDate = normalizeRequestedDate(typeof req.body?.date === "string" ? req.body.date : "");
    const cacheTtlMs = Number(process.env.IRRISTRAT_CACHE_TTL_MS || 180000);
    const cacheKey = requestedDate || "current";
    const cacheEntry = weatherStationImportCache.get(cacheKey);
    const now = Date.now();

    if (cacheEntry && Number.isFinite(cacheTtlMs) && cacheTtlMs > 0 && (now - cacheEntry.timestamp) <= cacheTtlMs) {
      const persistedHistory = await getWeatherStationHistoryByDate(requestedDate);
      return res.json({
        requestedDate,
        data: persistedHistory.rows.length ? persistedHistory.rows : cacheEntry.data,
        lastImportedAt: persistedHistory.lastImportedAt,
        cached: true,
      });
    }

    const maxImportTimeMs = Number(process.env.IRRISTRAT_IMPORT_TIMEOUT_MS || 90000);
    const data = await withTimeout(
      importWeatherStationFromIrristrat(requestedDate),
      Number.isFinite(maxImportTimeMs) ? maxImportTimeMs : 90000,
      "Tempo limite excedido ao importar leituras da estação meteorológica. Tente novamente.",
    );

    await persistWeatherStationHistory(requestedDate, data, req.user.id);

    weatherStationImportCache.set(cacheKey, {
      timestamp: now,
      data,
    });

    const persistedHistory = await getWeatherStationHistoryByDate(requestedDate);

    return res.json({
      requestedDate,
      data,
      lastImportedAt: persistedHistory.lastImportedAt,
      cached: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao importar leituras da estação meteorológica.";
    return res.status(500).json({ error: message });
  }
});

mapsRouter.get("/weather-station-history", async (req, res) => {
  try {
    const requestedDate = typeof req.query?.date === "string"
      ? normalizeRequestedDate(req.query.date)
      : "";
    const history = requestedDate
      ? await getWeatherStationHistoryByDate(requestedDate)
      : await getLatestWeatherStationHistory();

    return res.json({
      requestedDate: history.requestedDate,
      lastImportedAt: history.lastImportedAt,
      data: history.rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar histórico da estação meteorológica.";
    return res.status(500).json({ error: message });
  }
});

mapsRouter.post("/", async (req, res) => {
  const name = String(req.body?.name || "").trim() || "Novo Mapa";
  const itemColors = normalizeJsonObject(req.body?.itemColors, {});
  const colorNames = normalizeJsonObject(req.body?.colorNames, {});
  const notes = typeof req.body?.notes === "string" ? req.body.notes : "";

  const mapId = uuidv4();

  await pool.query(
    `INSERT INTO maps (id, owner_id, name, item_colors, color_names, notes)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)`,
    [mapId, req.user.id, name, JSON.stringify(itemColors), JSON.stringify(colorNames), notes],
  );

  const created = await getAccessibleMap(mapId, req.user.id);
  return res.status(201).json({ map: mapRowToDto(created, req.user.id) });
});

mapsRouter.get("/backup", async (req, res) => {
  const result = await pool.query(
    `SELECT
       m.id,
       m.name,
       m.item_colors,
       m.color_names,
       m.notes,
       m.is_public,
       m.created_at,
       m.updated_at,
       COALESCE(
         (
           SELECT json_agg(
             json_build_object(
               'username', u.username,
               'canEdit', ms.can_edit
             )
             ORDER BY u.username
           )
           FROM map_shares ms
           JOIN users u ON u.id = ms.shared_with_user_id
           WHERE ms.map_id = m.id
         ),
         '[]'::json
       ) AS shares
     FROM maps m
     WHERE m.owner_id = $1
     ORDER BY m.updated_at DESC`,
    [req.user.id],
  );

  const maps = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    itemColors: normalizeJsonObject(row.item_colors, {}),
    colorNames: normalizeJsonObject(row.color_names, {}),
    notes: typeof row.notes === "string" ? row.notes : "",
    isPublic: Boolean(row.is_public),
    shares: Array.isArray(row.shares) ? row.shares : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return res.json({
    app: "OCMapas",
    version: 1,
    exportedAt: new Date().toISOString(),
    maps,
  });
});

mapsRouter.get("/:id", async (req, res) => {
  const row = await getAccessibleMap(req.params.id, req.user.id);
  if (!row) {
    return res.status(404).json({ error: "Mapa não encontrado." });
  }
  return res.json({ map: mapRowToDto(row, req.user.id) });
});

mapsRouter.put("/:id", async (req, res) => {
  const row = await getAccessibleMap(req.params.id, req.user.id);
  if (!row) {
    return res.status(404).json({ error: "Mapa não encontrado." });
  }

  const permission = row.owner_id === req.user.id ? "owner" : row.can_edit ? "edit" : "read";
  if (permission === "read") {
    return res.status(403).json({ error: "Sem permissão para editar este mapa." });
  }

  const name = String(req.body?.name || row.name).trim() || row.name;
  const itemColors = normalizeJsonObject(req.body?.itemColors, normalizeJsonObject(row.item_colors, {}));
  const colorNames = normalizeJsonObject(req.body?.colorNames, normalizeJsonObject(row.color_names, {}));
  const notes = typeof req.body?.notes === "string" ? req.body.notes : row.notes;

  await pool.query(
    `UPDATE maps
       SET name = $1,
           item_colors = $2::jsonb,
           color_names = $3::jsonb,
           notes = $4,
           updated_at = NOW()
     WHERE id = $5`,
    [name, JSON.stringify(itemColors), JSON.stringify(colorNames), notes, req.params.id],
  );

  const updated = await getAccessibleMap(req.params.id, req.user.id);
  return res.json({ map: mapRowToDto(updated, req.user.id) });
});

mapsRouter.delete("/:id", async (req, res) => {
  const result = await pool.query("DELETE FROM maps WHERE id = $1 AND owner_id = $2", [req.params.id, req.user.id]);

  if (result.rowCount === 0) {
    return res.status(403).json({ error: "Só o proprietário pode apagar o mapa." });
  }

  return res.status(204).send();
});

mapsRouter.post("/:id/copy", async (req, res) => {
  const row = await getAccessibleMap(req.params.id, req.user.id);
  if (!row || row.owner_id !== req.user.id) {
    return res.status(403).json({ error: "Só pode copiar mapas seus." });
  }

  const copyId = uuidv4();
  const baseName = `${row.name} (cópia)`;

  await pool.query(
    `INSERT INTO maps (id, owner_id, name, item_colors, color_names, notes)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)`,
    [copyId, req.user.id, baseName, JSON.stringify(row.item_colors), JSON.stringify(row.color_names), row.notes],
  );

  const copied = await getAccessibleMap(copyId, req.user.id);
  return res.status(201).json({ map: mapRowToDto(copied, req.user.id) });
});

mapsRouter.patch("/:id/visibility", async (req, res) => {
  const isPublic = Boolean(req.body?.isPublic);

  const result = await pool.query(
    `UPDATE maps
        SET is_public = $1,
            updated_at = NOW()
      WHERE id = $2
        AND owner_id = $3
      RETURNING id`,
    [isPublic, req.params.id, req.user.id],
  );

  if (!result.rowCount) {
    return res.status(403).json({ error: "Só o proprietário pode alterar visibilidade." });
  }

  const row = await getAccessibleMap(req.params.id, req.user.id);
  return res.json({ map: mapRowToDto(row, req.user.id) });
});

mapsRouter.get("/:id/shares", async (req, res) => {
  const ownerResult = await pool.query("SELECT owner_id FROM maps WHERE id = $1", [req.params.id]);
  const map = ownerResult.rows[0];

  if (!map || map.owner_id !== req.user.id) {
    return res.status(403).json({ error: "Só o proprietário pode gerir partilhas." });
  }

  const result = await pool.query(
    `SELECT ms.id, ms.can_edit, u.id AS user_id, u.username
       FROM map_shares ms
       JOIN users u ON u.id = ms.shared_with_user_id
      WHERE ms.map_id = $1
      ORDER BY u.username ASC`,
    [req.params.id],
  );

  return res.json({ shares: result.rows.map((row) => ({ id: row.id, canEdit: row.can_edit, userId: row.user_id, username: row.username })) });
});

mapsRouter.post("/:id/shares", async (req, res) => {
  const ownerResult = await pool.query("SELECT owner_id FROM maps WHERE id = $1", [req.params.id]);
  const map = ownerResult.rows[0];

  if (!map || map.owner_id !== req.user.id) {
    return res.status(403).json({ error: "Só o proprietário pode partilhar." });
  }

  const requestedUserId = Number(req.body?.userId);
  const username = normalizeUsername(req.body?.username);
  const canEdit = Boolean(req.body?.canEdit);

  if (!Number.isFinite(requestedUserId) && !username) {
    return res.status(400).json({ error: "Indique um utilizador para partilhar." });
  }

  const userResult = Number.isFinite(requestedUserId)
    ? await pool.query("SELECT id, username FROM users WHERE id = $1", [requestedUserId])
    : await pool.query("SELECT id, username FROM users WHERE username = $1", [username]);
  const targetUser = userResult.rows[0];

  if (!targetUser) {
    return res.status(404).json({ error: "Utilizador de destino não encontrado." });
  }

  if (targetUser.id === req.user.id) {
    return res.status(400).json({ error: "O proprietário já tem acesso total." });
  }

  await pool.query(
    `INSERT INTO map_shares (map_id, shared_with_user_id, can_edit)
     VALUES ($1, $2, $3)
     ON CONFLICT (map_id, shared_with_user_id)
     DO UPDATE SET can_edit = EXCLUDED.can_edit`,
    [req.params.id, targetUser.id, canEdit],
  );

  return res.status(201).json({ ok: true });
});

mapsRouter.delete("/:id/shares/:shareId", async (req, res) => {
  const ownerResult = await pool.query("SELECT owner_id FROM maps WHERE id = $1", [req.params.id]);
  const map = ownerResult.rows[0];

  if (!map || map.owner_id !== req.user.id) {
    return res.status(403).json({ error: "Só o proprietário pode remover partilhas." });
  }

  await pool.query("DELETE FROM map_shares WHERE id = $1 AND map_id = $2", [req.params.shareId, req.params.id]);
  return res.status(204).send();
});
