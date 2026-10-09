const fs = require('fs');
const path = require('path');

// Robust RFC-4180 CSV Parser
function parseCSV(text) {
    const lines = [];
    let row = [];
    let inQuotes = false;
    let currentToken = '';

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentToken += '"';
                i++; // skip escaped quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(currentToken.trim());
            currentToken = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i++;
            }
            row.push(currentToken.trim());
            currentToken = '';
            if (row.length > 0 && row.some(col => col.length > 0)) {
                lines.push(row);
            }
            row = [];
        } else {
            currentToken += char;
        }
    }

    if (currentToken.length > 0 || row.length > 0) {
        row.push(currentToken.trim());
        if (row.some(col => col.length > 0)) {
            lines.push(row);
        }
    }

    if (lines.length < 2) return [];

    const headers = lines[0].map(h => h.trim().replace(/^\"|\"$/g, ''));
    const records = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = line[j] !== undefined ? line[j] : '';
        }
        records.push(obj);
    }

    return records;
}

// Bounding Box Bali:
// Lat: -8.05 to -8.95
// Lng: 114.40 to 115.75
function isInsideBali(lat, lng) {
    return lat >= -9.10 && lat <= -8.00 && lng >= 114.40 && lng <= 115.75;
}

function cleanLatitude(rawVal) {
    if (!rawVal) return null;
    let s = String(rawVal).trim().replace(/\"/g, '');
    
    // Replace Indonesian decimal comma if no other dot
    if (s.includes(',') && !s.includes('.')) {
        s = s.replace(',', '.');
    }

    const directFloat = parseFloat(s);
    if (!isNaN(directFloat) && directFloat >= -9.10 && directFloat <= -8.00) {
        return Number(directFloat.toFixed(7));
    }

    // Handle thousand separator corruptions (e.g. -83.487.304 -> -8.3487304 or -866.801 -> -8.66801)
    const digits = s.replace(/[^0-9]/g, '');
    if (!digits) return null;

    if (digits.startsWith('8')) {
        const decimals = digits.slice(1);
        const reconstructed = parseFloat('-8.' + decimals);
        if (!isNaN(reconstructed) && reconstructed >= -9.10 && reconstructed <= -8.00) {
            return Number(reconstructed.toFixed(7));
        }
    }

    return !isNaN(directFloat) ? Number(directFloat.toFixed(7)) : null;
}

function cleanLongitude(rawVal) {
    if (!rawVal) return null;
    let s = String(rawVal).trim().replace(/\"/g, '');

    if (s.includes(',') && !s.includes('.')) {
        s = s.replace(',', '.');
    }

    const directFloat = parseFloat(s);
    if (!isNaN(directFloat) && directFloat >= 114.40 && directFloat <= 115.75) {
        return Number(directFloat.toFixed(7));
    }

    // Handle thousand separator corruptions (e.g. 1.146.223.844 -> 114.6223844 or 1.152.026.214 -> 115.2026214)
    const digits = s.replace(/[^0-9]/g, '');
    if (!digits) return null;

    if (digits.startsWith('114') || digits.startsWith('115')) {
        const prefix = digits.slice(0, 3);
        const decimals = digits.slice(3);
        const reconstructed = parseFloat(prefix + '.' + decimals);
        if (!isNaN(reconstructed) && reconstructed >= 114.40 && reconstructed <= 115.75) {
            return Number(reconstructed.toFixed(7));
        }
    }

    return !isNaN(directFloat) ? Number(directFloat.toFixed(7)) : null;
}

function cleanText(str) {
    if (!str) return '';
    return str.replace(/[\uE000-\uF8FF]/g, '').trim();
}

function extractStreet(address) {
    if (!address) return '';
    // Look for Jl. or Jalan pattern
    const m = address.match(/(?:Jl\.|Jalan)\s+([A-Za-z0-9\.\s]+?)(?:,|\s+No\.|\s+Gg\.|\s+Kec\.|\s+Kel\.|\s+RT|\s+Banjar|$)/i);
    if (m && m[1]) {
        let st = m[1].trim();
        // Remove trailing numbers or artifacts
        st = st.replace(/\s+\d+.*$/, '').trim();
        return 'Jl. ' + st;
    }
    return '';
}

function detectRegency(text) {
    const s = text.toLowerCase();
    if (s.includes('denpasar')) return 'Kota Denpasar';
    if (s.includes('badung') || s.includes('kuta') || s.includes('canggu') || s.includes('jimbaran') || s.includes('nusa dua') || s.includes('mengwi') || s.includes('abiansemal') || s.includes('tibubeneng') || s.includes('legian') || s.includes('seminyak') || s.includes('kerobokan')) return 'Kabupaten Badung';
    if (s.includes('gianyar') || s.includes('ubud') || s.includes('sukawati') || s.includes('tegallalang')) return 'Kabupaten Gianyar';
    if (s.includes('tabanan') || s.includes('kediri') || s.includes('selemadeg') || s.includes('baturiti') || s.includes('tanah lot') || s.includes('bedugul')) return 'Kabupaten Tabanan';
    if (s.includes('jembrana') || s.includes('negara') || s.includes('melaya') || s.includes('dauhwaru') || s.includes('pehutatan')) return 'Kabupaten Jembrana';
    if (s.includes('buleleng') || s.includes('singaraja') || s.includes('seririt')) return 'Kabupaten Buleleng';
    if (s.includes('karangasem') || s.includes('amlapura')) return 'Kabupaten Karangasem';
    if (s.includes('klungkung') || s.includes('semarapura') || s.includes('nusa penida')) return 'Kabupaten Klungkung';
    if (s.includes('bangli') || s.includes('kintamani')) return 'Kabupaten Bangli';
    return 'Lainnya / Tidak Terdefinisi';
}

const csvDir = path.join(__dirname, '..', 'data-tabel', 'csv');
const jsonDir = path.join(__dirname, '..', 'data-tabel', 'json');

if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
}

const fileMap = [
    {
        csv: 'Data_Parkiran_Bali.xlsx - Parkiran Bali.csv',
        json: 'data_parkiran_bali.json',
        categoryTag: 'parkiran',
        taxType: 'PBJT Jasa Parkir',
        tagCode: 'PKR',
        color: '#d97706'
    },
    {
        csv: 'Data_Reklame_Bali.xlsx - Reklame.csv',
        json: 'data_reklame_bali.json',
        categoryTag: 'reklame',
        taxType: 'Pajak Reklame',
        tagCode: 'REK',
        color: '#0E9E9A'
    },
    {
        csv: 'Data_Videotron_bali.xlsx - Worksheet.csv',
        json: 'data_videotron_bali.json',
        categoryTag: 'videotron',
        taxType: 'Pajak Reklame Elektronik',
        tagCode: 'VDO',
        color: '#2563eb'
    },
    {
        csv: 'Hasil_Billboard_bali.xlsx - Worksheet.csv',
        json: 'hasil_billboard_bali.json',
        categoryTag: 'billboard',
        taxType: 'Pajak Reklame Papan/Billboard',
        tagCode: 'BLB',
        color: '#7c3aed'
    }
];

const allCleanDenpasar = [];

fileMap.forEach(({ csv, json, categoryTag, taxType, tagCode, color }) => {
    const csvPath = path.join(csvDir, csv);
    if (!fs.existsSync(csvPath)) {
        console.warn(`File not found: ${csvPath}`);
        return;
    }

    const rawContent = fs.readFileSync(csvPath, 'utf8');
    const rows = parseCSV(rawContent);

    const validRecords = [];
    const excludedNoise = [];

    rows.forEach((r, idx) => {
        const lat = cleanLatitude(r.Latitude);
        const lng = cleanLongitude(r.Longitude);
        const addr = cleanText(r.Fulladdress);
        const name = cleanText(r.Name);
        const regency = detectRegency(addr + ' ' + (r.Province || '') + ' ' + name);
        const street = extractStreet(addr);

        // Check if item is inside Bali
        const isBaliLocation = lat && lng && isInsideBali(lat, lng) && !addr.toLowerCase().includes('jakarta') && !addr.toLowerCase().includes('jawa barat') && !addr.toLowerCase().includes('jawa tengah') && !addr.toLowerCase().includes('jawa timur') && !addr.toLowerCase().includes('morowali') && !addr.toLowerCase().includes('payakumbuh');

        const record = {
            id: `${categoryTag}_${String(idx + 1).padStart(3, '0')}`,
            name: name,
            category: r.Categories || categoryTag,
            tag: categoryTag,
            tagCode: tagCode,
            taxType: taxType,
            color: color,
            address: addr,
            street: street,
            phone: cleanText(r.Phones),
            email: cleanText(r.Email),
            latitude: lat,
            longitude: lng,
            regency: regency,
            isBali: Boolean(isBaliLocation),
            rawLat: r.Latitude,
            rawLng: r.Longitude
        };

        if (isBaliLocation) {
            validRecords.push(record);
            if (regency === 'Kota Denpasar') {
                allCleanDenpasar.push(record);
            }
        } else {
            excludedNoise.push(record);
        }
    });

    const targetJson = path.join(jsonDir, json);
    fs.writeFileSync(targetJson, JSON.stringify(validRecords, null, 2), 'utf8');
    console.log(`[SUCCESS] ${csv} -> ${json}: ${validRecords.length} records valid di Bali (Excluded: ${excludedNoise.length} noise non-Bali).`);
});

// Also create consolidated Denpasar file
const denpasarJson = path.join(jsonDir, 'data_denpasar_all.json');
fs.writeFileSync(denpasarJson, JSON.stringify(allCleanDenpasar, null, 2), 'utf8');
console.log(`\n[SUMMARY] Total titik valid di Kota Denpasar: ${allCleanDenpasar.length} titik POI tersimpan di data_denpasar_all.json!`);
