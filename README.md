# LMS SPA starter — skema sesuai permintaan

Sheets: `users`, `master_kelas_jurusan`, `materi`, `soal`, `jawaban_siswa`, `sessions`.

1. Buat Google Spreadsheet, salin ID ke `SPREADSHEET_ID`.
2. Apps Script: tempel Code.gs, jalankan `setupSheets()`.
3. Deploy sebagai Web App.
4. Starter frontend `index.html` sebelumnya masih demo/localStorage; sambungan frontend ke backend ini perlu diimplementasikan dan diuji sebelum penggunaan real.

**Peringatan:** starter backend login masih menggunakan kolom password sederhana (plaintext) sebagai kompatibilitas skema awal dan belum cocok untuk produksi. Implementasikan hash password, kontrol akses lebih ketat, perlindungan endpoint, dan keamanan session sebelum data nyata digunakan. Endpoint Apps Script langsung juga dapat menghadapi masalah CORS/redirect; pertimbangkan Vercel API proxy.
