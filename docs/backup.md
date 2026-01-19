# Backups (VPS + Docker Compose)

This setup creates daily backups of:
- Postgres database (pg_dump custom format).
- Media directory (avatars, uploads).

It uploads to Google Drive via rclone and sends the archive to Telegram.

## Requirements

- Docker + docker compose (or docker-compose).
- `curl` (Telegram upload).
- `rclone` (Drive upload).

## Setup

### 1) Telegram bot + channel

1. Create a bot with @BotFather and get the token.
2. Create a private channel and add the bot as admin.
3. Get the chat id:
   - Send a message to the channel.
   - Run:  
     `curl -s "https://api.telegram.org/bot<token>/getUpdates"`
   - Look for `chat.id` (usually starts with `-100`).

### 2) Google Drive (rclone)

1. Install rclone on the VPS.
2. Configure a Drive remote (example name: `gdrive`):
   - `rclone config`
3. Create a folder in Drive for backups (e.g. `recallio-backups`).

### 3) Environment file

Create a backup env file on the server, for example `/etc/recallio/backup.env`:

```bash
BACKUP_DIR=/var/backups/recallio
BACKUP_NAME_PREFIX=recallio
BACKUP_RETENTION_DAYS=30
BACKUP_DRIVE_RETENTION_DAYS=90
BACKUP_COMPOSE_FILE=/opt/recallio/infra/docker-compose.yml
BACKUP_MEDIA_DIR=/opt/recallio/api/media

BACKUP_ENABLE_TELEGRAM=true
BACKUP_TELEGRAM_BOT_TOKEN=...
BACKUP_TELEGRAM_CHAT_ID=...
BACKUP_TELEGRAM_MAX_BYTES=0

BACKUP_ENABLE_DRIVE=true
BACKUP_DRIVE_REMOTE=gdrive:recallio-backups
```

You can also merge these values into the main `.env` if you prefer.

## Manual backup (test)

```bash
cd /opt/recallio
BACKUP_ENV_FILE=/etc/recallio/backup.env ./scripts/backup.sh
```

Check:
- A new file in `/var/backups/recallio`.
- A copy in Google Drive.
- A message in your Telegram channel.

## Schedule (cron)

Run every day at 03:00:

```bash
crontab -e
```

Add:

```cron
0 3 * * * BACKUP_ENV_FILE=/etc/recallio/backup.env /opt/recallio/scripts/backup.sh >> /var/log/recallio-backup.log 2>&1
```

## Restore (fast recovery)

1. Download a backup archive locally (from Drive or Telegram).
2. Run restore on the server:

```bash
cd /opt/recallio
BACKUP_ENV_FILE=/etc/recallio/backup.env ./scripts/restore.sh --force /path/to/recallio_YYYYmmdd_HHMMSS.tar.gz
```

Notes:
- The restore will overwrite the database.
- Media is restored into `BACKUP_MEDIA_DIR`.
- If you want an exact media snapshot, set `BACKUP_RESTORE_CLEAN_MEDIA=true`.

## Verification checklist

- Backup job runs on schedule (cron log has no errors).
- Latest archive exists locally and in Drive.
- Telegram receives the archive.
- Optional: once a month, run a restore on a staging copy of the server.
