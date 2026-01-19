# Aloware Import Worker

Cloudflare Worker to import Aloware CSV exports into Supabase.

## Deploy

### Option 1: Cloudflare Dashboard
1. Go to Workers & Pages > Create > Create Worker
2. Name it `aloware-import`
3. Click Deploy
4. Click "Edit code"
5. Paste contents of `worker.js`
6. Click Deploy

### Option 2: Wrangler CLI
```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

## Usage

1. Visit the worker URL (e.g., `https://aloware-import.YOUR-SUBDOMAIN.workers.dev`)
2. Click to select your Aloware CSV export
3. Click "Clear Table First" if reimporting
4. Click "Start Import"

Progress is saved in browser - can resume if you close the tab.

## Prerequisites

Create the table in Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS aloware_import (
  id SERIAL PRIMARY KEY,
  "Started At" TEXT,
  "Type" TEXT,
  "Direction" TEXT,
  "Disposition Status" TEXT,
  "Line Name" TEXT,
  "Incoming Number" TEXT,
  "Team" TEXT,
  "Inbox Name" TEXT,
  "Sequence Name" TEXT,
  "Broadcast Name" TEXT,
  "Talk Time" TEXT,
  "Wait Time" TEXT,
  "Hold Time" TEXT,
  "Duration" TEXT,
  "Resolution" TEXT,
  "Queue Resolution" TEXT,
  "Contact Number" TEXT,
  "Contact First Name" TEXT,
  "Contact Last Name" TEXT,
  "Contact Owner" TEXT,
  "Email" TEXT,
  "Location" TEXT,
  "User Name" TEXT,
  "Attempting" TEXT,
  "Cold Transferred" TEXT,
  "Transferred From" TEXT,
  "Transferred To" TEXT,
  "Transfer Type" TEXT,
  "Callback Status" TEXT,
  "Creator Type" TEXT,
  "Tags" TEXT,
  "Notes" TEXT,
  "Communication ID" BIGINT,
  "Contact ID" BIGINT,
  "Body" TEXT,
  "Contact Link" TEXT,
  "Communication Link" TEXT,
  "Call Disposition" TEXT,
  "Voicemail" TEXT,
  "Recording" TEXT
);
```
