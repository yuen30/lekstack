- # PHP 8.5.2 - Linux x86_64 Binaries

Built with the following features:
- ✅ PHP-FPM (FastCGI Process Manager)
- ✅ CLI (Command Line Interface)
- ✅ OpenSSL, cURL, Zlib
- ✅ MySQL/MariaDB (mysqli, PDO)
- ✅ PostgreSQL (pgsql, PDO)
- ✅ GD (JPEG, PNG, WebP, FreeType)
- ✅ mbstring, intl, opcache
- ✅ bcmath, gmp, sodium
- ✅ ZIP, BZ2, readline
- ✅ SOAP, sockets, FTP

### Available Downloads:

- **`php-8.5.2-cli-linux-x86_64.tar.gz`** - CLI binary only (~15MB)
- **`php-8.5.2-fpm-linux-x86_64.tar.gz`** - FPM binary and configs (~5MB)
- **`php-8.5.2-full-linux-x86_64.tar.gz`** - Complete installation (~50MB)

### Installation:

```bash
# Extract to ~/.lekstack/versions/php/8.5/
wget https://github.com/yuen30/lekstack/releases/download/php-8.5.2/php-8.5.2-full-linux-x86_64.tar.gz
mkdir -p ~/.lekstack/versions/php/8.5
tar -xzf php-8.5.2-full-linux-x86_64.tar.gz -C ~/.lekstack/versions/php/8.5/
```

### Verify checksums:

```bash
sha256sum -c checksums-8.5.2.txt
```

---

🤖 Built automatically with GitHub Actions
📅 Build date: 2026-01-29T07:15:05Z
🔧 Builder: ubuntu-22.04
