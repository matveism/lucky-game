import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

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

export async function getUsers() {
  const res = await fetch(process.env.USERS_SHEET_CSV_URL);
  return parseCsv(await res.text());
}

export async function getCashoutRewards() {
  const res = await fetch(process.env.CASHOUT_SHEET_CSV_URL);
  return parseCsv(await res.text());
}

export async function getCodes() {
  const res = await fetch(process.env.CODES_SHEET_CSV_URL);
  return parseCsv(await res.text());
}

// TODO: implement real writes via Google Sheets API or Apps Script
export async function updateUser(user) {
  console.log("TODO: update user row in Google Sheets:", user);
}

export async function markCodeRedeemed(code) {
  console.log("TODO: mark code redeemed in Google Sheets:", code);
}
