
# 📘 **HederaDeFAI — AI-Powered Hedera DeFi Assistant with x402 Micro-Payments**

**HederaDeFAI** is a **DeFi-inspired AI assistant** that helps users seamlessly interact with the **Hedera network** directly through **Telegram**. It blends the simplicity of chat interfaces with the power of decentralized finance — making Web3 interactions frictionless.

Users can claim tokens, make transfers, buy airtime, and now even **pay for premium trading signals using Hedera x402 micropayments**.

---

# 🧩 **What Problem Are We Solving?**

Interacting with Web3 normally requires:

* Technical blockchain knowledge
* Switching between multiple dApps
* Manual wallet usage
* A steep learning curve for new users

**HederaDeFAI fixes this by letting users perform DeFi actions just by chatting.**

The bot helps users:

* Claim test tokens
* Send hUSDT or HBAR
* Buy Nigerian airtime
* View balances
* Retrieve wallet addresses
* Unlock premium AI Creator Economy using Hedera x402
* (Coming soon) Token swaps, airdrops, and more

Powered by:

* **Mastra AI**
* **Hedera Agent Kit**
* **x402 micropayment protocol**

---

# 🔐 **Custody Model**

HederaDeFAI currently uses a **custodial wallet model**:

✔ Easiest onboarding for non-technical users
✔ Lets the bot sign HBAR/HTS actions automatically

Future upgrades will support:

* WalletConnect
* HashPack
* Non-custodial operation

---

# 🛠️ **Local Setup**

## 📦 Prerequisites

Ensure you have:

* Node.js ≥ 18
* pnpm or npm
* SQLite or LibSQL
* Telegram bot token
* Reloadly account (optional: airtime)
* Hedera testnet access
* x402 facilitator server running locally OR via hosted URL

---

# 🔑 **1. Clone the Bot Repo**

```bash
git clone https://github.com/josefophe/hederadefai.git
cd hederadefai
```

---

# 🔧 **2. Install x402 (Custom Fork)**

This project uses your custom fork of **x402-hedera**.

Clone it:

```bash
git clone https://github.com/josefophe/x402-hedera
```

Inside the repo, you can run and explore:

```
/examples/typescript/facilitator
/examples/typescript/client/fetch
/examples/typescript/server/express
```

Or install your local version via `package.json`:

```json
"x402-fetch": "/Users/user/Documents/hedera/x402-hedera/typescript/packages/x402-fetch",
"x402-express": "/Users/user/Documents/hedera/x402-hedera/typescript/packages/x402-express"
```

> Users can replace these absolute paths with the correct local path after cloning.

---

# 📁 **3. Install dependencies**

```bash
pnpm install
# or
npm install
```

---

# 🔐 **4. Create Environment Variables**

Create a `.env` file in your root:

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_token


# Airtime (Reloadly)
RELOADLY_CLIENT_ID=
RELOADLY_CLIENT_SECRET=
RELOADLY_OPERATOR_ID=

#AI
API_BASE_URL=http://127.0.0.1:11434/api
MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b
DATABASE_URL=file:./mastra2.db

# Hedera
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.xxxxx
HEDERA_OPERATOR_KEY=3030...
USDT_TOKEN_ID=0.0.xxxxx
PLATFORM_TOKEN_IDS=0.0.xxxxxx
TREASURY_ACCOUNT_ID=0.0.xxxxxx

# x402 micropayments
FACILITATOR_URL=http://localhost:4021
# PAY_TO_ADDRESS=0.0.xxxxx



# Security
ENCRYPTION_KEY=your_32_byte_hex_key
ENCRYPTION_IV=
```

---

# 💽 **5. Start the Bot**

```bash
pnpm run dev
```

Bot will automatically connect to Telegram.

---

# 🚀 **Usage Guide**

### `/start`

Shows all available commands.

---

### `/mywallet`

Shows, fund, associate and generates your Hedera wallet address.


### `/balance`

View wallet balance (HBAR + hUSDT).

---

### `/transferusdt <receiver> <amount>`

Transfers hUSDT to a wallet or Telegram user.


---

### `/transferhbar <receiver> <amount>`

Transfers HBAR to a wallet or Telegram user.

---

### `/airtime <phone> <amount> NGN`

Buy Nigerian airtime using hUSDT (via Reloadly).

---

# 💰 x402-Powered Paid Trading Signals Example**

### `/paidsignal`

Unlock premium trading signals using Hedera x402 micropayments.

Flow:

1. User runs `/paidsignal`
2. Bot creates x402 payment request
3. User pays in hUSDT
4. Bot verifies payment
5. Signal is delivered instantly

Example:

```
/paidsignal
```

Bot response:

```
Processing your x402 payment...
✔ Payment of $0.001 hUSDT received!
BTC/USDT Signal:
Buy: $95,000
Target: $97,000
Stop Loss: $94,000
```
---












```
/docs/CREATOR_ECONOMY.md
```


---

## 🎨 Creator Economy Powered by x402 Micropayments

HederaDeFAI is not just a Telegram bot — it is the foundation of a **new creator economy for information**, where **any user can monetize knowledge** using **Hedera x402 micropayments**.

We enable creators to sell:

* Trading signals
* Market analysis
* Research notes
* AI-generated insights
* Any text-based digital product

All sold as **pay-per-view micro-assets**.

### 🔑 How It Works

1. **Creator submits a paid signal:**

   ```
   /signal "BTC Breakout" "Buy at 95k..." "0.5"
   ```
2. The signal is **stored** on our x402-protected backend
3. It appears in the **public signal marketplace**
4. Consumers unlock it via:

   ```
   /paidsignal <id>
   ```
5. Bot generates an **x402 micropayment request**
6. User pays in **hUSDT**
7. Signal is **instantly delivered** upon payment validation

### 🚀 Why x402 Matters

x402 allows us to build what Web2 cannot:
**true micro-commerce**, with prices as low as **$0.001** per piece of knowledge.

This unlocks a new form of digital economy:

✔ Pay-per-use
✔ No subscriptions
✔ Instant settlement
✔ Borderless creator payouts
✔ No platform custody of funds

---

















# ⚙️ **How It Works (Architecture)**

### Mastra AI

Parses natural language and executes tools.

### Hedera Agent Kit

Performs on-chain:

* HTS transfers
* HBAR transfers
* Balance lookups

### x402 Micropayments

Used to protect premium resources.

Two packages imported directly:

```
x402-fetch → client-side signer + verifier  
x402-express → server-side validator + facilitator communication
```

You are using **direct local imports**, like:

```json
"x402-fetch": "/Users/user/Documents/hedera/x402-hedera/typescript/packages/x402-fetch"
```

Anyone cloning x402 repo can simply update the path.

---

# 📦 **Tech Stack**

* Node.js + TypeScript
* Telegram Bot API
* Mastra AI Framework
* Hedera Hashgraph + HTS
* x402 (Fetch + Express + Facilitator)
* Reloadly Airtime API
* Prisma + SQLite / LibSQLStore

---

# 🛡️ **Security Notice**

This project stores Hedera wallet keys **server-side**, encrypted.

❗ Do NOT use real assets
✔ Safe for:

* Testnet
* Hackathons
* Demos
* Experiments

