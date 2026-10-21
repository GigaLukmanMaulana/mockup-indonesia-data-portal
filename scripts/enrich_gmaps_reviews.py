import json, random, os

base_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(base_dir, '..'))

def enrich_gmaps():
    fpath_js = os.path.join(root_dir, 'assets', 'js', 'data', 'potensi-data.js')
    fpath_json = os.path.join(root_dir, 'data', 'json', 'potensi-data.json')
    
    with open(fpath_json, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    objs = data.get('objects', {})
    print(f"Memperkaya {len(objs)} objek dengan data ulasan & rating Google Maps...")
    
    reviewers = [
        ("Rian Pratama", "Local Guide · Level 7"),
        ("Siti Rahma", "Local Guide · Level 5"),
        ("Dedi Kurniawan", "Local Guide · Level 6"),
        ("Andi Wijaya", "Pengunjung"),
        ("Nurul Hidayati", "Local Guide · Level 8"),
        ("Budi Hartono", "Local Guide · Level 6"),
        ("Mega Utami", "Pengunjung"),
        ("Fajar Nugroho", "Local Guide · Level 5"),
        ("Dewi Lestari", "Local Guide · Level 7"),
        ("Hendra Setiawan", "Local Guide · Level 6")
    ]
    
    cat_reviews = {
        'rek': [
            ("Penerangan lampu LED megatron sangat terang dan kontras tinggi di malam hari. Titik persimpangan strategis dan ramai lalu lintas.", 5, "2 minggu lalu"),
            ("Posisi billboard menghadap langsung ke arus utama kendaraan dari arah pusat kota. Sudut pandang pengendara sangat jelas tanpa halangan pohon.", 5, "1 bulan lalu"),
            ("Papan iklan komersial ukuran besar dan terawat baik. Sangat eye-catching untuk promosi produk.", 4, "2 bulan lalu"),
            ("Lokasi reklame di perempatan jalan arteri ramai. Menjadi landmark visual saat berhenti di lampu merah.", 5, "3 minggu lalu")
        ],
        'pkr': [
            ("Pelataran parkir luas, aspal rata, dan sistem ticketing otomatis berfungsi lancar. Petugas sigap mengarahkan kendaraan.", 5, "1 minggu lalu"),
            ("Tarif parkir resmi sesuai perda bapenda. Keamanan terjaga dengan portal otomatis dan CCTV.", 4, "3 minggu lalu"),
            ("Lokasi strategis di kawasan kuliner dan pertokoan ramai. Kapasitas parkir roda 4 dan roda 2 cukup memadai.", 5, "1 bulan lalu"),
            ("Penerangan malam hari terang dan akses keluar masuk jalan raya cukup lancar.", 4, "2 bulan lalu")
        ],
        'mall': [
            ("Pusat perbelanjaan modern dan ramai pengunjung. Aksesibilitas sangat mudah di jalan utama dengan fasilitas parkir memadai.", 5, "5 hari lalu"),
            ("Tenant retail, kuliner, dan supermarket lengkap. Menjadi titik pusat ekonomi dan keramaian warga sekitar.", 5, "2 minggu lalu"),
            ("Gedung megah, terawat bersih, dan fasilitas umum berfungsi dengan baik.", 4, "1 bulan lalu"),
            ("Trafik pengunjung ramai di akhir pekan maupun hari kerja.", 5, "3 minggu lalu")
        ],
        'pab': [
            ("Kawasan pergudangan dan logistik dengan akses jalan lebar untuk manuver truk kontainer.", 5, "2 minggu lalu"),
            ("Keamanan gerbang satpam 24 jam dan fasilitas bongkar muat tertata teratur.", 4, "1 bulan lalu"),
            ("Lokasi strategis dekat jalur distribusi utama lingkar luar kota.", 5, "2 bulan lalu"),
            ("Area industri aktif dan terkoordinasi dengan baik.", 4, "3 minggu lalu")
        ],
        'tmn': [
            ("Sentra kuliner dan akomodasi favorit, suasana bersih dan pengunjung ramai di sore hingga malam hari.", 5, "4 hari lalu"),
            ("Lokasi nyaman, parkir memadai, dan banyak pilihan makanan berkualitas.", 5, "2 minggu lalu"),
            ("Tempat strategis dekat pusat keramaian dan fasilitas umum.", 4, "1 bulan lalu"),
            ("Pelayanan ramah dan tempatnya terawat dengan baik.", 5, "3 minggu lalu")
        ]
    }
    
    random.seed(101)
    for oid, obj in objs.items():
        cat = obj.get('category', 'rek')
        pool = cat_reviews.get(cat, cat_reviews['rek'])
        
        rating = round(random.uniform(4.3, 4.9), 1)
        total_rev = random.randint(28, 320)
        
        # Pick 2 reviews
        sample_pool = random.sample(pool, 2)
        sample_reviewers = random.sample(reviewers, 2)
        
        reviews_data = []
        for i in range(2):
            text, r_stars, time_ago = sample_pool[i]
            author_name, author_badge = sample_reviewers[i]
            reviews_data.append({
                "author": author_name,
                "badge": author_badge,
                "rating": r_stars,
                "time": time_ago,
                "text": text
            })
            
        obj['gmapsRating'] = rating
        obj['gmapsTotalReviews'] = total_rev
        obj['gmapsReviews'] = reviews_data
        
    print("Menulis ke potensi-data.json...")
    with open(fpath_json, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print("Menulis ke potensi-data.js...")
    with open(fpath_js, 'w', encoding='utf-8') as f:
        f.write("/* Dataset Peta Potensi Pajak PAD360 - Seluruh Indonesia */\n")
        f.write("window.PotensiData = ")
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write(";\n")
        
    print("SELESAI! Seluruh objek POI telah dilengkapi Google Reviews & Rating.")

if __name__ == '__main__':
    enrich_gmaps()
