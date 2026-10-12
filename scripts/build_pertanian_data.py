import os
import glob
import json
import re
import time
import openpyxl

base_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(base_dir, '..'))

data_json_path = os.path.join(root_dir, 'data.json')
pertanian_dir = os.path.join(root_dir, 'data-mentah', 'xlsx', 'data-pertanian')
output_json_path = os.path.join(root_dir, 'pertanian-data.json')
output_js_path = os.path.join(root_dir, 'pertanian-data.js')

print("1. Loading 514 region reference from data.json...")
with open(data_json_path, 'r', encoding='utf-8') as f:
    region_data = json.load(f)

# Helper for string normalization
def norm_name(s):
    if not s:
        return ''
    s = str(s).upper().strip()
    s = re.sub(r'^(\bKAB\b\.?|\bKABUPATEN\b|\bKOTA\b|KAB:)\s*', '', s)
    s = re.sub(r'[^A-Z0-9]', '', s)
    return s

# Exact Aliases for non-standard Excel region entries: key is (is_kota, prov_clean, kab_clean)
ALIAS_MAP = {
    (False, 'ACEH', 'ACEHPIDIE'): 12,       # PIDIE
    (False, 'ACEH', 'BIREUN'): 1,           # BIREUEN
    (False, 'KALIMANTANTIMUR', 'KUTAIKERTANEGARA'): 359, # KUTAI KARTANEGARA
    (False, 'KALIMANTANTIMUR', 'MAHAKAMHULU'): 356,      # MAHAKAM ULU
    (False, 'KALIMANTANTIMUR', 'NUNUKAN'): 369,          # NUNUKAN (tercatat di bawah Kaltim)
    (False, 'MALUKU', 'MALUKUTENGGARABARAT'): 452,       # KEPULAUAN TANIMBAR
    (False, 'NUSATENGGARATIMUR', 'LEMBATA'): 305,        # LEMBATA
    (False, 'PAPUA', 'PEGBINTANG'): 514,                 # PEGUNUNGAN BINTANG
    (False, 'PAPUA', 'YAPENWAROPEN'): 489,               # KEPULAUAN YAPEN
    (False, 'PAPUA', 'MAMBERAMORAYA'): 494,              # MAMBERAMO RAYA
    (False, 'PAPUA', 'NABIRE'): 502,                     # NABIRE
    (True,  'PAPUABARAT', 'SORONG'): 485,                # KOTA SORONG
    (False, 'RIAU', 'KEPULAUANRIAU'): 149,               # BINTAN
    (False, 'SULAWESIBARAT', 'MAMUJUUTARAKABPASANGKAYU'): 450, # PASANGKAYU
    (False, 'SUMATERASELATAN', 'OKUSELATAN'): 108,       # OGAN KOMERING ULU SELATAN
    (False, 'SUMATERASELATAN', 'OKUTIMUR'): 109,         # OGAN KOMERING ULU TIMUR
    (False, 'SUMATERAUTARA', 'TOBASAMOSIR'): 36,         # TOBA
}

# Separate lookup structures for Kota and Kabupaten
kota_by_prov_kab = {}
kota_by_kab = {}
kab_by_prov_kab = {}
kab_by_kab = {}
regions_db = {}

for r in region_data:
    rid = int(r['id'])
    is_kota = r.get('kabkota', '').upper().startswith('KOTA ')
    kn = norm_name(r.get('kabkota', ''))
    pn = norm_name(r.get('prov', ''))
    
    if is_kota:
        kota_by_prov_kab[(pn, kn)] = rid
        if kn not in kota_by_kab:
            kota_by_kab[kn] = rid
    else:
        kab_by_prov_kab[(pn, kn)] = rid
        if kn not in kab_by_kab:
            kab_by_kab[kn] = rid
    
    # Initialize container for each region
    regions_db[str(rid)] = {
        'id': rid,
        'kabkota': r.get('kabkota', ''),
        'provinsi': r.get('prov', ''),
        'tahun': 2023,
        'ringkasan': {
            'tanaman_pangan_total_produksi_ton': 0.0,
            'hortikultura_total_produksi_ton': 0.0,
            'perkebunan_total_produksi_ton': 0.0,
            'peternakan_total_populasi_ekor': 0.0,
            'peternakan_total_produksi_ton': 0.0
        },
        'tanaman_pangan': {},
        'hortikultura': {},
        'perkebunan': {},
        'peternakan': {
            'populasi': {},
            'produksi': {}
        }
    }

def match_region_id(prov_str, kab_str):
    is_kota = bool(re.match(r'^\s*KOTA[\s\.]', str(kab_str).upper()))
    pn = norm_name(prov_str)
    kn = norm_name(kab_str)
    
    # 1. Check explicit alias
    alias_key = (is_kota, pn, kn)
    if alias_key in ALIAS_MAP:
        return ALIAS_MAP[alias_key]
    
    # 2. Check matched lookup table (Kota vs Kab)
    prov_kab_table = kota_by_prov_kab if is_kota else kab_by_prov_kab
    kab_table = kota_by_kab if is_kota else kab_by_kab
    
    if (pn, kn) in prov_kab_table:
        return prov_kab_table[(pn, kn)]
    
    if kn in kab_table:
        return kab_table[kn]
    
    # Fallback cross-check if mislabeled
    fallback_table = kab_by_prov_kab if is_kota else kota_by_prov_kab
    if (pn, kn) in fallback_table:
        return fallback_table[(pn, kn)]
        
    return None

def parse_num(val):
    if val is None:
        return 0.0
    val_str = str(val).strip().replace(',', '.')
    try:
        n = float(val_str)
        return round(n, 2)
    except:
        return 0.0

# 2. Collect all excel files across the 4 sectors
print("2. Discovering Excel files...")
sector_folders = {
    'Tanaman Pangan': os.path.join(pertanian_dir, 'Tanaman Pangan'),
    'Hortikultura': os.path.join(pertanian_dir, 'Hortikultura'),
    'Perkebunan': os.path.join(pertanian_dir, 'Perkebunan'),
    'Peternakan': os.path.join(pertanian_dir, 'Peternakan')
}

all_files = []
for sec_name, sec_path in sector_folders.items():
    found = glob.glob(os.path.join(sec_path, '*', '*.xlsx'))
    print(f"   Sector '{sec_name}': {len(found)} files")
    for fp in found:
        all_files.append((sec_name, fp))

total_files = len(all_files)
print(f"Total files to process: {total_files}")

start_time = time.time()
processed_files = 0

for sec_name, file_path in all_files:
    processed_files += 1
    if processed_files % 25 == 0 or processed_files == total_files:
        elapsed = time.time() - start_time
        print(f"   Progress: [{processed_files}/{total_files}] files parsed ({elapsed:.1f}s)...")
        
    try:
        wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
        sheet = wb.active
        
        # Determine commodity from folder or header
        folder_comm = os.path.basename(os.path.dirname(file_path)).strip().upper()
        
        # Read rows
        # Row 1 is header:
        # Col 1: No, 2: Indikator, 3: Satuan, 4: 2018 ... 9: 2023 ... 13: Subsektor, 14: Komoditas, 15: Provinsi, 16: Kabupaten
        is_first = True
        for row in sheet.iter_rows(values_only=True):
            if is_first:
                is_first = False
                continue
            
            if not row or len(row) < 9:
                continue
            
            # Safe unpack
            indikator = str(row[1] or '').strip().upper() if len(row) > 1 else ''
            satuan = str(row[2] or '').strip() if len(row) > 2 else ''
            val_2023_raw = row[8] if len(row) > 8 else None
            val_2023 = parse_num(val_2023_raw)
            
            prov_raw = str(row[14] or '').strip() if len(row) > 14 else ''
            kab_raw = str(row[15] or '').strip() if len(row) > 15 else ''
            
            comm_raw = str(row[13] or '').strip().upper() if len(row) > 13 and row[13] else folder_comm
            
            if not prov_raw or not kab_raw:
                continue
            
            reg_id = match_region_id(prov_raw, kab_raw)
            if not reg_id:
                continue
            
            reg_key = str(reg_id)
            target_reg = regions_db[reg_key]
            
            # Only record if val_2023 > 0 to keep JSON compact
            if val_2023 <= 0:
                continue
            
            # Map into target sector
            if sec_name == 'Tanaman Pangan':
                comm_obj = target_reg['tanaman_pangan'].setdefault(comm_raw, {
                    'komoditas': comm_raw,
                    'luas_panen': None,
                    'produksi': None,
                    'produktivitas': None,
                    'tanaman_menghasilkan': None
                })
                
                if 'LUAS PANEN' in indikator:
                    comm_obj['luas_panen'] = {'val': val_2023, 'unit': satuan or 'Ha'}
                elif 'PRODUKSI' in indikator:
                    comm_obj['produksi'] = {'val': val_2023, 'unit': satuan or 'Ton'}
                    if 'ton' in (satuan or 'ton').lower():
                        target_reg['ringkasan']['tanaman_pangan_total_produksi_ton'] += val_2023
                elif 'PRODUKTIVITAS' in indikator:
                    comm_obj['produktivitas'] = {'val': val_2023, 'unit': satuan or 'Kuintal/Ha'}
                elif 'MENGHASILKAN' in indikator:
                    comm_obj['tanaman_menghasilkan'] = {'val': val_2023, 'unit': satuan or 'Pohon'}
                    
            elif sec_name == 'Hortikultura':
                comm_obj = target_reg['hortikultura'].setdefault(comm_raw, {
                    'komoditas': comm_raw,
                    'luas_panen': None,
                    'produksi': None,
                    'produktivitas': None,
                    'tanaman_menghasilkan': None
                })
                
                if 'LUAS PANEN' in indikator:
                    comm_obj['luas_panen'] = {'val': val_2023, 'unit': satuan or 'm2'}
                elif 'PRODUKSI' in indikator:
                    comm_obj['produksi'] = {'val': val_2023, 'unit': satuan or 'Kg'}
                    if 'ton' in (satuan or '').lower():
                        target_reg['ringkasan']['hortikultura_total_produksi_ton'] += val_2023
                    elif 'kuintal' in (satuan or '').lower():
                        target_reg['ringkasan']['hortikultura_total_produksi_ton'] += (val_2023 * 0.1)
                    elif 'kg' in (satuan or '').lower():
                        target_reg['ringkasan']['hortikultura_total_produksi_ton'] += (val_2023 / 1000.0)
                elif 'PRODUKTIVITAS' in indikator:
                    comm_obj['produktivitas'] = {'val': val_2023, 'unit': satuan or 'Kg/m2'}
                elif 'MENGHASILKAN' in indikator:
                    comm_obj['tanaman_menghasilkan'] = {'val': val_2023, 'unit': satuan or 'Pohon'}
                    
            elif sec_name == 'Perkebunan':
                comm_obj = target_reg['perkebunan'].setdefault(comm_raw, {
                    'komoditas': comm_raw,
                    'luas_areal': None,
                    'produksi': None,
                    'produktivitas': None
                })
                
                if 'LUAS AREAL' in indikator or 'LUAS PANEN' in indikator:
                    comm_obj['luas_areal'] = {'val': val_2023, 'unit': satuan or 'Ha'}
                elif 'PRODUKSI' in indikator:
                    comm_obj['produksi'] = {'val': val_2023, 'unit': satuan or 'Ton'}
                    if 'ton' in (satuan or 'ton').lower():
                        target_reg['ringkasan']['perkebunan_total_produksi_ton'] += val_2023
                elif 'PRODUKTIVITAS' in indikator:
                    comm_obj['produktivitas'] = {'val': val_2023, 'unit': satuan or 'Kg/Ha'}
                    
            elif sec_name == 'Peternakan':
                if 'POPULASI' in indikator:
                    target_reg['peternakan']['populasi'][comm_raw] = {
                        'komoditas': comm_raw,
                        'val': val_2023,
                        'unit': satuan or 'Ekor'
                    }
                    mult = 1000.0 if "'000" in satuan or "000" in satuan else 1.0
                    target_reg['ringkasan']['peternakan_total_populasi_ekor'] += (val_2023 * mult)
                elif 'PRODUKSI' in indikator:
                    target_reg['peternakan']['produksi'][comm_raw] = {
                        'komoditas': comm_raw,
                        'val': val_2023,
                        'unit': satuan or 'Ton'
                    }
                    if 'ton' in (satuan or 'ton').lower():
                        target_reg['ringkasan']['peternakan_total_produksi_ton'] += val_2023
                    elif 'kg' in (satuan or '').lower():
                        target_reg['ringkasan']['peternakan_total_produksi_ton'] += (val_2023 / 1000.0)
                        
        wb.close()
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")

print("3. Converting dictionary lists and rounding summary totals...")
final_output = {}
active_region_count = 0

for rid_str, rdata in regions_db.items():
    # Convert sector dicts to sorted lists
    tp_list = sorted(list(rdata['tanaman_pangan'].values()), 
                     key=lambda x: (x['produksi']['val'] if x['produksi'] else 0.0), reverse=True)
    
    horti_list = sorted(list(rdata['hortikultura'].values()), 
                        key=lambda x: (x['produksi']['val'] if x['produksi'] else 0.0), reverse=True)
    
    kebun_list = sorted(list(rdata['perkebunan'].values()), 
                        key=lambda x: (x['produksi']['val'] if x['produksi'] else 0.0), reverse=True)
    
    ternak_pop_list = sorted(list(rdata['peternakan']['populasi'].values()), 
                             key=lambda x: x['val'], reverse=True)
    
    ternak_prod_list = sorted(list(rdata['peternakan']['produksi'].values()), 
                              key=lambda x: x['val'], reverse=True)
    
    # Round summary numbers
    rdata['ringkasan']['tanaman_pangan_total_produksi_ton'] = round(rdata['ringkasan']['tanaman_pangan_total_produksi_ton'], 2)
    rdata['ringkasan']['hortikultura_total_produksi_ton'] = round(rdata['ringkasan']['hortikultura_total_produksi_ton'], 2)
    rdata['ringkasan']['perkebunan_total_produksi_ton'] = round(rdata['ringkasan']['perkebunan_total_produksi_ton'], 2)
    rdata['ringkasan']['peternakan_total_populasi_ekor'] = round(rdata['ringkasan']['peternakan_total_populasi_ekor'], 0)
    rdata['ringkasan']['peternakan_total_produksi_ton'] = round(rdata['ringkasan']['peternakan_total_produksi_ton'], 2)
    
    has_any = (len(tp_list) > 0 or len(horti_list) > 0 or len(kebun_list) > 0 or 
               len(ternak_pop_list) > 0 or len(ternak_prod_list) > 0)
    
    if has_any:
        active_region_count += 1
        
    final_output[rid_str] = {
        'id': rdata['id'],
        'kabkota': rdata['kabkota'],
        'provinsi': rdata['provinsi'],
        'tahun': 2023,
        'has_data': has_any,
        'ringkasan': rdata['ringkasan'],
        'sektor': {
            'tanaman_pangan': tp_list,
            'hortikultura': horti_list,
            'perkebunan': kebun_list,
            'peternakan': {
                'populasi': ternak_pop_list,
                'produksi': ternak_prod_list
            }
        }
    }

print(f"4. Active regions with recorded agricultural data: {active_region_count} / 514")

print(f"5. Writing output JSON to {output_json_path} ...")
with open(output_json_path, 'w', encoding='utf-8') as f:
    json.dump(final_output, f, ensure_ascii=False, indent=2)

print(f"6. Writing output JS to {output_js_path} ...")
with open(output_js_path, 'w', encoding='utf-8') as f:
    f.write("// Dataset Pertanian Resmi BPS / Kementan 2023\n")
    f.write("window.PERTANIAN_DATA = ")
    json.dump(final_output, f, ensure_ascii=False)
    f.write(";\n")

json_size_mb = os.path.getsize(output_json_path) / (1024 * 1024)
js_size_mb = os.path.getsize(output_js_path) / (1024 * 1024)
print(f"Done! JSON size: {json_size_mb:.2f} MB | JS size: {js_size_mb:.2f} MB in {time.time() - start_time:.1f}s")
