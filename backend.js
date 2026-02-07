import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();

import fetch from "node-fetch";
import {
  getUsers,
  getCashoutRewards,
  getCodes
} from "./sheets.js";

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

/* -----------------------------------------------------
   HELPERS
------------------------------------------------------ */
function toMoney(v) {
  return Number(v || 0);
}

async function findUser(userid) {
  const users = await getUsers();
  return users.find(u => u.userid === String(userid));
}

/* -----------------------------------------------------
   WRITE TO GOOGLE SHEETS (Apps Script)
------------------------------------------------------ */
async function updateUser(userObj) {
  await fetch(`${APPS_SCRIPT_URL}?action=updateUser`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userObj)
  });
}

async function markCodeRedeemed(codeValue) {
  await fetch(`${APPS_SCRIPT_URL}?action=redeemCode&code=${encodeURIComponent(codeValue)}`, {
    method: "POST"
  });
}

/* -----------------------------------------------------
   1) CPX CALLBACK → adds survey earnings to cashout balance
------------------------------------------------------ */
app.post("/cpx/callback", async (req, res) => {
  const userId = req.body.ext_user_id;
  const payout = Number(req.body.payout || 0);

  const user = await findUser(userId);
  if (!user) return res.send("OK");

  const earned = payout * 0.5;
  user.cashout_balance = (toMoney(user.cashout_balance) + earned).toFixed(2);

  await updateUser(user);
  res.send("OK");
});

/* -----------------------------------------------------
   2) REDEEM CODE ($1.00 MINIMUM)
------------------------------------------------------ */
app.post("/api/redeem-code", async (req, res) => {
  const userId = req.body.userid;
  const user = await findUser(userId);

  if (!user) return res.status(400).json({ error: "User not found" });

  const cashout = toMoney(user.cashout_balance);
  if (cashout < 1.0)
    return res.status(400).json({ error: "Need $1.00 minimum to redeem" });

  const codes = await getCodes();
  const code = codes.find(c => (c.TRUE_FALSE || "").toUpperCase() !== "TRUE");
  if (!code) return res.status(400).json({ error: "No codes available" });

  const playAdd = Number(code.PLAY_BALANCE_AMOUNT_REDEEMED || 0);

  user.cashout_balance = (cashout - 1.0).toFixed(2);
  user.play_balance = (toMoney(user.play_balance) + playAdd).toFixed(2);

  await updateUser(user);
  await markCodeRedeemed(code.CODE);

  res.json({
    success: true,
    code: code.CODE,
    added: playAdd,
    play_balance: user.play_balance,
    cashout_balance: user.cashout_balance
  });
});

/* -----------------------------------------------------
   3) LUCKY NUMBER GAME
------------------------------------------------------ */
function random6() {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1);
}

function countMatches(picks, draw) {
  const copy = [...draw];
  let m = 0;
  for (const n of picks) {
    const i = copy.indexOf(n);
    if (i !== -1) {
      m++;
      copy.splice(i, 1);
    }
  }
  return m;
}

app.post("/api/play-lucky", async (req, res) => {
  const userId = req.body.userid;
  let picks = req.body.numbers;

  if (!Array.isArray(picks))
    return res.status(400).json({ error: "numbers must be array" });

  picks = picks.map(n => Number(n)).filter(n => n >= 1 && n <= 6);
  if (picks.length === 0 || picks.length > 6)
    return res.status(400).json({ error: "Pick 1–6 numbers (1–6)" });

  const user = await findUser(userId);
  if (!user) return res.status(400).json({ error: "User not found" });

  const play = toMoney(user.play_balance);
  const cost = picks.length * 0.15;

  if (play < cost)
    return res.status(400).json({ error: "Not enough play balance" });

  const draw = random6();
  const matches = countMatches(picks, draw);

  let prize = 0;
  if (matches === 6) prize = 2.0;
  else if (matches === 4) prize = 1.32;
  else if (matches === 2) prize = 0.66;

  user.play_balance = (play - cost + prize).toFixed(2);
  user["lucky#"] = picks.join("-");
  user.prize = prize.toFixed(2);

  await updateUser(user);

  res.json({
    picks,
    draw,
    matches,
    prize: prize.toFixed(2),
    play_balance: user.play_balance
  });
});

/* -----------------------------------------------------
   4) GET USER BALANCES
------------------------------------------------------ */
app.get("/api/get-user", async (req, res) => {
  const user = await findUser(req.query.userid);
  if (!user) return res.json({ error: "User not found" });

  res.json({
    userid: user.userid,
    play_balance: user.play_balance,
    cashout_balance: user.cashout_balance
  });
});

/* -----------------------------------------------------
   5) CASHOUT REWARDS
------------------------------------------------------ */
app.get("/api/cashout-rewards", async (req, res) => {
  res.json(await getCashoutRewards());
});

/* -----------------------------------------------------
   SERVER START
------------------------------------------------------ */
app.get("/", (req, res) => {
  res.send("Lucky Game API Running");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on port", port));
