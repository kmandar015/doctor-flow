# WhatsApp Setup Guide (Meta WhatsApp Cloud API)

DoctorFlow talks to patients through Meta's **WhatsApp Cloud API**. It is Meta's own
service, so there is no middleman fee, and it comes with a **free test number** that is
enough for a client demo.

Until this is set up, the app runs in **demo mode** (`WHATSAPP_PROVIDER=simulated`):
nothing is sent to real phones, and you play patients from the **WhatsApp** page.

---

## What you need

- A Facebook account (to create a Meta developer account)
- 15–20 minutes
- The phone(s) you will demo from, with WhatsApp installed (up to 5 test numbers)
- A tunnel so Meta can reach your laptop: [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) (free, no account needed) or ngrok

---

## 1. Create the Meta app

1. Go to <https://developers.facebook.com/apps> and click **Create app**.
2. Use case: **Other** → type **Business** → give it a name (e.g. "DoctorFlow").
3. On the app dashboard, find **WhatsApp** and click **Set up**.
   Meta creates a test WhatsApp Business Account and a **test phone number** for you.

## 2. Add the phones you will demo with

1. Open **WhatsApp → API Setup**.
2. Under **To**, click **Manage phone number list** and add your number (and the client's).
   Each number gets a verification code on WhatsApp. Up to 5 numbers.

## 3. Copy the IDs and secrets

| Value | Where | `.env.local` key |
|---|---|---|
| Phone number ID | WhatsApp → API Setup (under the test number) | `WHATSAPP_PHONE_NUMBER_ID` |
| Test number (display) | WhatsApp → API Setup | `NEXT_PUBLIC_WHATSAPP_NUMBER` |
| App secret | App settings → Basic → App secret → Show | `WHATSAPP_APP_SECRET` |
| Access token | see below | `WHATSAPP_ACCESS_TOKEN` |
| Verify token | any string you make up | `WHATSAPP_VERIFY_TOKEN` |

**Access token.** The token on the API Setup page **expires after 24 hours**, fine for a
first test. For the demo day, make a permanent one:

1. <https://business.facebook.com/settings> → **Users → System users** → **Add** (role: Admin).
2. **Assign assets**: your app (full control) and the WhatsApp account (full control).
3. **Generate new token** → choose your app → expiry **Never** → permissions
   `whatsapp_business_messaging` and `whatsapp_business_management`.

## 4. Put them in `.env.local`

```
WHATSAPP_PROVIDER=meta
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_APP_SECRET=...
WHATSAPP_VERIFY_TOKEN=pick-any-long-string
NEXT_PUBLIC_WHATSAPP_NUMBER=+1 555 ...
```

Restart the app (`npm run dev`, or `npm run build && npm start`).
**My account** should now say "Connected to WhatsApp".

## 5. Give Meta a public URL (tunnel)

```bash
cloudflared tunnel --url http://localhost:3000
```

It prints an address like `https://random-words.trycloudflare.com`. It changes each time
you start the tunnel, so repeat step 6 whenever it changes.

## 6. Connect the webhook

1. Meta app → **WhatsApp → Configuration → Webhook → Edit**.
2. Callback URL: `https://<your-tunnel>/api/whatsapp/webhook`
3. Verify token: the same `WHATSAPP_VERIFY_TOKEN` as in `.env.local`.
4. **Verify and save**, then under **Webhook fields** subscribe to **messages**.

## 7. Try it

From a phone you added in step 2, send **Hi** to the test number. The assistant replies
with the menu. Book an appointment, and it appears in **Pending requests** on the
dashboard within 15 seconds. Accept it there, and the patient gets the confirmation on
WhatsApp.

---

## Rules worth knowing

- **The patient writes first.** WhatsApp lets a business reply freely for **24 hours**
  after the patient's last message. For the demo, have the client send "Hi" first.
- **Reminders after 24 hours** need a message **template** approved by Meta.
  WhatsApp → Message templates → create a **Utility** template, e.g. named
  `doctorflow_update`, body `Update from your clinic: {{1}}`. Then set
  `WHATSAPP_REMINDER_TEMPLATE=doctorflow_update`. DoctorFlow uses it automatically when a
  normal message is refused for being outside the window.
- **Messages that fail** are shown as "not delivered" in the chat, with Meta's reason on
  hover. Common causes: an expired token, or a recipient not on the test list.

## Going live with the client's own number

1. Verify the client's business in Meta Business Manager (business documents).
2. Add the clinic's phone number to the WhatsApp account. It must **not** be in use on
   the normal WhatsApp app (or it has to be moved off it first).
3. Get the display name approved, add a payment method, create the reminder template.
4. Swap `WHATSAPP_PHONE_NUMBER_ID` and `NEXT_PUBLIC_WHATSAPP_NUMBER`. Nothing else changes.

**Cost:** conversations the patient starts are free to answer. Business-initiated
messages outside the 24-hour window (mostly reminders) are charged per message by Meta.
Utility messages in India cost a fraction of a rupee each. Check Meta's current rate card
("WhatsApp Business Platform pricing") before quoting the client.
