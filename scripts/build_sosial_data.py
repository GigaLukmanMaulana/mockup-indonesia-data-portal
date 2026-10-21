"""
Build Sosial Data (Pendidikan & Kesehatan) untuk 514 Kabupaten/Kota BPS
Memproses:
1. data-mentah/xlsx/pendidikan/Data_Sekolah_Indonesia_Master.xlsx (491.064 sekolah)
2. data-mentah/xlsx/pendidikan/Perguruan Tinggi-20261012T062538Z-1-001/Perguruan Tinggi/pddikti_final_lengkap.xlsx (6.765 kampus)
3. data-mentah/xlsx/kesehatan/Puskesmas-20261012T062554Z-1-001/Puskesmas/puskesmas.xlsx (6.117 puskesmas)
4. data-mentah/xlsx/kesehatan/Rumah Sakit-20261012T062528Z-1-001/Rumah Sakit/data_rumah_sakit_kemenkes_complete.xlsx (1.000 RS)

Output:
- sosial-data.json
- sosial-data.js
"""

import openpyxl
import json
import re
import os
import time

base_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(base_dir, '..'))
data_json_path = os.path.join(root_dir, 'data', 'json', 'data.json')
output_json_path = os.path.join(root_dir, 'data', 'json', 'sosial-data.json')
output_js_path = os.path.join(root_dir, 'assets', 'js', 'data', 'sosial-data.js')

def normalize_str(s):
    if not s:
        return ""
    s = str(s).lower()
    s = re.sub(r'^(kabupaten|kab\.|kota|provinsi|prov\.)\s*', '', s)
    s = s.replace('kab.', '').replace('kota', '').replace('kabupaten', '')
    s = re.sub(r'[^a-z0-9]', '', s)
    return s

ALIASES = {
    'tobasamosir': 'toba',
    'pangkajenekepulauan': 'pangkajenedankepulauan',
    'pangkep': 'pangkajenedankepulauan',
    'pangkajene': 'pangkajenedankepulauan',
    'admkepseribu': 'kepulauanseribu',
    'kepseribu': 'kepulauanseribu',
    'marowali': 'morowali',
    'pasir': 'paser',
    'yapenwaropen': 'kepulauanyapen',
    'kepulauansitaro': 'kepulauansiautagulandangbiaro',
    'sitaro': 'kepulauansiautagulandangbiaro',
    'mamujuutara': 'pasangkayu',
    'tanjungjabungb': 'tanjungjabungbarat',
    'tanjungjabungt': 'tanjungjabungtimur',
    'kepulauantanimbar': 'malukutenggarabarat',
    'tanimbar': 'malukutenggarabarat',
    'fakfak': 'fakfak',
    'batubara': 'batubara',
    'tulangan': 'tulungagung',
    'kotaadmj Jakartaselatan': 'jakartaselatan',
    'kotaadmjakartaselatan': 'jakartaselatan',
    'kotaadmjakartatimur': 'jakartatimur',
    'kotaadmjakartapusat': 'jakartapusat',
    'kotaadmjakartabarat': 'jakartabarat',
    'kotaadmjakartautara': 'jakartautara',
    'jakartaselatan': 'jakartaselatan',
    'jakartatimur': 'jakartatimur',
    'jakartapusat': 'jakartapusat',
    'jakartabarat': 'jakartabarat',
    'jakartautara': 'jakartautara'
}

def load_regions():
    with open(data_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    reg_by_id = {}
    kota_prov_kab = {}
    kab_prov_kab = {}
    kota_kab = {}
    kab_kab = {}
    
    for r in data:
        rid = str(r['id'])
        reg_by_id[rid] = {
            'id': r['id'],
            'kabkota': r['kabkota'],
            'provinsi': r['prov'],
            'penduduk': r.get('penduduk', 0),
            'has_data': True,
            'ringkasan': {
                'total_sekolah': 0,
                'total_siswa': 0,
                'total_guru': 0,
                'total_kampus': 0,
                'total_faskes': 0,
                'total_puskesmas': 0,
                'total_rs': 0
            },
            'pendidikan': {
                'rekap_jenjang': {
                    'sd': {'total': 0, 'negeri': 0, 'swasta': 0, 'siswa': 0, 'guru': 0},
                    'smp': {'total': 0, 'negeri': 0, 'swasta': 0, 'siswa': 0, 'guru': 0},
                    'sma': {'total': 0, 'negeri': 0, 'swasta': 0, 'siswa': 0, 'guru': 0},
                    'smk': {'total': 0, 'negeri': 0, 'swasta': 0, 'siswa': 0, 'guru': 0},
                    'madrasah': {'total': 0, 'mi': 0, 'mts': 0, 'ma': 0, 'siswa': 0, 'guru': 0},
                    'paud_tk': {'total': 0, 'negeri': 0, 'swasta': 0, 'siswa': 0, 'guru': 0},
                    'slb': {'total': 0, 'negeri': 0, 'swasta': 0, 'siswa': 0, 'guru': 0},
                    'dikmas': {'total': 0, 'pkbm': 0, 'skb': 0, 'lainnya': 0}
                },
                'akreditasi': {'a': 0, 'b': 0, 'c': 0, 'belum': 0},
                'daftar_kampus': []
            },
            'kesehatan': {
                'puskesmas': [],
                'rumah_sakit': []
            }
        }
        
        is_kota = r['kabkota'].upper().strip().startswith('KOTA')
        norm_kab = normalize_str(r['kabkota'])
        norm_prov = normalize_str(r['prov'])
        
        if is_kota:
            kota_prov_kab[(norm_prov, norm_kab)] = rid
            if norm_kab not in kota_kab:
                kota_kab[norm_kab] = rid
        else:
            kab_prov_kab[(norm_prov, norm_kab)] = rid
            if norm_kab not in kab_kab:
                kab_kab[norm_kab] = rid

    return reg_by_id, kota_prov_kab, kab_prov_kab, kota_kab, kab_kab

def match_region(prov_raw, kab_raw, kota_prov_kab, kab_prov_kab, kota_kab, kab_kab, is_kota_hint=None):
    if not kab_raw:
        return None
        
    s_kab = str(kab_raw).strip()
    if is_kota_hint is None:
        is_kota = bool(re.match(r'^\s*kota\b', s_kab.lower()))
    else:
        is_kota = is_kota_hint
        
    n_prov = normalize_str(prov_raw)
    n_kab = normalize_str(s_kab)
    n_kab = ALIASES.get(n_kab, n_kab)
    
    primary_prov_kab = kota_prov_kab if is_kota else kab_prov_kab
    primary_kab = kota_kab if is_kota else kab_kab
    sec_prov_kab = kab_prov_kab if is_kota else kota_prov_kab
    sec_kab = kab_kab if is_kota else kota_kab
    
    # 1. Exact match (prov, kab)
    if n_prov and (n_prov, n_kab) in primary_prov_kab:
        return primary_prov_kab[(n_prov, n_kab)]
        
    # 2. Exact match kab only
    if n_kab in primary_kab:
        return primary_kab[n_kab]
        
    # 3. Fallback to secondary
    if n_prov and (n_prov, n_kab) in sec_prov_kab:
        return sec_prov_kab[(n_prov, n_kab)]
    if n_kab in sec_kab:
        return sec_kab[n_kab]
        
    # 4. Suffix / prefix match
    for (p, k), rid in primary_prov_kab.items():
        if (not n_prov or p == n_prov) and len(n_kab) > 3 and (k.endswith(n_kab) or n_kab.endswith(k)):
            return rid
    for (p, k), rid in sec_prov_kab.items():
        if (not n_prov or p == n_prov) and len(n_kab) > 3 and (k.endswith(n_kab) or n_kab.endswith(k)):
            return rid
            
    return None

def process_sekolah(reg_by_id, kota_prov_kab, kab_prov_kab, kota_kab, kab_kab):
    fpath = r'data-mentah\xlsx\pendidikan\Data_Sekolah_Indonesia_Master.xlsx'
    if not os.path.exists(fpath):
        print("File master sekolah tidak ditemukan:", fpath)
        return

    print("Membaca master sekolah...")
    wb = openpyxl.load_workbook(fpath, read_only=True)
    sheet = wb[wb.sheetnames[0]]
    rows = sheet.iter_rows(values_only=True)
    headers = next(rows)
    
    idx_prov = headers.index('provinsi')
    idx_kab = headers.index('kabupaten')
    idx_bentuk = headers.index('bentuk_pendidikan')
    idx_status = headers.index('status_sekolah')
    idx_akred = headers.index('akreditasi')
    idx_siswa = headers.index('siswa_jml_pd')
    idx_guru_l = headers.index('guru_laki')
    idx_guru_p = headers.index('guru_perempuan')
    
    count = 0
    matched = 0
    
    for r in rows:
        count += 1
        if count % 100000 == 0:
            print(f"  Processed {count:,} sekolah...")
            
        prov = r[idx_prov]
        kab = r[idx_kab]
        is_kota = bool(re.match(r'^\s*kota\b', str(kab or '').lower()))
        rid = match_region(prov, kab, kota_prov_kab, kab_prov_kab, kota_kab, kab_kab, is_kota_hint=is_kota)
        if not rid:
            continue
            
        matched += 1
        reg = reg_by_id[rid]
        pend = reg['pendidikan']
        rekap = pend['rekap_jenjang']
        ringk = reg['ringkasan']
        
        bentuk = str(r[idx_bentuk] or '').strip().upper()
        status = str(r[idx_status] or '').strip().lower()
        is_negeri = 'negeri' in status
        
        akred = str(r[idx_akred] or '').strip().upper()
        if akred == 'A': pend['akreditasi']['a'] += 1
        elif akred == 'B': pend['akreditasi']['b'] += 1
        elif akred == 'C': pend['akreditasi']['c'] += 1
        else: pend['akreditasi']['belum'] += 1
        
        siswa = int(r[idx_siswa] or 0)
        guru_l = int(r[idx_guru_l] or 0)
        guru_p = int(r[idx_guru_p] or 0)
        guru_total = guru_l + guru_p
        
        ringk['total_sekolah'] += 1
        ringk['total_siswa'] += siswa
        ringk['total_guru'] += guru_total
        
        # Categorize bentuk
        if bentuk in ['SD', 'SDTK', 'SPK SD']:
            slot = rekap['sd']
        elif bentuk in ['SMP', 'SMPTK', 'SPK SMP']:
            slot = rekap['smp']
        elif bentuk in ['SMA', 'SMAK', 'SMAG.K', 'SPK SMA']:
            slot = rekap['sma']
        elif bentuk in ['SMK', 'SMTK']:
            slot = rekap['smk']
        elif bentuk in ['MI', 'MTS', 'MA']:
            slot = rekap['madrasah']
            if bentuk == 'MI': slot['mi'] += 1
            elif bentuk == 'MTS': slot['mts'] += 1
            elif bentuk == 'MA': slot['ma'] += 1
        elif bentuk in ['TK', 'KB', 'TPA', 'SPS', 'RA', 'PAUDQ', 'SPK TK', 'SPK KB', 'PRATAMA WIDYALAYA', 'NAVA DHAMMASEKHA']:
            slot = rekap['paud_tk']
        elif bentuk == 'SLB':
            slot = rekap['slb']
        else:
            slot = rekap['dikmas']
            if bentuk == 'PKBM': slot['pkbm'] += 1
            elif bentuk == 'SKB': slot['skb'] += 1
            else: slot['lainnya'] += 1
            
        slot['total'] += 1
        if is_negeri:
            slot['negeri'] = slot.get('negeri', 0) + 1
        else:
            slot['swasta'] = slot.get('swasta', 0) + 1
        slot['siswa'] = slot.get('siswa', 0) + siswa
        slot['guru'] = slot.get('guru', 0) + guru_total

    wb.close()
    print(f"Selesai sekolah: {matched:,}/{count:,} sekolah berhasil dipetakan ({matched/count*100:.1f}%)")

def process_kampus(reg_by_id, kota_prov_kab, kab_prov_kab, kota_kab, kab_kab):
    fpath = r'data-mentah\xlsx\pendidikan\Perguruan Tinggi-20261012T062538Z-1-001\Perguruan Tinggi\pddikti_final_lengkap.xlsx'
    if not os.path.exists(fpath):
        return
        
    print("Membaca kampus PDDIKTI...")
    wb = openpyxl.load_workbook(fpath, read_only=True)
    sheet = wb[wb.sheetnames[0]]
    rows = list(sheet.iter_rows(values_only=True))[1:]
    wb.close()
    
    count = 0
    matched = 0
    for r in rows:
        count += 1
        nama = str(r[9] or r[1] or '').strip()
        kab = r[4]
        prov = r[5]
        status = str(r[8] or '').strip()
        akred = str(r[6] or '').strip()
        
        is_kota = bool(re.match(r'^\s*kota\b', str(kab or '').lower()))
        rid = match_region(prov, kab, kota_prov_kab, kab_prov_kab, kota_kab, kab_kab, is_kota_hint=is_kota)
        if not rid:
            continue
            
        matched += 1
        reg = reg_by_id[rid]
        reg['ringkasan']['total_kampus'] += 1
        
        if len(reg['pendidikan']['daftar_kampus']) < 30:
            reg['pendidikan']['daftar_kampus'].append({
                'nama': nama,
                'status': status or 'Aktif',
                'akreditasi': akred or 'Terdata'
            })
            
    print(f"Selesai kampus: {matched:,}/{count:,} kampus dipetakan ({matched/count*100:.1f}%)")

def process_puskesmas(reg_by_id, kota_prov_kab, kab_prov_kab, kota_kab, kab_kab):
    fpath = r'data-mentah\xlsx\kesehatan\Puskesmas-20261012T062554Z-1-001\Puskesmas\puskesmas.xlsx'
    if not os.path.exists(fpath):
        return
        
    print("Membaca Puskesmas...")
    wb = openpyxl.load_workbook(fpath, read_only=True)
    sheet = wb[wb.sheetnames[0]]
    rows = list(sheet.iter_rows(values_only=True))[1:]
    wb.close()
    
    count = 0
    matched = 0
    for r in rows:
        count += 1
        nama = str(r[0] or '').strip()
        kab = r[3]
        telp = str(r[1] or '').strip()
        email = str(r[2] or '').strip()
        
        is_kota = bool(re.match(r'^\s*kota\b', str(kab or '').lower()))
        rid = match_region('', kab, kota_prov_kab, kab_prov_kab, kota_kab, kab_kab, is_kota_hint=is_kota)
        if not rid:
            continue
            
        matched += 1
        reg = reg_by_id[rid]
        reg['ringkasan']['total_puskesmas'] += 1
        reg['ringkasan']['total_faskes'] += 1
        
        if len(reg['kesehatan']['puskesmas']) < 35:
            reg['kesehatan']['puskesmas'].append({
                'nama': f"Puskesmas {nama}" if not nama.lower().startswith('puskesmas') else nama,
                'telepon': telp if telp and telp != 'None' else '-',
                'email': email if email and email != 'None' else '-'
            })
            
    print(f"Selesai puskesmas: {matched:,}/{count:,} puskesmas dipetakan ({matched/count*100:.1f}%)")

def process_rs(reg_by_id, kota_prov_kab, kab_prov_kab, kota_kab, kab_kab):
    fpath = r'data-mentah\xlsx\kesehatan\Rumah Sakit-20261012T062528Z-1-001\Rumah Sakit\data_rumah_sakit_kemenkes_complete.xlsx'
    if not os.path.exists(fpath):
        return
        
    print("Membaca Rumah Sakit Kemenkes...")
    wb = openpyxl.load_workbook(fpath, read_only=True)
    sheet = wb[wb.sheetnames[0]]
    rows = list(sheet.iter_rows(values_only=True))
    wb.close()
    
    count = 0
    matched = 0
    for r in rows:
        if not r or len(r) < 3:
            continue
        count += 1
        nama = str(r[2] if len(r) > 2 and r[2] is not None else '').strip()
        prov = str(r[4] if len(r) > 4 and r[4] is not None else '').strip()
        alamat = str(r[5] if len(r) > 5 and r[5] is not None else '').strip()
        telp = str(r[6] if len(r) > 6 and r[6] is not None else '').strip()
        email = str(r[7] if len(r) > 7 and r[7] is not None else '').strip()
        web = str(r[8] if len(r) > 8 and r[8] is not None else '').strip()
        
        # Ekstrak kota/kabupaten target dari alamat/nama
        matched_rid = None
        n_prov = normalize_str(prov)
        text_full = f"{nama} {alamat}".lower()
        
        # Cek kota dulu lalu kab
        for (p, k), rid in kota_prov_kab.items():
            if (not n_prov or p == n_prov) and (k in normalize_str(alamat) or k in normalize_str(nama)):
                matched_rid = rid
                break
        if not matched_rid:
            for (p, k), rid in kab_prov_kab.items():
                if (not n_prov or p == n_prov) and (k in normalize_str(alamat) or k in normalize_str(nama)):
                    matched_rid = rid
                    break
        if not matched_rid:
            for k, rid in {**kota_kab, **kab_kab}.items():
                if len(k) > 4 and k in normalize_str(alamat):
                    matched_rid = rid
                    break
                    
        if matched_rid:
            matched += 1
            reg = reg_by_id[matched_rid]
            reg['ringkasan']['total_rs'] += 1
            reg['ringkasan']['total_faskes'] += 1
            
            reg['kesehatan']['rumah_sakit'].append({
                'nama': nama,
                'alamat': alamat,
                'telepon': telp if telp and telp != 'None' else '-',
                'email': email if email and email != 'None' else '-',
                'web': web if web and web != 'None' else '-'
            })
            
    print(f"Selesai rumah sakit: {matched:,}/{count:,} RS dipetakan ({matched/count*100:.1f}%)")

def main():
    start_time = time.time()
    print("=== MULAI BUILD BASIS DATA SOSIAL (PENDIDIKAN & KESEHATAN) ===")
    
    reg_by_id, kota_prov_kab, kab_prov_kab, kota_kab, kab_kab = load_regions()
    print(f"Loaded {len(reg_by_id)} wilayah BPS")
    
    process_sekolah(reg_by_id, kota_prov_kab, kab_prov_kab, kota_kab, kab_kab)
    process_kampus(reg_by_id, kota_prov_kab, kab_prov_kab, kota_kab, kab_kab)
    process_puskesmas(reg_by_id, kota_prov_kab, kab_prov_kab, kota_kab, kab_kab)
    process_rs(reg_by_id, kota_prov_kab, kab_prov_kab, kota_kab, kab_kab)
    
    # Simpan JSON
    json_path = output_json_path
    print(f"Menyimpan ke {json_path}...")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(reg_by_id, f, ensure_ascii=False, indent=2)
        
    # Simpan JS (window.SOSIAL_DATA)
    js_path = output_js_path
    print(f"Menyimpan ke {js_path}...")
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write("/* Basis Data Riil Sarana Pendidikan & Kesehatan 514 Kabupaten/Kota Indonesia */\n")
        f.write("window.SOSIAL_DATA = ")
        json.dump(reg_by_id, f, ensure_ascii=False)
        f.write(";\n")
        
    duration = time.time() - start_time
    json_size_mb = os.path.getsize(json_path) / (1024 * 1024)
    js_size_mb = os.path.getsize(js_path) / (1024 * 1024)
    print(f"SUKSES! Selesai dalam {duration:.1f} detik.")
    print(f"File output: {json_path} ({json_size_mb:.2f} MB), {js_path} ({js_size_mb:.2f} MB)")

if __name__ == '__main__':
    main()
