import pandas as pd
import json
import os
import re

excel_path = os.path.join(os.path.dirname(__file__), '..', 'data-mentah', 'xlsx', 'Merge Konsumsi 2023.xlsx')
output_json_path = os.path.join(os.path.dirname(__file__), '..', 'konsumsi-data.json')
output_js_path = os.path.join(os.path.dirname(__file__), '..', 'konsumsi-data.js')

# Mapping from Excel sheet names to Standard Tab UI Category Labels
sheet_mapping = {
    'Padi Padian': {
        'id': 'padi',
        'label': 'Padi-Padian',
        'icon': '🌾',
        'default_unit': 'Ton/th'
    },
    'Umbi': {
        'id': 'umbi',
        'label': 'Umbi-Umbian',
        'icon': '🥔',
        'default_unit': 'Ton/th'
    },
    'Ikan': {
        'id': 'ikan',
        'label': 'Ikan-Ikanan',
        'icon': '🐟',
        'default_unit': 'Ton/th'
    },
    'Daging': {
        'id': 'daging',
        'label': 'Daging',
        'icon': '🥩',
        'default_unit': 'Ton/th'
    },
    'Telur & Susu': {
        'id': 'telur_susu',
        'label': 'Telur & Susu',
        'icon': '🥚',
        'default_unit': 'Butir/th',
        'sub_groups': [
            {
                'id': 'telur',
                'label': 'Telur Unggas',
                'icon': '🥚',
                'unit': 'Butir/th',
                'filter': lambda it: 'telur' in it['name'].lower()
            },
            {
                'id': 'susu',
                'label': 'Susu & Olahan',
                'icon': '🥛',
                'unit': 'Produk Olahan',
                'filter': lambda it: 'susu' in it['name'].lower()
            }
        ]
    },
    'Sayur': {
        'id': 'sayur',
        'label': 'Sayur-Sayuran',
        'icon': '🥬',
        'default_unit': 'Ton/th',
        'sub_groups': [
            {
                'id': 'sayur_segar',
                'label': 'Sayuran Segar',
                'icon': '🥬',
                'unit': 'Ton/th',
                'filter': lambda it: 'paket' not in it['unit'].lower() and 'bungkus' not in it['unit'].lower()
            },
            {
                'id': 'sayur_racik',
                'label': 'Bahan Sayur Racik',
                'icon': '🍲',
                'unit': 'Paket/th',
                'filter': lambda it: 'paket' in it['unit'].lower() or 'bungkus' in it['unit'].lower()
            }
        ]
    },
    'Kacang': {
        'id': 'kacang',
        'label': 'Kacang-Kacangan',
        'icon': '🥜',
        'default_unit': 'Ton/th'
    },
    'Buah': {
        'id': 'buah',
        'label': 'Buah-Buahan',
        'icon': '🍎',
        'default_unit': 'Ton/th'
    },
    'Minyak': {
        'id': 'minyak',
        'label': 'Minyak & Kelapa',
        'icon': '🥥',
        'default_unit': 'Liter/th',
        'sub_groups': [
            {
                'id': 'minyak_nabati',
                'label': 'Minyak Nabati',
                'icon': '🛢️',
                'unit': 'Liter/th',
                'filter': lambda it: 'minyak' in it['name'].lower()
            },
            {
                'id': 'kelapa_butir',
                'label': 'Kelapa & Lainnya',
                'icon': '🥥',
                'unit': 'Butir & Ton',
                'filter': lambda it: 'minyak' not in it['name'].lower()
            }
        ]
    },
    'Bhn Minuman': {
        'id': 'minuman',
        'label': 'Bahan Minuman',
        'icon': '☕',
        'default_unit': 'Ton/th',
        'sub_groups': [
            {
                'id': 'pokok',
                'label': 'Gula & Bubuk',
                'icon': '☕',
                'unit': 'Ton/th',
                'filter': lambda it: 'sachet' not in it['unit'].lower()
            },
            {
                'id': 'sachet',
                'label': 'Kemasan Sachet',
                'icon': '🍵',
                'unit': 'Sachet/th',
                'filter': lambda it: 'sachet' in it['unit'].lower()
            }
        ]
    },
    'Bumbu': {
        'id': 'bumbu',
        'label': 'Bumbu-Bumbuan',
        'icon': '🌶️',
        'default_unit': 'Ton/th'
    },
    'Bhn Makanan': {
        'id': 'bahan_makanan',
        'label': 'Bahan Makanan',
        'icon': '🍜',
        'default_unit': 'Ton/th'
    },
    'Makanan Jadi': {
        'id': 'makanan_jadi',
        'label': 'Makanan Jadi',
        'icon': '🍲',
        'default_unit': 'Porsi/th'
    },
    'Rokok': {
        'id': 'rokok',
        'label': 'Rokok & Tembakau',
        'icon': '🚬',
        'default_unit': 'Batang/th',
        'sub_groups': [
            {
                'id': 'rokok_jadi',
                'label': 'Rokok Jadi',
                'icon': '🚬',
                'unit': 'Batang/th',
                'filter': lambda it: 'batang' in it['unit'].lower()
            },
            {
                'id': 'tembakau',
                'label': 'Tembakau & Lainnya',
                'icon': '🍂',
                'unit': 'Ton/th',
                'filter': lambda it: 'batang' not in it['unit'].lower()
            }
        ]
    }
}

def clean_col_name(c, default_sheet_unit='Ton/th'):
    # Extract clean commodity name and correct unit from column header
    # Examples:
    # 'Beras(Beras Lokal, Kualitas Unggul, Impor) (Ton) Tahunan' -> Name: 'Beras', Unit: 'Ton'
    # 'Rokok Kretek Filter (Batang) Tahunan' -> Name: 'Rokok Kretek Filter', Unit: 'Batang'
    # 'Teh Celup (Sachet) (2 Gram) Tahunan' -> Name: 'Teh Celup', Unit: 'Sachet'
    # 'Bahan Sayur Sop/Cap Cay/Kimlo (Paket) (Bungkus) Tahunan' -> Name: 'Bahan Sayur Sop/Cap Cay/Kimlo', Unit: 'Paket'
    # 'Roti Tawar (Potong) Tahunan' -> Name: 'Roti Tawar', Unit: 'Potong'
    # 'Kue Basah (Kue Lapis, Bika Ambon, Lemper, Dsb) (Buah) Tahunan' -> Name: 'Kue Basah', Unit: 'Buah'
    
    c_str = str(c).strip()
    c_base = re.sub(r'\s*[Tt]ahunan\s*$', '', c_str).strip()
    parens = re.findall(r'\(([^)]+)\)', c_base)
    
    unit_tokens = [
        'Ton', 'Batang', 'Butir', 'Potong', 'Buah', 'Liter', 'Porsi', 
        'Paket', 'Bungkus', 'Sachet', 'Gelas', 'Kotak', 'Mangkok', 
        'Kaleng', 'Galon', 'Kg', 'Gram', 'Ons', 'Lembar'
    ]
    
    unit = None
    unit_paren_str = None
    
    # Priority 1: If there is a packaging unit (Sachet, Paket, Bungkus, Kotak, Kaleng), prefer it
    if len(parens) >= 2:
        for p in parens:
            p_clean = p.strip()
            for pk in ['Sachet', 'Paket', 'Bungkus', 'Kotak', 'Kaleng']:
                if pk.lower() in p_clean.lower():
                    unit = pk
                    unit_paren_str = p
                    break
            if unit:
                break
                
    # Priority 2: Check matching unit tokens in reverse order
    if not unit:
        for p in reversed(parens):
            p_clean = p.strip()
            for ku in unit_tokens:
                if ku.lower() == p_clean.lower():
                    unit = ku
                    unit_paren_str = p
                    break
                elif ku.lower() in p_clean.lower():
                    unit = ku
                    unit_paren_str = p
                    break
            if unit:
                break
                
    # Priority 3: Check liquid measurement like ml or liter
    if not unit:
        for p in reversed(parens):
            if 'ml' in p.lower() or 'liter' in p.lower():
                unit = 'Botol'
                unit_paren_str = p
                break
                
    # Fallback to sheet default
    if not unit:
        if 'batang' in default_sheet_unit.lower():
            unit = 'Batang'
        elif 'butir' in default_sheet_unit.lower():
            unit = 'Butir'
        elif 'liter' in default_sheet_unit.lower():
            unit = 'Liter'
        elif 'porsi' in default_sheet_unit.lower():
            unit = 'Porsi'
        else:
            unit = 'Ton'

    # Remove the unit parenthesis from name
    if unit_paren_str:
        name_no_unit = c_base.replace(f'({unit_paren_str})', '').strip()
    else:
        name_no_unit = c_base
        
    # Strip descriptive qualifiers in parentheses (e.g. '(Beras Lokal, Kualitas Unggul, Impor)')
    clean_name = re.sub(r'\(.*?\)', '', name_no_unit).strip()
    if not clean_name:
        clean_name = name_no_unit.strip()
    clean_name = re.sub(r'\s+', ' ', clean_name).strip()
    
    return clean_name, unit


print(f"Loading Excel file: {excel_path} ...")
xl = pd.ExcelFile(excel_path)

# Dictionary keyed by region ID (as string)
regions_konsumsi = {}

# Process each sheet
for sheet_name, meta in sheet_mapping.items():
    if sheet_name not in xl.sheet_names:
        print(f"Warning: Sheet {sheet_name} not found in Excel!")
        continue

    print(f"Processing sheet: {sheet_name} ({meta['label']}) ...")
    df = xl.parse(sheet_name)
    
    # Columns that represent commodities
    commodity_cols = [c for c in df.columns if c not in ['ID', 'Kabupaten']]
    
    for _, row in df.iterrows():
        reg_id = str(int(row['ID']))
        reg_name = str(row['Kabupaten']).strip()
        
        if reg_id not in regions_konsumsi:
            regions_konsumsi[reg_id] = {
                'id': int(reg_id),
                'kabupaten': reg_name,
                'tahun': 2023,
                'sumber': 'Susenas BPS 2023 (Konsumsi Riil Tahunan)',
                'groups': {}
            }
            
        items = []
        total_val = 0.0
        primary_unit = meta['default_unit']
        
        for c in commodity_cols:
            val = row[c]
            if pd.isna(val) or val is None:
                val = 0.0
            else:
                try:
                    val = float(val)
                except:
                    val = 0.0
            
            c_name, c_unit = clean_col_name(c, primary_unit)
            items.append({
                'name': c_name,
                'val': round(val, 2),
                'unit': c_unit
            })

        # Calculate total_volume based on the group's primary unit
        # to prevent mixing incompatible units (e.g., adding paket sayur directly into tons)
        base_unit_keyword = primary_unit.split('/')[0].strip().lower()
        matching_items = [it for it in items if base_unit_keyword in it['unit'].lower()]
        if matching_items:
            total_val = sum(it['val'] for it in matching_items)
            matching_items.sort(key=lambda x: x['val'], reverse=True)
            top_items = [it for it in matching_items if it['val'] > 0][:5]
        else:
            total_val = sum(it['val'] for it in items)
            items.sort(key=lambda x: x['val'], reverse=True)
        # Build sub_groups if defined in sheet_mapping
        has_subgroups = 'sub_groups' in meta
        built_subgroups = []
        if has_subgroups:
            for sg_def in meta['sub_groups']:
                sg_items = [it for it in items if sg_def['filter'](it)]
                sg_items.sort(key=lambda x: x['val'], reverse=True)
                
                # Compute total volume for sub_group if items match its unit keyword
                sg_unit_kw = sg_def['unit'].split('/')[0].strip().lower()
                sg_matching = [it for it in sg_items if sg_unit_kw in it['unit'].lower()]
                sg_total = sum(it['val'] for it in sg_matching) if sg_matching else None
                
                built_subgroups.append({
                    'id': sg_def['id'],
                    'label': sg_def['label'],
                    'icon': sg_def['icon'],
                    'unit': sg_def['unit'],
                    'total_volume': round(sg_total, 2) if sg_total is not None else None,
                    'items': sg_items
                })

        regions_konsumsi[reg_id]['groups'][meta['label']] = {
            'id': meta['id'],
            'label': meta['label'],
            'icon': meta['icon'],
            'total_volume': round(total_val, 2),
            'default_unit': primary_unit,
            'top_items': top_items,
            'all_items_count': len(items),
            'has_subgroups': has_subgroups,
            'sub_groups': built_subgroups if has_subgroups else None
        }

print(f"Total regions processed: {len(regions_konsumsi)}")

# Write to JSON
with open(output_json_path, 'w', encoding='utf-8') as f:
    json.dump(regions_konsumsi, f, ensure_ascii=False, indent=2)
print(f"Saved: {output_json_path} ({os.path.getsize(output_json_path)} bytes)")

# Write to JS
with open(output_js_path, 'w', encoding='utf-8') as f:
    f.write('/* Portal Data Indonesia — Dataset Konsumsi Komoditas Riil BPS (Susenas 2023) */\n')
    f.write('window.KONSUMSI_DATA = ')
    json.dump(regions_konsumsi, f, ensure_ascii=False)
    f.write(';\n')
print(f"Saved: {output_js_path} ({os.path.getsize(output_js_path)} bytes)")
print("ETL complete successfully!")
