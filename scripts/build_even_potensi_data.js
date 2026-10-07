const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'potensi-data.json');
const rawData = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

const provinces = rawData.provinces || [];
const cities = rawData.cities || [];
const categories = rawData.categories || [
    { id: 'rek', label: 'Billboard / Reklame', tax: 'reklame', share: 0.45, color: '#0E9E9A', tag: 'REK' },
    { id: 'pkr', label: 'Parkir Komersial', tax: 'parkir', share: 0.25, color: '#d97706', tag: 'PKR' },
    { id: 'mall', label: 'Mall & Pusat Belanja', tax: 'pbb', share: 0.15, color: '#7c3aed', tag: 'MALL' },
    { id: 'pab', label: 'Pabrik & Pergudangan', tax: 'pbb', share: 0.1, color: '#2563eb', tag: 'PAB' },
    { id: 'tmn', label: 'Ruang Publik / Fasum', tax: 'telaah', share: 0.05, color: '#059669', tag: 'TMN' }
];

const streetNames = [
    'Jl. Jenderal Sudirman', 'Jl. Gajah Mada', 'Jl. Ahmad Yani', 'Jl. Diponegoro',
    'Jl. Gatot Subroto', 'Jl. Pahlawan', 'Jl. Merdeka', 'Jl. Veteran',
    'Jl. Hayam Wuruk', 'Jl. Pemuda', 'Jl. Hasanuddin', 'Jl. Imam Bonjol',
    'Jl. Pattimura', 'Jl. Basuki Rahmat', 'Jl. R.E. Martadinata', 'Jl. Teuku Umar',
    'Jl. Sisingamangaraja', 'Jl. Yos Sudarso', 'Jl. Raden Inten', 'Jl. Kartini'
];

const catTemplates = {
    rek: [
        { name: 'BILLBOARD SIMPANG UTAMA', w: 8, h: 4, sisi: 2, jenis: 'Papan Billboard Lampu LED', taxType: 'Pajak Reklame', potMin: 35, potMax: 90, formula: 'NSR (Nilai Sewa Reklame) × Tarif 25%' },
        { name: 'VIDEOTRON DIGITAL MEGASCREEN', w: 10, h: 5, sisi: 1, jenis: 'LED Megatron Outdoor', taxType: 'Pajak Reklame Elektronik', potMin: 75, potMax: 160, formula: 'Luas Layar × Durasi Tayang × Tarif LED 25%' },
        { name: 'BALIHO PROMOSI KOMERSIAL', w: 6, h: 3, sisi: 2, jenis: 'Papan Baliho Rangka Baja', taxType: 'Pajak Reklame', potMin: 20, potMax: 45, formula: 'NSR × Sudut Pandang × Tarif 25%' },
        { name: 'NEON BOX PERTOKOAN STRATEGIS', w: 5, h: 2.5, sisi: 2, jenis: 'Neon Box Acrylic Outdoor', taxType: 'Pajak Reklame Papan', potMin: 15, potMax: 35, formula: 'Luas Bidang Reklame × Tarif Dasar 25%' }
    ],
    pkr: [
        { name: 'PARKIR PELATARAN RUKO PUSAT BISNIS', w: 30, h: 15, sisi: 1, jenis: 'Pelataran Parkir Aspal / Paving', taxType: 'PBJT Jasa Parkir', potMin: 25, potMax: 65, formula: 'Estimasi SRP × Kapasitas Kendaraan × Tarif PBJT 10%' },
        { name: 'GEDUNG PARKIR KHUSUS KOMERSIAL', w: 40, h: 25, sisi: 1, jenis: 'Gedung Parkir Bertingkat', taxType: 'PBJT Jasa Parkir', potMin: 60, potMax: 140, formula: 'Kapasitas Slot × Omzet Bulanan × Tarif PBJT 10%' },
        { name: 'OFF-STREET PARKING KAWASAN KULINER', w: 25, h: 12, sisi: 1, jenis: 'Parkir Off-Street Pintu Gerbang', taxType: 'PBJT Jasa Parkir', potMin: 20, potMax: 50, formula: 'Omzet Tiket Harian × 365 × 10%' }
    ],
    mall: [
        { name: 'PLAZA PUSAT PERBELANJAAN DAERAH', w: 60, h: 40, sisi: 1, jenis: 'Bangunan Mall Modern 3 Lantai', taxType: 'PBB-P2 & PBJT Hiburan/Makan', potMin: 120, potMax: 350, formula: 'NJOP Tanah + NJOP Bangunan Komersial' },
        { name: 'GRAND TRADE CENTER & SUPERMARKET', w: 50, h: 35, sisi: 1, jenis: 'Pusat Grosir & Retail Modern', taxType: 'PBB-P2 Komersial', potMin: 90, potMax: 280, formula: 'NJOP Bangunan Bertingkat + PBJT Reklame Interior' },
        { name: 'LIFESTYLE MALL & HYPERMARKET', w: 70, h: 45, sisi: 1, jenis: 'Pusat Perbelanjaan Terpadu', taxType: 'PBB-P2 & PBJT Terpadu', potMin: 150, potMax: 420, formula: 'NJOP Total Komersial × Tarif PBB-P2 0.2%' }
    ],
    pab: [
        { name: 'KOMPLEK PERGUDANGAN & LOGISTIK', w: 80, h: 50, sisi: 1, jenis: 'Gudang Distribusi Baja Ringan', taxType: 'PBB-P2 Industri & Pergudangan', potMin: 60, potMax: 180, formula: 'Luas Lahan × NJOP Kawasan Industri' },
        { name: 'PABRIK PENGOLAHAN DAN MANUFAKTUR', w: 100, h: 60, sisi: 1, jenis: 'Pabrik Pengolahan Sentra Produksi', taxType: 'PBB-P2 Industri', potMin: 80, potMax: 240, formula: 'NJOP Industri + Pajak Air Tanah (PAT)' }
    ],
    tmn: [
        { name: 'SENTRA KULINER & RESTORAN TERBUKA', w: 35, h: 20, sisi: 1, jenis: 'Sentra Kuliner Pujasera Modern', taxType: 'PBJT Makanan dan/atau Minuman', potMin: 30, potMax: 85, formula: 'Omzet Penjualan Konsumsi × Tarif PBJT 10%' },
        { name: 'HOTEL & RESORT PENGINAPAN', w: 45, h: 30, sisi: 1, jenis: 'Hotel Akomodasi Komersial', taxType: 'PBJT Jasa Perhotelan', potMin: 70, potMax: 210, formula: 'Kapasitas Kamar × Okupansi × Tarif PBJT 10%' }
    ]
};

const stages = [
    { stage: 1, status: 'Kandidat belum terdaftar', izinUsaha: 'Dalam Penelaahan', izinRek: 'Belum Terdaftar' },
    { stage: 2, status: 'Perlu pencocokan register', izinUsaha: 'Terverifikasi', izinRek: 'Dokumen tersedia' },
    { stage: 3, status: 'Tervalidasi (Perlu Update Tarif)', izinUsaha: 'Terverifikasi', izinRek: 'Izin Tayang Aktif' },
    { stage: 4, status: 'Penetapan SKPD/Surat Ketetapan', izinUsaha: 'Terverifikasi', izinRek: 'Izin Lengkap' },
    { stage: 5, status: 'Lunas / Terbit Validasi', izinUsaha: 'Terverifikasi', izinRek: 'Izin Lengkap' },
    { stage: 6, status: 'Audit Kepatuhan & Monitoring', izinUsaha: 'Terverifikasi', izinRek: 'Izin Lengkap' }
];

const newObjects = {};
const newCorridors = {};

cities.forEach((city, cityIdx) => {
    const lat = city.lat || -6.2;
    const lng = city.lng || 106.8;
    const cleanCityName = city.name.replace(/^(KAB\.|KOTA)\s+/i, '').trim();
    const citySlug = city.id;

    // 1. Generate Corridors & Checkpoints
    const street1 = streetNames[cityIdx % streetNames.length];
    const street2 = streetNames[(cityIdx + 3) % streetNames.length];
    const corridorId = `cor_${citySlug}`;

    // Corridor polyline ~ 1.5 km across city center
    const dLat = 0.008;
    const dLng = 0.012;
    const pathCoords = [
        [Number((lat - dLat).toFixed(6)), Number((lng - dLng).toFixed(6))],
        [Number((lat - dLat * 0.4).toFixed(6)), Number((lng - dLng * 0.3).toFixed(6))],
        [Number((lat + dLat * 0.2).toFixed(6)), Number((lng + dLng * 0.2).toFixed(6))],
        [Number((lat + dLat).toFixed(6)), Number((lng + dLng).toFixed(6))]
    ];

    const checkpoints = [
        {
            num: '01',
            title: `Simpang Masuk ${street1}`,
            note: 'Titik awal penyisiran koridor jalan protokol',
            lat: pathCoords[0][0],
            lng: pathCoords[0][1],
            status: 'done'
        },
        {
            num: '02',
            title: `Pusat Komersial & Pertokoan`,
            note: 'Zona reklame bando dan parkir ruko',
            lat: pathCoords[1][0],
            lng: pathCoords[1][1],
            status: 'done'
        },
        {
            num: '03',
            title: `Simpang ${street2}`,
            note: 'Zona videotron persimpangan jalan utama',
            lat: pathCoords[2][0],
            lng: pathCoords[2][1],
            status: 'pending'
        },
        {
            num: '04',
            title: `Ujung Koridor Perbatasan`,
            note: 'Pemeriksaan reklame batas wilayah',
            lat: pathCoords[3][0],
            lng: pathCoords[3][1],
            status: 'pending'
        }
    ];

    newCorridors[corridorId] = {
        id: corridorId,
        cityId: citySlug,
        name: `KORIDOR ${street1.toUpperCase()} (${cleanCityName})`,
        scope: `${street1} – ${street2}`,
        length: '1,8 km',
        time: 'Pagi – Siang (08:30 – 14:00)',
        status: 'Aktif Penyisiran',
        checkpoints: checkpoints,
        path: pathCoords
    };

    // 2. Generate 4 to 5 POI objects per city across diverse categories
    const catKeys = ['rek', 'pkr', 'mall', 'pab', 'tmn'];
    const numObjects = 4 + (cityIdx % 2); // 4 or 5 POIs per city

    for (let i = 0; i < numObjects; i++) {
        const catKey = catKeys[i % catKeys.length];
        const templates = catTemplates[catKey];
        const tmpl = templates[(cityIdx + i) % templates.length];
        const stageObj = stages[(cityIdx + i) % stages.length];
        const stName = streetNames[(cityIdx + i * 2) % streetNames.length];
        
        // Slight offset around city coordinates (±400m to 1.5km)
        const angle = (i / numObjects) * 2 * Math.PI + (cityIdx * 0.7);
        const radius = 0.005 + ((cityIdx + i) % 4) * 0.003;
        const objLat = Number((lat + Math.sin(angle) * radius).toFixed(6));
        const objLng = Number((lng + Math.cos(angle) * radius).toFixed(6));

        const objNum = String(i + 1).padStart(3, '0');
        // Fully unique key by using citySlug
        const objId = `OBJ-${catKey.toUpperCase()}-${citySlug.toUpperCase().replace(/[^A-Z0-9]/g, '_')}-${objNum}`;

        const potValJt = tmpl.potMin + ((cityIdx * 7 + i * 13) % (tmpl.potMax - tmpl.potMin + 1));
        const potValStr = potValJt >= 1000 
            ? `Rp ${(potValJt / 1000).toFixed(2).replace('.', ',')} M / tahun` 
            : `Rp ${potValJt}.000.000 / tahun`;

        const objName = `${tmpl.name} ${cleanCityName} ${i > 0 ? (i + 1) : ''}`.trim();
        const categoryMeta = categories.find(c => c.id === catKey) || categories[0];

        newObjects[objId] = {
            id: objId,
            name: objName,
            cityId: citySlug,
            category: catKey,
            catName: categoryMeta.label,
            lat: objLat,
            lng: objLng,
            owner: `PT ${cleanCityName} Sarana Komunika`,
            op: `Pengelola ${categoryMeta.label} ${cleanCityName}`,
            w: tmpl.w,
            h: tmpl.h,
            sisi: tmpl.sisi,
            jenis: tmpl.jenis,
            periode: '12 Bulan (Periode 2026/2027)',
            regStatus: stageObj.status,
            izinUsaha: stageObj.izinUsaha,
            izinRek: stageObj.izinRek,
            addr: `${stName} No. ${(i + 1) * 25}, ${cleanCityName}`,
            coord: `${objLat}, ${objLng}`,
            taxType: tmpl.taxType,
            estimatedValue: potValStr,
            potValJt: potValJt,
            formula: tmpl.formula,
            stage: stageObj.stage,
            requested: stageObj.stage >= 3,
            hist: [
                [
                    `0${(i % 6) + 1} Okt 2026`,
                    `Hasil penyisiran lapangan koridor ${street1}`,
                    `Tim Satgas PAD360 ${cleanCityName} · GPS ±3 m`
                ],
                [
                    `2${(i % 8) + 1} Sep 2026`,
                    `Pencatatan data titik koordinat & verifikasi visual`,
                    `Analis Pajak Daerah Bapenda`
                ]
            ],
            related: [
                {
                    id: objId,
                    title: `${tmpl.jenis} (${tmpl.w}×${tmpl.h}m)`,
                    type: tmpl.taxType,
                    badge: catKey === 'rek' ? 'teal' : catKey === 'pkr' ? 'amber' : catKey === 'mall' ? 'purple' : 'blue'
                }
            ]
        };
    }
});

// Update province and city totals
const cityObjMap = {};
Object.values(newObjects).forEach(obj => {
    if (!cityObjMap[obj.cityId]) cityObjMap[obj.cityId] = [];
    cityObjMap[obj.cityId].push(obj);
});

const updatedCities = cities.map(city => {
    const objs = cityObjMap[city.id] || [];
    const count = objs.length;
    const verCount = objs.filter(o => o.stage >= 3).length;
    const totalPotM = objs.reduce((sum, o) => sum + (o.potValJt || 50), 0) / 1000;
    return {
        ...city,
        poi: count,
        ver: verCount,
        pot: Number(totalPotM.toFixed(2))
    };
});

const provCityMap = {};
updatedCities.forEach(c => {
    const pId = c.provId || c.provinceId;
    if (!provCityMap[pId]) provCityMap[pId] = [];
    provCityMap[pId].push(c);
});

const updatedProvinces = provinces.map(prov => {
    const provCities = provCityMap[prov.id] || [];
    const totalPoi = provCities.reduce((s, c) => s + (c.poi || 0), 0);
    const totalVer = provCities.reduce((s, c) => s + (c.ver || 0), 0);
    const totalPot = provCities.reduce((s, c) => s + (c.pot || 0), 0);
    return {
        ...prov,
        poi: totalPoi,
        ver: totalVer,
        pot: Number(totalPot.toFixed(2))
    };
});

const fullDataset = {
    provinces: updatedProvinces,
    cities: updatedCities,
    categories: categories,
    corridors: newCorridors,
    objects: newObjects
};

// Write to potensi-data.json
fs.writeFileSync(srcPath, JSON.stringify(fullDataset, null, 2), 'utf8');

// Write to potensi-data.js (as window.PotensiData)
const jsPath = path.join(__dirname, '..', 'potensi-data.js');
const jsContent = `/* Dataset Peta Potensi Pajak PAD360 - Seluruh Indonesia */\nwindow.PotensiData = ${JSON.stringify(fullDataset, null, 2)};\n`;
fs.writeFileSync(jsPath, jsContent, 'utf8');

console.log('SUCCESS!');
console.log('Total Provinces:', updatedProvinces.length);
console.log('Total Cities:', updatedCities.length);
console.log('Total Corridors:', Object.keys(newCorridors).length);
console.log('Total Objects:', Object.keys(newObjects).length);
console.log('Avg Objects/City:', (Object.keys(newObjects).length / updatedCities.length).toFixed(2));
