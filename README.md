# 🚀 Lekstack: The Native PHP Development Suite for Linux

Lekstack คือเครื่องมือจำลองสภาพแวดล้อมการพัฒนา (Local Development Environment) ระดับ Lightweight ที่ออกแบบมาเพื่อชาว Linux โดยเฉพาะ โดยได้รับแรงบันดาลใจจากความง่ายของ Laravel Herd แต่รันแบบ Native บน Linux Distros

> "Fast. Native. Zero-Config." — ลืมความยุ่งยากของ Docker และความหนักของ XAMPP ไปได้เลย

## ✨ Key Features

- **⚡ Lightning Fast**: พัฒนาด้วย Tauri + Rust ทำให้เปิดแอปได้ทันทีและกินทรัพยากรน้อยมาก (Tiny footprint)
- **🔌 Zero Config**: ติดตั้งปุ๊บ พร้อมรันไฟล์ .php ผ่านโดเมน .test ได้ทันทีไม่ต้องตั้งค่าไฟล์ hosts เอง
- **🔄 Multi-PHP Versions**: สลับเวอร์ชัน PHP (8.1, 8.2, 8.3, 8.4) ได้ในคลิกเดียวแยกตามรายโปรเจกต์
- **🛠 Integrated Stack**: มาพร้อม Nginx (Optimized for Linux), PHP-FPM และรองรับการจัดการ MariaDB/Redis
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
sudo dpkg -i prow_0.1.0_amd64.deb
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
- [ ] **Phase 2**: Automated DNS (.test domain support)
- [ ] **Phase 3**: GUI for PHP Extensions Management
- [ ] **Phase 4**: One-click DB Creation (MariaDB/PostgreSQL)
- [ ] **Phase 5**: Site Isolation (Different PHP versions per site)

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

Developed with ❤️ by [Your Name/GitHub Handle]
