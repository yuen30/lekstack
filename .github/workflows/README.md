# PHP Binary Builder

This directory contains GitHub Actions workflows for building PHP binaries with FPM support.

## 🚀 Quick Start

### Build PHP Binary

1. Go to **Actions** tab in GitHub
2. Select **"Build PHP Binaries with FPM"** workflow
3. Click **"Run workflow"**
4. Fill in:
   - **PHP Version**: Full version (e.g., `8.3.16`, `8.4.3`)
   - **Short Version**: Major.Minor only (e.g., `8.3`, `8.4`)
5. Click **"Run workflow"** button

The workflow will:
- ✅ Download PHP source from php.net
- ✅ Compile with all major extensions
- ✅ Create 3 archives (CLI, FPM, Full)
- ✅ Upload to GitHub Releases
- ✅ Generate SHA256 checksums

---

## 📦 Build Matrix

### Recommended Versions to Build

| Version | Release Date | Status | Support Until | Command |
|---------|-------------|--------|---------------|---------|
| 8.5.2 | Nov 2025 | Latest | Dec 2029 | `php_version: 8.5.2`, `short_version: 8.5` |
| 8.4.17 | Nov 2024 | Stable | Dec 2028 | `php_version: 8.4.17`, `short_version: 8.4` |
| 8.3.30 | Nov 2023 | LTS (Recommended) | Dec 2027 | `php_version: 8.3.30`, `short_version: 8.3` |
| 8.2.30 | Dec 2022 | Security Only | Dec 2026 | `php_version: 8.2.30`, `short_version: 8.2` |

---

## 📋 What's Included in the Build

### Core Features
- ✅ **PHP-FPM** - FastCGI Process Manager
- ✅ **CLI** - Command Line Interface
- ✅ **Opcache** - Bytecode cache

### Extensions
- **Database**: mysqli, pdo_mysql, pdo_pgsql, pgsql
- **Compression**: zip, bz2, zlib
- **Crypto**: openssl, sodium, password-argon2
- **Image**: gd (jpeg, png, webp, freetype, xpm)
- **String**: mbstring, mbregex, intl
- **Math**: bcmath, gmp
- **Network**: curl, ftp, soap, sockets, ldap
- **System**: pcntl, shmop, sysvmsg, sysvsem, sysvshm
- **Utilities**: calendar, exif, readline

### Build Configuration

```bash
./configure \
  --prefix=/opt/php-{version} \
  --enable-fpm \
  --enable-cli \
  --enable-opcache \
  --with-openssl \
  --with-curl \
  --with-mysqli \
  --with-pdo-mysql \
  --enable-gd \
  --enable-mbstring \
  # ... and 30+ more flags
```

---

## 📥 Using the Built Binaries

### In LekStack

The binaries are automatically used when you update `runtime.rs`:

```rust
"php" => {
    let (download_version, short_ver) = match version.as_str() {
        "8.2" => ("8.2.27", "8.2"),
        "8.3" => ("8.3.16", "8.3"),
        "8.4" => ("8.4.3", "8.4"),
        "8.5" => ("8.5.2", "8.5"),
        _ => ("8.3.16", "8.3"),
    };
    
    vec![
        (format!("https://github.com/taweechai/LekStack/releases/download/php-{}/php-{}-cli-linux-x86_64.tar.gz", download_version, download_version), "php-cli.tar.gz"),
        (format!("https://github.com/taweechai/LekStack/releases/download/php-{}/php-{}-fpm-linux-x86_64.tar.gz", download_version, download_version), "php-fpm.tar.gz")
    ]
}
```

### Manual Installation

```bash
# Download
wget https://github.com/taweechai/LekStack/releases/download/php-8.3.16/php-8.3.16-full-linux-x86_64.tar.gz

# Extract
mkdir -p ~/.lekstack/versions/php/8.3
tar -xzf php-8.3.16-full-linux-x86_64.tar.gz -C ~/.lekstack/versions/php/8.3/

# Verify
~/.lekstack/versions/php/8.3/bin/php -v
~/.lekstack/versions/php/8.3/sbin/php-fpm -v
```

---

## 🔍 Archive Contents

### CLI Archive (~15MB)
```
bin/php                  # PHP CLI binary
lib/php.ini-*           # Sample php.ini files
include/                # Header files
lib/php/                # PHP libraries
```

### FPM Archive (~5MB)
```
sbin/php-fpm            # PHP-FPM binary
etc/                    # Configuration directory
var/                    # Runtime directory
```

### Full Archive (~50MB)
Complete installation with all files from both CLI and FPM.

---

## ⚙️ Customizing the Build

### Add More Extensions

Edit `.github/workflows/build-php.yml` and add to the `Configure PHP` step:

```yaml
--with-imap \
--with-kerberos \
--enable-ffi \
```

### Change Optimization Flags

Add CFLAGS before configure:

```yaml
- name: Configure PHP
  run: |
    cd php-${{ github.event.inputs.php_version }}
    export CFLAGS="-O3 -march=native"
    ./configure \
      ...
```

---

## 🐛 Troubleshooting

### Build fails with "cannot find -lssl"

Install the missing development library:

```yaml
sudo apt-get install -y libssl-dev
```

### Build fails with "error: X was not declared"

The extension might not be compatible with the PHP version. Remove the flag from configure.

### Binary doesn't work on target system

The binary is built on Ubuntu 22.04 with glibc 2.35. Target systems must have:
- Linux kernel 3.2+
- glibc 2.35+ (or compile on older Ubuntu)

---

## 📊 Build Time & Resources

- **Duration**: ~10-20 minutes per version
- **CPU**: Uses all available cores (nproc)
- **Disk**: ~2GB per build (cleaned after)
- **Network**: ~20MB download (source)

---

## 🔐 Security

- All downloads are from official php.net
- SHA256 checksums are generated
- No third-party code injected
- Reproducible builds (same inputs = same outputs)

---

## 📝 Notes

- Binaries are **statically linked where possible** but still require glibc
- For true static binaries, use Alpine Linux + musl (see `build-php-static.yml`)
- FPM config must be provided at runtime (not included in binary)
- Extensions like **ioncube**, **SourceGuardian** require separate installation

---

## 🎯 Next Steps

After building:

1. ✅ Test the binary locally
2. ✅ Update `runtime.rs` with new URLs
3. ✅ Update version catalog in `VersionManagerView.tsx`
4. ✅ Test installation through LekStack UI
5. ✅ Document any issues in GitHub Issues

---

**Built with ❤️ for LekStack**
