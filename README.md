# 🔒 Vaultify — Self-hosted Password Manager

A secure, self-hosted password manager with a clean dark UI. Built for personal and small-family use.

---

## Features

- **AES-256-GCM encryption** — passwords encrypted at rest using a key derived from your master password (PBKDF2-SHA256, 310,000 iterations)
- **Master password login** — bcrypt-hashed, never stored in plaintext
- **Auto-lock** — vault locks after inactivity (default 15 min), configurable
- **Password generator** — cryptographically random, fully configurable
- **Secure Notes** — store secrets beyond just passwords
- **Reveal button** — passwords hidden as dots, one tap to reveal
- **Categories** — organise entries into folders
- **Favourites** — pin important entries
- **Import / Export** — JSON and CSV (compatible with Bitwarden/1Password/Chrome exports)
- **Fully responsive** — works on desktop and mobile

---

## Requirements

- Ubuntu Server 24.04 LTS (latest)
- Docker Engine 24+
- Docker Compose v2

---

## Installation

### 1. Install Docker

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add your user to the docker group (log out and back in after)
sudo usermod -aG docker $USER

# Verify
docker --version
docker compose version
```

### 2. Clone / copy the project

```bash
# Create directory
mkdir -p ~/vaultify && cd ~/vaultify

# Copy all project files here (or git clone if you've pushed it)
```

### 3. Configure environment

```bash
cp .env.example .env
nano .env
```

Set these values in `.env`:

```env
# Generate a strong JWT secret (required):
JWT_SECRET=$(openssl rand -base64 48)

# Your server's IP or domain:
FRONTEND_URL=http://YOUR_SERVER_IP
# or: FRONTEND_URL=https://vault.yourdomain.com

PORT=80
SESSION_HOURS=8
```

You can also set `JWT_SECRET` directly by running:
```bash
echo "JWT_SECRET=$(openssl rand -base64 48)" >> .env
```

### 4. Build and start

```bash
docker compose up -d --build
```

This will:
- Build the Node.js backend image
- Build the React frontend and bundle it into an Nginx image
- Start both containers with the backend on an internal network
- Expose the app on port 80

Check status:
```bash
docker compose ps
docker compose logs -f
```

### 5. Open in browser

Navigate to `http://YOUR_SERVER_IP` — create your account on first visit.

---

## HTTPS / TLS (Recommended for production)

For secure access from outside your home network, set up TLS with Nginx + Certbot:

```bash
sudo apt install nginx certbot python3-certbot-nginx -y

# Point your domain to your server's IP first, then:
sudo certbot --nginx -d vault.yourdomain.com
```

Then change `PORT=443` in `.env` and update `FRONTEND_URL` to your `https://` URL.

Alternatively, run Vaultify behind a reverse proxy like **Caddy** (automatic HTTPS):

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# Caddyfile:
# vault.yourdomain.com {
#   reverse_proxy localhost:80
# }
```

---

## Updating

```bash
cd ~/vaultify
git pull  # if using git
docker compose down
docker compose up -d --build
```

Your vault data is stored in a Docker volume (`vault_data`) and is preserved across updates.

---

## Backup

```bash
# Backup the SQLite database
docker run --rm -v vaultify_vault_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/vaultify-backup-$(date +%Y%m%d).tar.gz /data

# Restore
docker run --rm -v vaultify_vault_data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/vaultify-backup-YYYYMMDD.tar.gz -C /
```

---

## Security Notes

- The master password is **never stored** — it's hashed with bcrypt and used to derive the vault encryption key via PBKDF2
- All passwords and notes are encrypted with **AES-256-GCM** before being written to disk
- The vault encryption key only exists in memory during an authenticated session (embedded in the JWT)
- Export files contain **plaintext passwords** — handle with care
- The backend is not exposed to the internet directly; only the Nginx frontend is
- Rate limiting is enabled on all API endpoints (20 login attempts / 15 min)

---

## Project Structure

```
vaultify/
├── backend/
│   ├── src/
│   │   ├── db/database.js       # SQLite setup
│   │   ├── middleware/auth.js   # JWT verification
│   │   ├── routes/
│   │   │   ├── auth.js          # Login / register
│   │   │   ├── vault.js         # CRUD for entries
│   │   │   └── exportImport.js  # CSV & JSON i/o
│   │   ├── utils/crypto.js      # AES-256-GCM + PBKDF2
│   │   └── index.js             # Express app
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/          # UI building blocks
│   │   ├── context/             # Auth + Toast state
│   │   ├── pages/               # Login, Vault
│   │   └── utils/               # API client, password utils
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Firewall (UFW)

```bash
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp   # if using HTTPS
sudo ufw enable
```

---

## Multi-user (Future)

The backend fully supports multiple user accounts — each user has their own isolated vault with a unique encryption salt. You can register additional accounts at the `/` login page. To restrict registration to invited users only, set `REGISTRATION_OPEN=false` in `.env` (feature flag ready for implementation).
