#!/usr/bin/env python3
"""
Membangun SINILAI-v1.0-android.apk tanpa Gradle.

Alur: vite (hash router, jalur relatif) -> javac -> d8 -> aapt2 compile
      -> aapt2 link -> sisipkan classes.dex -> zipalign -> apksigner.

Sumber web: bundel aplikasi hasil build VITE_ROUTER=hash (lihat README.md),
default di /tmp/nilai-apk-web. Override dengan variabel SINILAI_WEB.

Pemakaian:  python3 build_apk.py
Variabel lingkungan opsional:
  TOOLCHAIN_EMAS  akar perkakas build (default ~/.accio/toolchain)
  SINILAI_WEB     folder bundel web yang akan dibungkus
"""

import os
import shutil
import subprocess
import sys
import zipfile

AKAR = os.path.dirname(os.path.abspath(__file__))
PROYEK = os.path.dirname(AKAR)

NAMA_APK = "SINILAI-v1.8-android.apk"
KUNCI = os.path.join(AKAR, "sinilai-release.keystore")
SANDI = "sinilaiapp2026"
ALIAS = "sinilai"

MANIFEST = os.path.join(AKAR, "AndroidManifest.xml")
RES = os.path.join(AKAR, "app", "src", "main", "res")
ASSETS = os.path.join(AKAR, "app", "src", "main", "assets")
JAVA = os.path.join(AKAR, "app", "src", "main", "java")
BUILD = os.path.join(AKAR, "build")

WEB_SUMBER = os.environ.get(
    "SINILAI_WEB",
    "/tmp/nilai-apk-web" if os.path.isdir("/tmp/nilai-apk-web")
    else os.path.join(AKAR, "dist-web"),
)

MIN_SDK, TARGET_SDK, KODE_VERSI, NAMA_VERSI = "21", "34", "9", "1.8"

AKAR_ALAT = os.environ.get("TOOLCHAIN_EMAS",
                           os.path.expanduser("~/.accio/toolchain"))


def cari_jdk():
    if os.environ.get("JAVA_HOME"):
        return os.environ["JAVA_HOME"]
    for akar in (AKAR_ALAT, os.path.expanduser("~/.presensi-build")):
        if not os.path.isdir(akar):
            continue
        for nama in sorted(os.listdir(akar)):
            if nama.startswith("jdk-17"):
                return os.path.join(akar, nama)
    sys.exit("JDK tidak ditemukan — pasang JDK 17 atau set JAVA_HOME")


def cari_sdk():
    if os.environ.get("ANDROID_SDK"):
        return os.environ["ANDROID_SDK"]
    for akar in (os.path.join(AKAR_ALAT, "sdk"),
                 os.path.expanduser("~/.presensi-build/sdk")):
        if os.path.isdir(os.path.join(akar, "build-tools")):
            return akar
    sys.exit("Android SDK tidak ditemukan — pasang build-tools 34.0.0")


JDK = cari_jdk()
SDK = cari_sdk()
BT = os.path.join(SDK, "build-tools", "34.0.0")
JAR_ANDROID = os.path.join(SDK, "platforms", "android-34", "android.jar")

for alat in ("aapt2", "d8", "apksigner", "zipalign"):
    if not os.path.exists(os.path.join(BT, alat)):
        sys.exit("Alat tidak ditemukan: " + os.path.join(BT, alat))

ENV = dict(os.environ, JAVA_HOME=JDK,
           PATH=JDK + "/bin:" + os.environ.get("PATH", ""))


def jalan(perintah, judul, wajib=True, cwd=None):
    print("\n== " + judul)
    print("   $ " + " ".join(os.path.basename(c) if "/" in c else c
                             for c in perintah))
    hasil = subprocess.run(perintah, cwd=cwd or AKAR, env=ENV,
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    keluaran = hasil.stdout.decode("utf-8", "replace").strip()
    if keluaran:
        for baris in keluaran.splitlines()[-14:]:
            print("   | " + baris)
    if hasil.returncode != 0:
        if wajib:
            sys.exit("   GAGAL pada tahap: " + judul)
        print("   (dilewati, bukan galat fatal)")
    return hasil.returncode


def salin_web():
    """Menyalin bundel web ke assets agar ikut masuk ke dalam APK."""
    print("\n== Menyalin aplikasi web ke assets/web")
    tujuan = os.path.join(ASSETS, "web")
    if os.path.isdir(tujuan):
        shutil.rmtree(tujuan)
    if not os.path.isdir(WEB_SUMBER):
        sys.exit("Folder aplikasi web tidak ditemukan: " + WEB_SUMBER)
    berkas_index = os.path.join(WEB_SUMBER, "index.html")
    if not os.path.isfile(berkas_index):
        sys.exit("index.html tidak ada di " + WEB_SUMBER)
    with open(berkas_index, encoding="utf-8") as f:
        isi = f.read()
    # Di dalam APK halaman dimuat lewat file://, jadi setiap rujukan berkas
    # wajib relatif. Bundel harus dibangun dengan --base=./ .
    if '="/' in isi or '="./' not in isi:
        sys.exit("index.html masih memakai jalur absolut — bangun ulang dengan "
                 "vite build --base=./ (lihat README.md)")
    shutil.copytree(WEB_SUMBER, tujuan)
    jumlah = sum(len(f) for _, _, f in os.walk(tujuan))
    print("   %d berkas disalin dari %s" % (jumlah, WEB_SUMBER))


def bersihkan():
    if os.path.isdir(BUILD):
        shutil.rmtree(BUILD)
    for sub in ("classes", "dex", "gen"):
        os.makedirs(os.path.join(BUILD, sub), exist_ok=True)


def utama():
    bersihkan()
    salin_web()
    print("\nSINILAI v1.0 — build APK")
    print("  JDK    : " + JDK)
    print("  SDK    : " + SDK)
    print("  Output : " + os.path.join(PROYEK, NAMA_APK))

    # 1. Kompilasi Java
    berkas_java = []
    for akar, _, berkas in os.walk(JAVA):
        for f in berkas:
            if f.endswith(".java"):
                berkas_java.append(os.path.join(akar, f))
    if not berkas_java:
        sys.exit("Tidak ada berkas .java")

    perintah_javac = [os.path.join(JDK, "bin", "javac"),
                      "-source", "8", "-target", "8",
                      "-encoding", "UTF-8", "-nowarn",
                      "-bootclasspath", JAR_ANDROID,
                      "-d", os.path.join(BUILD, "classes")] + berkas_java
    if jalan(perintah_javac, "Kompilasi Java (javac)", wajib=False) != 0:
        perintah_javac = [os.path.join(JDK, "bin", "javac"),
                          "-source", "8", "-target", "8",
                          "-encoding", "UTF-8", "-nowarn",
                          "-classpath", JAR_ANDROID,
                          "-d", os.path.join(BUILD, "classes")] + berkas_java
        jalan(perintah_javac, "Kompilasi Java (javac, kelas path biasa)")

    kelas = []
    for akar, _, berkas in os.walk(os.path.join(BUILD, "classes")):
        for f in berkas:
            if f.endswith(".class"):
                kelas.append(os.path.join(akar, f))
    print("   kelas terkompilasi: " + str(len(kelas)))

    # 2. dex
    jalan([os.path.join(BT, "d8"), "--release", "--min-api", MIN_SDK,
           "--lib", JAR_ANDROID, "--output", os.path.join(BUILD, "dex")] + kelas,
          "Konversi ke Dalvik bytecode (d8)")
    dex_utama = os.path.join(BUILD, "dex", "classes.dex")
    if not os.path.exists(dex_utama):
        sys.exit("classes.dex tidak terbentuk")

    # 3. Sumber daya
    jalan([os.path.join(BT, "aapt2"), "compile", "--dir", RES,
           "-o", os.path.join(BUILD, "res.zip")],
          "Kompilasi sumber daya (aapt2 compile)")

    # 4. Tautkan APK dasar
    jalan([os.path.join(BT, "aapt2"), "link",
           "-o", os.path.join(BUILD, "base.apk"),
           "-I", JAR_ANDROID,
           "--manifest", MANIFEST,
           os.path.join(BUILD, "res.zip"),
           "-A", ASSETS,
           "--min-sdk-version", MIN_SDK,
           "--target-sdk-version", TARGET_SDK,
           "--version-code", KODE_VERSI,
           "--version-name", NAMA_VERSI,
           "--no-version-vectors"],
          "Menyusun APK dasar (aapt2 link)")

    # 5. Sisipkan classes.dex
    print("\n== Menyisipkan classes.dex dan memeriksa isi")
    isi_apk = os.path.join(BUILD, "base.apk")
    with zipfile.ZipFile(isi_apk, "a", zipfile.ZIP_STORED) as z:
        z.write(dex_utama, "classes.dex")
    with zipfile.ZipFile(isi_apk) as z:
        rusak = z.testzip()
        nama = z.namelist()
        print("   entri APK      : " + str(len(nama)))
        print("   CRC            : " + ("OK" if rusak is None else "RUSAK di " + str(rusak)))
        for wajib in ("AndroidManifest.xml", "classes.dex", "resources.arsc"):
            print("   " + wajib.ljust(24) + ": " + ("ada" if wajib in nama else "HILANG"))
        web = [n for n in nama if n.startswith("assets/web/")]
        print("   berkas web     : " + str(len(web)))
        ikon = [n for n in nama if "ic_launcher" in n]
        print("   ikon launcher  : " + str(len(ikon)))
        if "classes.dex" not in nama or len(web) < 8:
            sys.exit("Isi APK tidak lengkap")

    # 6. zipalign
    jalan([os.path.join(BT, "zipalign"), "-p", "-f", "4", isi_apk,
           os.path.join(BUILD, "aligned.apk")],
          "Menyelaraskan APK (zipalign)")

    # 7. Keystore
    if not os.path.exists(KUNCI):
        jalan([os.path.join(JDK, "bin", "keytool"), "-genkeypair",
               "-keystore", KUNCI, "-alias", ALIAS,
               "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000",
               "-storepass", SANDI, "-keypass", SANDI,
               "-dname", "CN=SINILAI, OU=Penilaian Siswa, "
                         "O=SINILAI, L=Jakarta, C=ID"],
              "Membuat keystore penandatangan")
    else:
        print("\n== Keystore sudah ada, dipakai ulang")

    # 8. Tanda tangani
    keluaran = os.path.join(PROYEK, NAMA_APK)
    if os.path.exists(keluaran):
        os.remove(keluaran)
    jalan([os.path.join(BT, "apksigner"), "sign",
           "--ks", KUNCI, "--ks-key-alias", ALIAS,
           "--ks-pass", "pass:" + SANDI, "--key-pass", "pass:" + SANDI,
           "--v1-signing-enabled", "true", "--v2-signing-enabled", "true",
           "--out", keluaran, os.path.join(BUILD, "aligned.apk")],
          "Menandatangani APK (apksigner)")

    # 9. Verifikasi
    jalan([os.path.join(BT, "apksigner"), "verify", "--verbose", "--print-certs",
           keluaran], "Verifikasi tanda tangan")
    jalan([os.path.join(BT, "aapt2"), "dump", "badging", keluaran],
          "Memeriksa metadata paket")

    ukuran = os.path.getsize(keluaran)
    print("\n" + "=" * 60)
    print("APK SIAP: " + keluaran)
    print("Ukuran  : " + str(round(ukuran / 1024.0, 1)) + " KB")
    print("=" * 60)


if __name__ == "__main__":
    utama()
