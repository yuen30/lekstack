# 🚀 LekStack: The Native PHP Development Suite for Linux

LekStack คือเครื่องมือจำลองสภาพแวดล้อมการพัฒนา (Local Development Environment) ระดับ Lightweight ที่ออกแบบมาเพื่อชาว Linux โดยเฉพาะ โดยได้รับแรงบันดาลใจจากความง่ายของ Laravel Herd แต่รันแบบ Native บน Linux Distros

> "Laravel Herd for Linux. Fast. Native. Zero-Config."
>
> LekStack นำประสบการณ์การพัฒนาที่ลื่นไหลแบบ Laravel Herd มาสู่ Linux โดยรันแบบ Native เพื่อประสิทธิภาพสูงสุด พร้อมฟีเจอร์ที่ช่วยให้คุณ Deploy โปรเจกต์ไปยัง Self-hosted Server ได้ง่ายที่สุด

## ✨ Key Features

- **⚡ Lightning Fast**: พัฒนาด้วย Tauri + Rust ทำให้เปิดแอปได้ทันทีและกินทรัพยากรน้อยมาก (Tiny footprint)
- **🔌 Zero Config**: ติดตั้งปุ๊บ พร้อมรันไฟล์ .php ผ่านโดเมน .test ได้ทันทีไม่ต้องตั้งค่าไฟล์ hosts เอง
- **🔄 Multi-Runtime**: รองรับทั้ง **PHP** (8.0-8.5), **Node.js** (NVM integration), และ **Bun**
- **🛠 Integrated Stack**: มาพร้อม Nginx (Optimized for Linux), PHP-FPM และรองรับการจัดการ MariaDB/Redis
- **🚀 Deploy to Self-hosted**: เชื่อมต่อช่องว่างระหว่าง Local และ Production ด้วยเครื่องมือช่วย Deploy ไปยัง VPS ของคุณเอง
- **🐧 Systemd Integration**: จัดการ Lifecycle ของ Service ต่างๆ ผ่าน Systemd ของระบบโดยตรง นิ่งและเสถียร
- **📦 No Docker Required**: รันทุกอย่างบน Bare Metal เพื่อประสิทธิภาพสูงสุดและเข้าถึง Unix Sockets ได้โดยตรง

## 🛠 Tech Stack

| Component | Technology |
|---|---|
| **UI Framework** | React + Tailwind CSS |
| **Build Tool** | Vite |
| **App Shell** | Tauri (Rust Backend) |
| **Web Server** | Nginx (Static Binary) |
| **PHP Runner** | PHP-FPM (Native Binaries) |
| **Networking** | Systemd-resolved / Dnsmasq integration |

## 🚀 Getting Started

### Prerequisites

- Ubuntu 22.04+ / Fedora / Arch Linux
- `systemd` (Recommended)
- **Node.js**: v20+ (Recommended to use `nvm`)
- **Bun**: v1.0+

### Installation

ในอนาคตคุณสามารถดาวน์โหลด .AppImage หรือติดตั้งผ่าน .deb ได้ที่หน้า Release:

```bash
# Example for Debian/Ubuntu
sudo dpkg -i lekstack_0.1.0_amd64.deb
```


### Development

To run the project locally:

```bash
# 1. Setup Node environment
nvm install
nvm use

# 2. Install dependencies & Run
bun install
bun dev
```

## 🏗 Roadmap

- [ ] **Phase 1**: Core Service Management (Nginx + PHP-FPM)
- [ ] **Phase 2**: Version Management (Multi-PHP & Node.js & Bun Selector)
- [ ] **Phase 3**: Automated DNS (.test domain support)
- [ ] **Phase 4**: GUI for PHP Extensions Management
- [ ] **Phase 5**: One-click DB Creation (MariaDB/PostgreSQL)
- [ ] **Phase 6**: Site Isolation (Different PHP/Node versions per site)
- [ ] **Phase 7**: Self-hosted Deployment Tools (SSH & Provisioning)

## 🤝 Contributing

ในฐานะโปรเจกต์ Open Source เรายินดีรับการสนับสนุนจาก Developer ทุกคน!

1. Fork โปรเจกต์นี้
2. สร้าง Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit การเปลี่ยนแปลง (`git commit -m 'Add some AmazingFeature'`)
4. Push ไปยัง Branch (`git push origin feature/AmazingFeature`)
5. เปิด Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Developed with ❤️ by [Taweechai Yuenyang](https://github.com/yuen30)
