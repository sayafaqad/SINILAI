package com.sinilai.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;

/**
 * SINILAI — pembungkus Android.
 *
 * Seluruh aplikasi (HTML, CSS, JS, ikon) ada di dalam assets/web sehingga
 * berjalan penuh tanpa internet. Tidak ada satu pun izin yang diminta:
 * - impor Excel memakai pemilih berkas bawaan Android,
 * - ekspor dikirim lewat lembar berbagi (share sheet) dari folder cache.
 */
public class MainActivity extends Activity {

    private static final String BERANDA = "file:///android_asset/web/index.html";

    /** Warna latar aplikasi (#F4F6FA) — dipakai sebelum halaman selesai dimuat. */
    private static final int LATAR = 0xFFF4F6FA;

    private static final int KODE_PILIH_BERKAS = 1001;

    private WebView web;
    private ValueCallback<Uri[]> pilihBerkas;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle simpanan) {
        super.onCreate(simpanan);

        web = new WebView(this);
        web.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        web.setBackgroundColor(LATAR);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);        // penyimpanan data siswa di perangkat
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        // Aplikasi web terpasang dikemas sebagai modul ES, dan modul ES dari
        // file:// diblokir kecuali akses berkas antarb berkas diizinkan. Hanya
        // berkas milik aplikasi ini sendiri yang dibaca — tidak ada jaringan.
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        // Ukuran huruf dikunci agar tabel nilai dan rekap tetap rapi walau
        // pengaturan huruf sistem perangkat diperbesar.
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(true);

        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);

        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView tampilan, ValueCallback<Uri[]> lanjut,
                                             FileChooserParams parameter) {
                if (pilihBerkas != null) {
                    pilihBerkas.onReceiveValue(null);
                }
                pilihBerkas = lanjut;
                try {
                    Intent maksud = new Intent(Intent.ACTION_GET_CONTENT);
                    maksud.addCategory(Intent.CATEGORY_OPENABLE);
                    maksud.setType("*/*");
                    String[] jenis = jenisMime(parameter);
                    if (jenis != null) {
                        maksud.putExtra(Intent.EXTRA_MIME_TYPES, jenis);
                    }
                    startActivityForResult(Intent.createChooser(maksud, "Pilih berkas"),
                            KODE_PILIH_BERKAS);
                    return true;
                } catch (ActivityNotFoundException e) {
                    pilihBerkas = null;
                    pesan("Tidak ada aplikasi pemilih berkas di perangkat ini.");
                    return false;
                }
            }
        });

        // Jembatan ekspor: berkas dari aplikasi web disimpan ke folder cache
        // lalu ditawarkan lewat lembar berbagi Android.
        web.addJavascriptInterface(new JembatanSimpan(), "AndroidSimpan");
        // Penanda bahwa aplikasi sedang berjalan di dalam pembungkus Android.
        web.addJavascriptInterface(new JembatanAplikasi(), "AndroidAplikasi");
        // Jembatan cetak: WebView tidak mendukung window.print(), jadi cetak
        // dijalankan lewat kerangka cetak Android (printer atau Simpan PDF).
        web.addJavascriptInterface(new JembatanCetak(), "AndroidCetak");

        if (simpanan != null) {
            web.restoreState(simpanan);
        } else {
            web.loadUrl(BERANDA);
        }

        setContentView(web);
    }

    private void pesan(String teks) {
        Toast.makeText(this, teks, Toast.LENGTH_LONG).show();
    }

    /**
     * Cetak lewat kerangka cetak Android. Halaman web yang sedang tampil
     * dirender memakai gaya cetak aplikasi (menu, tombol, dan saringan
     * disembunyikan), lalu pengguna dapat memilih printer atau menyimpan
     * sebagai PDF. Tidak memerlukan izin apa pun.
     */
    private void cetakHalaman(String judul) {
        try {
            PrintManager pengelola = (PrintManager) getSystemService(Context.PRINT_SERVICE);
            if (pengelola == null) {
                pesan("Layanan cetak tidak tersedia di perangkat ini.");
                return;
            }
            String nama = (judul == null || judul.trim().isEmpty()) ? "SINILAI" : judul.trim();
            PrintDocumentAdapter pencetak = web.createPrintDocumentAdapter(nama);
            PrintAttributes aturan = new PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                    .setMinMargins(new PrintAttributes.Margins(1000, 1000, 1000, 1000))
                    .build();
            pengelola.print(nama, pencetak, aturan);
        } catch (Throwable galat) {
            pesan("Gagal membuka cetak: " + galat.getMessage());
        }
    }

    /** Jembatan cetak yang dipanggil halaman rekap/laporan. */
    private class JembatanCetak {
        @JavascriptInterface
        public void cetak(final String judul) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    cetakHalaman(judul);
                }
            });
        }
    }

    /**
     * Terjemahkan jenis berkas yang diminta halaman web menjadi daftar MIME.
     * Halaman SINILAI meminta ekstensi (.xlsx, .csv, .json), sedangkan pemilih
     * berkas Android bekerja dengan MIME; bila ada ekstensi yang tidak dikenal,
     * kembalikan null supaya semua berkas bisa dipilih.
     */
    private static String[] jenisMime(WebChromeClient.FileChooserParams parameter) {
        String[] diminta = parameter != null ? parameter.getAcceptTypes() : null;
        if (diminta == null || diminta.length == 0) return null;
        java.util.List<String> hasil = new java.util.ArrayList<String>();
        for (String jenis : diminta) {
            if (jenis == null || jenis.trim().isEmpty()) continue;
            String nilai = jenis.trim().toLowerCase();
            if (nilai.startsWith(".") || !nilai.contains("/")) {
                String akhiran = nilai.startsWith(".") ? nilai : "." + nilai;
                if (akhiran.equals(".xlsx")) {
                    hasil.add("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                } else if (akhiran.equals(".xls")) {
                    hasil.add("application/vnd.ms-excel");
                } else if (akhiran.equals(".csv")) {
                    hasil.add("text/csv");
                    hasil.add("text/comma-separated-values");
                } else if (akhiran.equals(".json")) {
                    hasil.add("application/json");
                } else {
                    return null;   // ekstensi tidak dikenal: izinkan semua berkas
                }
            } else {
                hasil.add(nilai);
            }
        }
        return hasil.isEmpty() ? null : hasil.toArray(new String[0]);
    }

    private static String jenisUntuk(String nama) {
        String rendah = nama == null ? "" : nama.toLowerCase();
        if (rendah.endsWith(".xlsx")) {
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        }
        if (rendah.endsWith(".json")) return "application/json";
        if (rendah.endsWith(".csv")) return "text/csv";
        return "application/octet-stream";
    }

    /** Simpan berkas ekspor ke cache aplikasi, lalu buka lembar berbagi. */
    private class JembatanSimpan {
        @JavascriptInterface
        public void simpanDanBagikan(String nama, String isiBase64) {
            final String namaAman = (nama == null || nama.trim().isEmpty())
                    ? "sinilai-berkas" : nama.replaceAll("[\\\\/:*?\"<>|]", "-");
            try {
                byte[] isi = Base64.decode(isiBase64, Base64.DEFAULT);
                File berkas = new File(getCacheDir(), namaAman);
                FileOutputStream keluaran = new FileOutputStream(berkas);
                keluaran.write(isi);
                keluaran.close();

                final Uri uri = BerkasProvider.uriUntuk(namaAman);
                final String jenis = jenisUntuk(namaAman);
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            Intent kirim = new Intent(Intent.ACTION_SEND);
                            kirim.setType(jenis);
                            kirim.putExtra(Intent.EXTRA_STREAM, uri);
                            kirim.putExtra(Intent.EXTRA_SUBJECT, namaAman);
                            kirim.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            startActivity(Intent.createChooser(kirim, "Simpan atau kirim berkas"));
                        } catch (ActivityNotFoundException e) {
                            pesan("Berkas tersimpan di " + namaAman
                                    + ", tetapi tidak ada aplikasi untuk membukanya.");
                        }
                    }
                });
            } catch (Exception e) {
                final String galat = e.getMessage() == null ? e.toString() : e.getMessage();
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        pesan("Gagal menyiapkan berkas: " + galat);
                    }
                });
            }
        }
    }

    /** Penanda platform untuk aplikasi web. */
    private class JembatanAplikasi {
        @JavascriptInterface
        public String platform() {
            return "android";
        }

        @JavascriptInterface
        public String versi() {
            return "1.0";
        }
    }

    @Override
    protected void onActivityResult(int permintaan, int hasil, Intent data) {
        if (permintaan == KODE_PILIH_BERKAS) {
            if (pilihBerkas == null) return;
            Uri[] dipilih = null;
            if (hasil == RESULT_OK && data != null) {
                if (data.getDataString() != null) {
                    dipilih = new Uri[]{Uri.parse(data.getDataString())};
                } else if (data.getClipData() != null) {
                    int jumlah = data.getClipData().getItemCount();
                    dipilih = new Uri[jumlah];
                    for (int i = 0; i < jumlah; i++) {
                        dipilih[i] = data.getClipData().getItemAt(i).getUri();
                    }
                }
            }
            pilihBerkas.onReceiveValue(dipilih);
            pilihBerkas = null;
            return;
        }
        super.onActivityResult(permintaan, hasil, data);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle keluar) {
        super.onSaveInstanceState(keluar);
        if (web != null) web.saveState(keluar);
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.setWebViewClient(new WebViewClient());
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
