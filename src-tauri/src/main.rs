// ป้องกันการเปิดหน้าต่าง Console ขึ้นมาตอนรันบน Windows ในโหมด Release (ห้ามลบ!)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // เรียกใช้ฟังก์ชัน run() จากไลบรารี lekstack_lib เพื่อเริ่มต้นโปรแกรม
    lekstack_lib::run()
}
