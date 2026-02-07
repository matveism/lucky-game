import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

/* -----------------------------------------------------
   PARSE CSV → JSON
------------------------------------------------------ */
function parseCsv(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = cols[i] ?? "");
    return obj;
  });
}

/* -----------------------------------------------------
   READ USERS SHEET (CSV)
------------------------------------------------------ */
export async function getUsers() {
  const url = process.env.USERS_SHEET_CSV_URL;
  const res = await fetch(url);
  const text = await res.text();
  return parseCsv(text);
}

/* -----------------------------------------------------
   READ CASHOUT REWARDS SHEET (CSV)
------------------------------------------------------ */
export async function getCashoutRewards() {
  const url = process.env.CASHOUT_SHEET_CSV_URL;
  const res = await fetch(url);
  const text = await res.text();
  return parseCsv(text);
}

/* -----------------------------------------------------
   READ CODES SHEET (CSV)
------------------------------------------------------ */
export async function getCodes() {
  const url = process.env.CODES_SHEET_CSV_URL;
  const res = await fetch(url);
  const text = await res.text();
  return parseCsv(text);
}

/* -----------------------------------------------------
   WRITE OPERATIONS (Apps Script)
------------------------------------------------------ */

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

/**
 * Update user row in Google Sheets
 */
export async function updateUser(userObj) {
  await fetch(`${APPS_SCRIPT_URL}?action=updateUser`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userObj)
  });
}

/**
 * Mark code as redeemed (TRUE)
 */
export async function markCodeRedeemed(codeValue) {
  await fetch(`${APPS_SCRIPT_URL}?action=redeemCode&code=${encodeURIComponent(codeValue)}`, {
    method: "POST"
  });
}
