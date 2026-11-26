package com.sinilai.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import java.io.File;
import java.io.FileNotFoundException;

/**
 * Penyedia berkas ringan untuk menyerahkan berkas hasil ekspor di folder cache
 * aplikasi kepada aplikasi lain (Excel, penyimpanan, email, WhatsApp) melalui
 * content:// URI.
 *
 * Diperlukan karena sejak Android 7 (API 24) mengirim file:// URI ke aplikasi
 * lain memicu FileUriExposedException. Dengan penyedia ini, ekspor berjalan
 * tanpa izin penyimpanan sama sekali dan tanpa pustaka AndroidX.
 */
public class BerkasProvider extends ContentProvider {

    public static final String OTORITAS = "com.sinilai.app.berkas";

    /** URI untuk berkas bernama tertentu di folder cache aplikasi. */
    public static Uri uriUntuk(String nama) {
        return Uri.parse("content://" + OTORITAS + "/" + nama);
    }

    /** Berkas nyata di balik sebuah URI dari penyedia ini. */
    public static File berkasUntuk(Context konteks, Uri uri) {
        if (uri == null || uri.getLastPathSegment() == null) return null;
        return new File(konteks.getCacheDir(), uri.getLastPathSegment());
    }

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        Context konteks = getContext();
        if (konteks == null) throw new FileNotFoundException("konteks tidak tersedia");
        File berkas = berkasUntuk(konteks, uri);
        if (berkas == null) throw new FileNotFoundException("URI tidak sah: " + uri);
        int bendera = ParcelFileDescriptor.MODE_CREATE | ParcelFileDescriptor.MODE_READ_WRITE;
        return ParcelFileDescriptor.open(berkas, bendera);
    }

    @Override
    public String getType(Uri uri) {
        String nama = uri == null ? "" : String.valueOf(uri.getLastPathSegment()).toLowerCase();
        if (nama.endsWith(".xlsx")) {
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        }
        if (nama.endsWith(".json")) return "application/json";
        if (nama.endsWith(".csv")) return "text/csv";
        return "application/octet-stream";
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection,
                        String[] selectionArgs, String sortOrder) {
        return null;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }
}
