import json, random, os
from datetime import datetime, timedelta

base_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(base_dir, '..'))
fpath = os.path.join(root_dir, 'assets', 'js', 'data', 'potensi-data.js')
with open(fpath, 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('{')
end = text.rfind('}')
d = json.loads(text[start:end+1])

objs = d.get('objects', {})
print(f"Memperkaya {len(objs)} objek POI dengan metadata kontrak & kontak WhatsApp...")

base_date = datetime(2026, 10, 12)
names_sample = [
    'Bpk. Bambang Sutrisno', 'Ibu Ratna Dewi', 'Bpk. Hendra Gunawan',
    'Ibu Siti Rahmawati', 'Bpk. Wayan Sudarma', 'Ibu Made Ayu',
    'Bpk. Agus Setiawan', 'Ibu Nurul Hidayah', 'Bpk. Denny Prasetyo',
    'Bpk. Fajar Ramadhan', 'Ibu Linda Permata', 'Bpk. Eko Wahyudi'
]

random.seed(42)
for oid, obj in objs.items():
    r_val = random.random()
    if r_val < 0.15:
        days = random.randint(-40, -1)
    elif r_val < 0.40:
        days = random.randint(1, 30)
    elif r_val < 0.65:
        days = random.randint(31, 60)
    else:
        days = random.randint(61, 365)
        
    end_date = base_date + timedelta(days=days)
    obj['contractEnd'] = end_date.strftime('%Y-%m-%d')
    obj['contractDaysLeft'] = days
    
    if days < 0:
        obj['contractStatus'] = 'expired'
        obj['contractBadge'] = 'Kadaluarsa'
    elif days <= 30:
        obj['contractStatus'] = 'expiring_soon'
        obj['contractBadge'] = 'Segera Habis (<30 Hari)'
    elif days <= 60:
        obj['contractStatus'] = 'warning_60'
        obj['contractBadge'] = '31-60 Hari'
    else:
        obj['contractStatus'] = 'active'
        obj['contractBadge'] = 'Aktif'
        
    obj['contactPerson'] = random.choice(names_sample)
    suffix = random.randint(10000000, 99999999)
    obj['contactPhone'] = f"6281{suffix}"
    
    lat = obj.get('lat')
    lng = obj.get('lng')
    if lat and lng:
        obj['googleMapsUrl'] = f"https://www.google.com/maps/search/?api=1&query={lat},{lng}"
    else:
        obj['googleMapsUrl'] = f"https://www.google.com/maps/search/?api=1&query={obj.get('name','')}"

print("Menyimpan ke potensi-data.js...")
with open(fpath, 'w', encoding='utf-8') as f:
    f.write("/* Dataset Peta Potensi Pajak PAD360 - Seluruh Indonesia */\n")
    f.write("window.PotensiData = ")
    json.dump(d, f, ensure_ascii=False, indent=2)
    f.write(";\n")

print("SUKSES memperkaya potensi-data.js!")
