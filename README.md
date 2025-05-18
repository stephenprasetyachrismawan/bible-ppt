# Bible PPT Generator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Bible PPT Generator adalah aplikasi web yang memungkinkan Anda membuat presentasi PowerPoint dari ayat-ayat Alkitab dengan mudah dan cepat. Dibangun menggunakan Next.js, aplikasi ini menyediakan antarmuka yang intuitif untuk membuat presentasi yang menarik dari firman Tuhan.

## 🌟 Fitur Utama

- **Pencarian Ayat Cepat**: Cari ayat Alkitab dengan mudah menggunakan fitur pencarian yang responsif
- **Multiple Versions**: Dukungan untuk berbagai versi Alkitab (KJV, NIV, TB, dll)
- **Template Presentasi**: Berbagai template menarik yang dapat disesuaikan
- **Export PPT**: Ekspor presentasi langsung ke format PowerPoint (.pptx)
- **Custom Styling**: Kustomisasi tampilan slide sesuai kebutuhan
- **Responsive Design**: Antarmuka yang responsif untuk berbagai ukuran layar
- **Ekstraksi Ayat dari Gambar**: Fitur ekstraksi ayat menggunakan Google Gemini API

## 🚀 Memulai

1. Clone repository ini:
```bash
git clone https://github.com/yourusername/bible-ppt.git
```

2. Install dependencies:
```bash
npm install
# atau
yarn install
```

3. Buat file `.env.local` di root project dan tambahkan variabel lingkungan berikut:
```
# Google Gemini API Key untuk fitur ekstraksi ayat dari gambar
NEXT_PUBLIC_GEMINI_API_KEY=YOUR_GEMINI_API_KEY

# Firebase Configuration (Client side)
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

4. Jalankan server development:
```bash
npm run dev
# atau
yarn dev
```

5. Buka [http://localhost:3000](http://localhost:3000) di browser Anda

## 💡 Cara Penggunaan

1. **Membuat Presentasi Baru**
   - Klik tombol "New Presentation"
   - Pilih template yang diinginkan
   - Masukkan judul presentasi

2. **Menambahkan Ayat**
   - Gunakan fitur pencarian untuk menemukan ayat
   - Pilih versi Alkitab yang diinginkan
   - Klik "Add to Presentation"

3. **Kustomisasi Slide**
   - Atur tata letak slide
   - Pilih tema warna
   - Tambahkan gambar atau ilustrasi

4. **Export Presentasi**
   - Klik tombol "Export"
   - Pilih format PowerPoint
   - Download file presentasi

## 🔜 Fitur yang Akan Datang

- [ ] Integrasi dengan API Alkitab tambahan
- [ ] Fitur kolaborasi real-time
- [ ] Template animasi
- [ ] Dukungan untuk berbagai bahasa
- [ ] Fitur sharing presentasi
- [ ] Mode offline
- [ ] Integrasi dengan Google Drive/Dropbox
- [ ] Fitur pencetakan langsung

## 🛠️ Teknologi yang Digunakan

- Next.js 14
- React
- TypeScript
- Tailwind CSS
- PPTXGenJS
- Bible API

## 🤝 Kontribusi

Kami sangat menghargai kontribusi dari komunitas! Jika Anda ingin berkontribusi:

1. Fork repository ini
2. Buat branch fitur baru (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan Anda (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buka Pull Request

## 📝 Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT - lihat file [LICENSE](LICENSE) untuk detail lebih lanjut.

## 📞 Kontak

Jika Anda memiliki pertanyaan atau saran, silakan buka issue di repository ini atau hubungi kami melalui email di [your-email@example.com](mailto:your-email@example.com).
