/* ============================================================
   Portal Data Kabupaten & Kota — Profil Wilayah Controller (profil.js)
   Pure Sans-Serif typography, Indonesian Merah-Putih color palette,
   and clean professional UI without emojis.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    if (typeof REGION_DATA === 'undefined' || !Array.isArray(REGION_DATA) || REGION_DATA.length === 0) {
        console.error('REGION_DATA is missing or not loaded.');
        return;
    }

    // 1. Get current region from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get('id');
    const targetSlug = urlParams.get('slug');

    let region = null;
    if (targetId) {
        region = REGION_DATA.find(r => String(r.id) === String(targetId));
    }
    if (!region && targetSlug) {
        region = REGION_DATA.find(r => r.slug === targetSlug);
    }
    if (!region) {
        region = REGION_DATA[0];
    }

    const isKota = (region.kabkota || '').toUpperCase().startsWith('KOTA');

    // Update document title
    document.title = `${region.kabkota || 'Wilayah'} — Profil Data & Statistik Resmi`;

    // 2. Setup Custom Searchable & Filterable Region Picker
    setupCustomRegionPicker(region);

    // 3. Render Hero Header
    const heroProv = document.getElementById('heroProv');
    const heroName = document.getElementById('heroName');
    const heroTypeBadge = document.getElementById('heroTypeBadge');
    const heroChips = document.getElementById('heroChips');
    const heroMeterFill = document.getElementById('heroMeterFill');
    const heroMeterLabel = document.getElementById('heroMeterLabel');
    const topnavMeta = document.getElementById('topnavMeta');
    const footerId = document.getElementById('footerId');

    if (heroProv) heroProv.textContent = `PROVINSI ${region.prov || 'INDONESIA'}`;
    if (heroName) heroName.textContent = region.kabkota || 'Kabupaten/Kota';
    if (heroTypeBadge) {
        heroTypeBadge.textContent = isKota ? 'KOTA OTONOM' : 'KABUPATEN';
        if (isKota) heroTypeBadge.classList.add('kota');
    }

    const completeness = region.completeness || calculateCompleteness(region);
    if (heroMeterFill) heroMeterFill.style.width = `${completeness}%`;
    if (heroMeterLabel) heroMeterLabel.innerHTML = `Kelengkapan Data BPS: <b>${completeness}%</b>`;

    if (topnavMeta) {
        topnavMeta.innerHTML = `<span class="chip">No. Urut BPS <b>#${region.id || region.no || '1'}</b></span>`;
    }

    if (footerId) {
        footerId.textContent = `Kode Ref #${region.id || region.no || '1'} • ${region.slug || ''}`;
    }

    if (heroChips) {
        const chipsHtml = [];
        if (region.penduduk) {
            chipsHtml.push(`<span class="chip merah"><b>${formatNumber(region.penduduk)}</b> Jiwa</span>`);
        }
        if (region.luas) {
            chipsHtml.push(`<span class="chip"><b>${formatNumber(Math.round(region.luas))}</b> km²</span>`);
        }
        if (region.kecamatan) {
            chipsHtml.push(`<span class="chip"><b>${formatNumber(region.kecamatan)}</b> Kecamatan</span>`);
        }
        if (region.total_desa || region.desa_kel) {
            chipsHtml.push(`<span class="chip"><b>${formatNumber(region.total_desa || region.desa_kel)}</b> Desa/Kelurahan</span>`);
        }
        if (region.ipm_total) {
            chipsHtml.push(`<span class="chip teal">IPM <b>${region.ipm_total.toFixed(2)}</b></span>`);
        }
        heroChips.innerHTML = chipsHtml.join('');
    }

    // 4. Mini Map in Hero
    const heroMapEl = document.getElementById('heroMap');
    const heroCoord = document.getElementById('heroCoord');
    if (heroMapEl && typeof region.lat === 'number' && typeof region.lng === 'number') {
        if (heroCoord) {
            heroCoord.textContent = `${region.lat.toFixed(4)}°, ${region.lng.toFixed(4)}°`;
        }

        const miniMap = L.map('heroMap', {
            center: [region.lat, region.lng],
            zoom: 9,
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false
        });

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap',
            maxZoom: 19
        }).addTo(miniMap);

        L.circleMarker([region.lat, region.lng], {
            radius: 8,
            fillColor: '#cf1e2e',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.95
        }).addTo(miniMap);
    }

    // 5. Build Main Content
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    let html = '';

    // ==========================================
    // SECTION 1: Wilayah & Karakteristik Geografis
    // ==========================================
    const totalTopo = (Number(region.dataran) || 0) + (Number(region.lembah) || 0) + (Number(region.lereng) || 0) + (Number(region.puncak) || 0);
    const pctDataran = totalTopo > 0 ? (((Number(region.dataran) || 0) / totalTopo) * 100).toFixed(1) : 0;
    const pctLembah = totalTopo > 0 ? (((Number(region.lembah) || 0) / totalTopo) * 100).toFixed(1) : 0;
    const pctLereng = totalTopo > 0 ? (((Number(region.lereng) || 0) / totalTopo) * 100).toFixed(1) : 0;
    const pctPuncak = totalTopo > 0 ? (((Number(region.puncak) || 0) / totalTopo) * 100).toFixed(1) : 0;

    html += `
    <section class="content-card" id="sec-geografi">
        <div class="card-head">
            <h2>Wilayah &amp; Karakteristik Geografis</h2>
            <span class="subtitle">Batas Wilayah Administratif &amp; Topografi Daerah</span>
        </div>

        <!-- 4 Key Geography Boxes -->
        <div class="data-grid-4">
            <div class="data-box">
                <span class="num">${region.luas ? formatNumber(region.luas) : '<span class="na">–</span>'}</span>
                <span class="label">Luas Wilayah Total</span>
                <span class="unit">km² daratan</span>
            </div>
            <div class="data-box">
                <span class="num">${region.kepadatan ? formatNumber(Math.round(region.kepadatan)) : '<span class="na">–</span>'}</span>
                <span class="label">Kepadatan Penduduk</span>
                <span class="unit">jiwa per km²</span>
            </div>
            <div class="data-box">
                <span class="num">${region.elevasi !== null && region.elevasi !== undefined ? formatNumber(region.elevasi) : '<span class="na">–</span>'}</span>
                <span class="label">Ketinggian Rata-Rata</span>
                <span class="unit">mdpl (elevasi)</span>
            </div>
            <div class="data-box">
                <span class="num">${region.curah_hujan !== null && region.curah_hujan !== undefined ? Number(region.curah_hujan).toFixed(1) : '<span class="na">–</span>'}</span>
                <span class="label">Rata-Rata Curah Hujan</span>
                <span class="unit">mm per tahun</span>
            </div>
        </div>

        <!-- Clear 2x2 Geographical Boundaries -->
        <div style="margin-bottom: 12px; font-size: 13px; font-weight: 700; color: var(--text-hi);">Batas Wilayah Administratif</div>
        <div class="borders-grid">
            <div class="border-card">
                <span class="border-tag">UTARA</span>
                <div class="border-content">
                    <b>Batas Utara</b>
                    <span>${escapeHtml(region.batas_utara || 'Tidak terdata')}</span>
                </div>
            </div>
            <div class="border-card">
                <span class="border-tag">SELATAN</span>
                <div class="border-content">
                    <b>Batas Selatan</b>
                    <span>${escapeHtml(region.batas_selatan || 'Tidak terdata')}</span>
                </div>
            </div>
            <div class="border-card">
                <span class="border-tag">TIMUR</span>
                <div class="border-content">
                    <b>Batas Timur</b>
                    <span>${escapeHtml(region.batas_timur || 'Tidak terdata')}</span>
                </div>
            </div>
            <div class="border-card">
                <span class="border-tag">BARAT</span>
                <div class="border-content">
                    <b>Batas Barat</b>
                    <span>${escapeHtml(region.batas_barat || 'Tidak terdata')}</span>
                </div>
            </div>
        </div>

        <!-- Topography Distribution -->
        ${totalTopo > 0 ? `
            <div style="margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--line);">
                <div style="font-size: 13px; font-weight: 700; color: var(--text-hi); margin-bottom: 8px;">
                    Distribusi Topografi Desa (${totalTopo} Desa/Kelurahan Terdata)
                </div>
                <div class="topo-grid">
                    <div class="topo-item">
                        <div class="t-val">${formatNumber(region.dataran || 0)}</div>
                        <div class="t-lbl">Dataran (${pctDataran}%)</div>
                    </div>
                    <div class="topo-item">
                        <div class="t-val">${formatNumber(region.lereng || 0)}</div>
                        <div class="t-lbl">Lereng (${pctLereng}%)</div>
                    </div>
                    <div class="topo-item">
                        <div class="t-val">${formatNumber(region.lembah || 0)}</div>
                        <div class="t-lbl">Lembah (${pctLembah}%)</div>
                    </div>
                    <div class="topo-item">
                        <div class="t-val">${formatNumber(region.puncak || 0)}</div>
                        <div class="t-lbl">Puncak (${pctPuncak}%)</div>
                    </div>
                </div>
            </div>
        ` : ''}
    </section>
    `;

    // ==========================================
    // SECTION 2: Pemerintahan & Politik
    // ==========================================
    const kepalaInitials = getInitials(region.kepala || 'Kepala Daerah');
    const wakilInitials = getInitials(region.wakil || 'Wakil Kepala');

    const parties = [
        { key: 'p_golkar', name: 'Partai Golkar', color: '#e6ac4a' },
        { key: 'p_gerindra', name: 'Partai Gerindra', color: '#dc2626' },
        { key: 'p_pdip', name: 'PDI Perjuangan', color: '#ef4444' },
        { key: 'p_pkb', name: 'PKB', color: '#10b981' },
        { key: 'p_nasdem', name: 'Partai NasDem', color: '#2563eb' },
        { key: 'p_demokrat', name: 'Partai Demokrat', color: '#3b82f6' },
        { key: 'p_pks', name: 'PKS', color: '#f97316' },
        { key: 'p_ppp_pan', name: 'PPP / PAN', color: '#06b6d4' },
        { key: 'p_hanura', name: 'Partai Hanura', color: '#ec4899' },
        { key: 'p_pbb', name: 'PBB', color: '#14b8a6' }
    ].map(p => ({
        ...p,
        seats: region[p.key] !== null && region[p.key] !== undefined ? Number(region[p.key]) : 0
    })).filter(p => p.seats > 0);

    const totalSeats = parties.reduce((acc, cur) => acc + cur.seats, 0);
    const maxSeat = Math.max(...parties.map(p => p.seats), 1);

    html += `
    <section class="content-card" id="sec-pemerintahan">
        <div class="card-head">
            <h2>Pemerintahan &amp; Parlemen Daerah</h2>
            <span class="subtitle">Pimpinan Eksekutif, Wilayah Administrasi &amp; Kursi DPRD</span>
        </div>

        <!-- Leadership Row -->
        <div class="leaders-row">
            <div class="leader-card">
                <div class="leader-avatar">${kepalaInitials}</div>
                <div class="leader-info">
                    <b>${escapeHtml(region.kepala || 'Nama Belum Terdata')}</b>
                    <small>${isKota ? 'Walikota' : 'Bupati'} (${region.kabkota || ''})</small>
                </div>
            </div>
            ${region.wakil ? `
                <div class="leader-card">
                    <div class="leader-avatar" style="background: linear-gradient(135deg, var(--tan-light), var(--tan)); color: #5c3e16;">${wakilInitials}</div>
                    <div class="leader-info">
                        <b>${escapeHtml(region.wakil)}</b>
                        <small>${isKota ? 'Wakil Walikota' : 'Wakil Bupati'}</small>
                    </div>
                </div>
            ` : `
                <div class="leader-card" style="opacity: 0.7;">
                    <div class="leader-avatar" style="background: var(--cream-200); color: var(--text-low);">-</div>
                    <div class="leader-info">
                        <b>Wakil Kepala Daerah</b>
                        <small>Data belum terlampir</small>
                    </div>
                </div>
            `}
        </div>

        <!-- Administrative Structure -->
        <div class="data-grid-4">
            <div class="data-box">
                <span class="num">${region.kecamatan ? formatNumber(region.kecamatan) : '<span class="na">–</span>'}</span>
                <span class="label">Jumlah Kecamatan</span>
                <span class="unit">wilayah camat</span>
            </div>
            <div class="data-box">
                <span class="num">${region.desa_kel || region.total_desa ? formatNumber(region.desa_kel || region.total_desa) : '<span class="na">–</span>'}</span>
                <span class="label">Desa &amp; Kelurahan</span>
                <span class="unit">desa otonom</span>
            </div>
            <div class="data-box">
                <span class="num">${region.keluarga ? formatNumber(region.keluarga) : '<span class="na">–</span>'}</span>
                <span class="label">Total Rumah Tangga</span>
                <span class="unit">kartu keluarga</span>
            </div>
            <div class="data-box">
                <span class="num">${region.penduduk_per_keluarga ? Number(region.penduduk_per_keluarga).toFixed(2) : '<span class="na">–</span>'}</span>
                <span class="label">Ukuran Keluarga</span>
                <span class="unit">jiwa / keluarga</span>
            </div>
        </div>

        <!-- DPRD Parliament Table -->
        ${parties.length > 0 ? `
            <div style="margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--line);">
                <div style="font-size: 13px; font-weight: 700; color: var(--text-hi); margin-bottom: 12px;">
                    Komposisi Perwakilan Rakyat / DPRD Daerah (${totalSeats} Kursi Terdata)
                </div>
                <table class="dprd-table">
                    ${parties.map(p => `
                        <tr>
                            <td style="width: 170px; font-weight: 600;">${escapeHtml(p.name)}</td>
                            <td>
                                <div class="dprd-bar-track">
                                    <div class="dprd-bar-fill" style="width: ${(p.seats / maxSeat) * 100}%; background: ${p.color};"></div>
                                </div>
                            </td>
                            <td style="width: 80px; text-align: right; font-weight: 700;">${p.seats} kursi</td>
                            <td style="width: 60px; text-align: right; color: var(--text-mid); font-size: 12px;">${((p.seats / totalSeats) * 100).toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        ` : ''}
    </section>
    `;

    // ==========================================
    // SECTION 3: Kependudukan & IPM
    // ==========================================
    const pLaki = Number(region.pddk_laki) || 0;
    const pWanita = Number(region.pddk_wanita) || 0;
    const totalGender = pLaki + pWanita;
    const pctLaki = totalGender > 0 ? ((pLaki / totalGender) * 100).toFixed(1) : 50;
    const pctWanita = totalGender > 0 ? ((pWanita / totalGender) * 100).toFixed(1) : 50;

    // Age groups
    const ageKeys = [
        { k: 'u04', l: '0-4' }, { k: 'u59', l: '5-9' }, { k: 'u1014', l: '10-14' },
        { k: 'u1519', l: '15-19' }, { k: 'u2024', l: '20-24' }, { k: 'u2529', l: '25-29' },
        { k: 'u3034', l: '30-34' }, { k: 'u3539', l: '35-39' }, { k: 'u4044', l: '40-44' },
        { k: 'u4549', l: '45-49' }, { k: 'u5054', l: '50-54' }, { k: 'u5559', l: '55-59' },
        { k: 'u6064', l: '60-64' }, { k: 'u6569', l: '65-69' }, { k: 'u7074', l: '70-74' },
        { k: 'u75p', l: '75+' }
    ];

    const ageData = ageKeys.map(a => ({
        label: a.l,
        value: region[a.k] !== null && region[a.k] !== undefined ? Number(region[a.k]) : 0
    }));
    const maxAgeVal = Math.max(...ageData.map(a => a.value), 1);
    const hasAgeData = ageData.some(a => a.value > 0);

    // Workforce stats
    const angkatanKerja = Number(region.angkatan_kerja) || 0;
    const bekerja = Number(region.bekerja) || 0;
    const pengangguran = Number(region.pengangguran) || 0;
    const pctBekerja = angkatanKerja > 0 ? ((bekerja / angkatanKerja) * 100).toFixed(1) : 0;
    const pctPengangguran = angkatanKerja > 0 ? ((pengangguran / angkatanKerja) * 100).toFixed(1) : 0;

    // IPM Score classification
    const ipm = region.ipm_total !== null && region.ipm_total !== undefined ? Number(region.ipm_total) : null;
    let ipmClass = '–';
    let ipmDesc = 'Mengukur standar hidup layak, pendidikan, dan kesehatan penduduk.';
    let ipmGaugeAngle = 0;
    if (ipm !== null) {
        if (ipm >= 80) ipmClass = 'Sangat Tinggi (≥ 80.0)';
        else if (ipm >= 70) ipmClass = 'Tinggi (70.0 – 79.9)';
        else if (ipm >= 60) ipmClass = 'Sedang (60.0 – 69.9)';
        else ipmClass = 'Rendah (< 60.0)';

        const normalized = Math.max(0, Math.min(1, (ipm - 50) / 45));
        ipmGaugeAngle = normalized * 260;
    }

    html += `
    <section class="content-card" id="sec-demografi">
        <div class="card-head">
            <h2>Kependudukan &amp; Indeks Manusia</h2>
            <span class="subtitle">Proporsi Demografi, Kelompok Umur, IPM &amp; Ketenagakerjaan</span>
        </div>

        <!-- IPM Spotlight Gauge -->
        <div class="ipm-spotlight-card">
            <svg class="ipm-gauge-circle" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(140, 120, 100, 0.15)" stroke-width="8"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="url(#ipmGrad)" stroke-width="8"
                    stroke-dasharray="251.2"
                    stroke-dashoffset="${251.2 - (ipmGaugeAngle / 360) * 251.2}"
                    stroke-linecap="round"
                    transform="rotate(-90 50 50)"/>
                <defs>
                    <linearGradient id="ipmGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#b0804b"/>
                        <stop offset="100%" stop-color="#cf1e2e"/>
                    </linearGradient>
                </defs>
            </svg>
            <div>
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-low);">Indeks Pembangunan Manusia (IPM)</span>
                <div class="ipm-score">${ipm !== null ? ipm.toFixed(2) : '–'}</div>
                <div class="ipm-category">Status Capaian: ${ipmClass}</div>
                <div style="font-size: 11.5px; color: var(--text-mid); margin-top: 2px;">${ipmDesc}</div>
            </div>
        </div>

        <div class="demo-layout">
            <!-- Left: Gender & Age -->
            <div>
                <div style="font-size: 13px; font-weight: 700; color: var(--text-hi); margin-bottom: 6px;">Proporsi Jenis Kelamin Penduduk</div>
                ${totalGender > 0 ? `
                    <div class="gender-bar">
                        <div class="m" style="width: ${pctLaki}%;">Laki-laki ${pctLaki}%</div>
                        <div class="f" style="width: ${pctWanita}%;">Perempuan ${pctWanita}%</div>
                    </div>
                    <div class="gender-caption">
                        <span><b>${formatNumber(pLaki)}</b> Laki-laki</span>
                        <span><b>${formatNumber(pWanita)}</b> Perempuan</span>
                    </div>
                ` : '<div class="na">Data rincian gender belum tersedia</div>'}

                ${hasAgeData ? `
                    <div style="margin-top: 22px;">
                        <div style="font-size: 12.5px; font-weight: 700; color: var(--text-hi); margin-bottom: 10px;">Distribusi Kelompok Umur (Tahun)</div>
                        <svg class="age-chart" viewBox="0 0 420 115" style="width: 100%; height: auto;">
                            ${ageData.map((d, idx) => {
                                const barW = 20;
                                const gap = 6;
                                const x = idx * (barW + gap) + 4;
                                const barH = Math.max(2, (d.value / maxAgeVal) * 80);
                                const y = 92 - barH;
                                return `
                                    <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="3" fill="url(#ageGrad)"/>
                                    <text x="${x + barW/2}" y="108" text-anchor="middle" font-size="8.5" fill="#525c6e">${d.label}</text>
                                `;
                            }).join('')}
                            <defs>
                                <linearGradient id="ageGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="#3b82b8"/>
                                    <stop offset="100%" stop-color="#cf1e2e"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                ` : ''}
            </div>

            <!-- Right: Workforce -->
            <div>
                <div style="font-size: 13px; font-weight: 700; color: var(--text-hi); margin-bottom: 10px;">Status Angkatan Kerja &amp; Lapangan Usaha</div>
                ${angkatanKerja > 0 ? `
                    <div class="data-box" style="margin-bottom: 14px;">
                        <span class="num">${formatNumber(angkatanKerja)}</span>
                        <span class="label">Total Angkatan Kerja</span>
                        <span class="unit">jiwa usia produktif</span>
                    </div>

                    <div style="margin-bottom: 6px; font-size: 12px; color: var(--text-mid); font-weight: 600;">Tingkat Kesempatan Kerja vs Pengangguran</div>
                    <div style="display:flex; height: 16px; border-radius: 8px; overflow: hidden; margin-bottom: 8px;">
                        <div style="width: ${pctBekerja}%; background: #3b82b8;" title="Bekerja: ${pctBekerja}%"></div>
                        <div style="width: ${pctPengangguran}%; background: #cf1e2e;" title="Pengangguran: ${pctPengangguran}%"></div>
                    </div>
                    <div class="gender-caption" style="margin-bottom: 16px;">
                        <span style="color: #2b6a98;">Bekerja: <b>${formatShortNumber(bekerja)}</b> (${pctBekerja}%)</span>
                        <span style="color: #cf1e2e;">Pengangguran: <b>${formatShortNumber(pengangguran)}</b> (${pctPengangguran}%)</span>
                    </div>
                ` : '<div class="na">Data ketenagakerjaan belum tersedia</div>'}
            </div>
        </div>
    </section>
    `;

    // ==========================================
    // SECTION 4: Perekonomian & Sektoral
    // ==========================================
    const sectors = [
        { key: 'sek_a_pertanian', name: 'Pertanian, Kehutanan & Perikanan' },
        { key: 'sek_b_tambang', name: 'Pertambangan & Penggalian' },
        { key: 'sek_c_industri', name: 'Industri Pengolahan' },
        { key: 'sek_d_listrik', name: 'Pengadaan Listrik & Gas' },
        { key: 'sek_e_air', name: 'Pengadaan Air, Sampah & Daur Ulang' },
        { key: 'sek_f_konstruksi', name: 'Konstruksi' },
        { key: 'sek_g_dagang', name: 'Perdagangan Besar & Eceran' },
        { key: 'sek_h_transport', name: 'Transportasi & Pergudangan' },
        { key: 'sek_i_akomodasi', name: 'Penyediaan Akomodasi & Makan Minum' },
        { key: 'sek_j_infokom', name: 'Informasi & Komunikasi' },
        { key: 'sek_k_keuangan', name: 'Jasa Keuangan & Asuransi' },
        { key: 'sek_l_realestate', name: 'Real Estat' },
        { key: 'sek_mn_jasaperusahaan', name: 'Jasa Perusahaan' },
        { key: 'sek_o_admpem', name: 'Administrasi Pemerintahan & Jamsos' },
        { key: 'sek_p_pendidikan', name: 'Jasa Pendidikan' },
        { key: 'sek_q_kesehatan', name: 'Jasa Kesehatan & Kegiatan Sosial' },
        { key: 'sek_rstu_jasalain', name: 'Jasa Lainnya' }
    ].map(s => ({
        ...s,
        val: region[s.key] !== null && region[s.key] !== undefined ? Number(region[s.key]) : 0
    })).filter(s => s.val > 0);

    const totalSectorPdrb = sectors.reduce((acc, cur) => acc + cur.val, 0);
    sectors.sort((a, b) => b.val - a.val);

    const growth = region.pertumbuhan_ekonomi !== null && region.pertumbuhan_ekonomi !== undefined ? Number(region.pertumbuhan_ekonomi) : null;

    html += `
    <section class="content-card" id="sec-ekonomi">
        <div class="card-head">
            <h2>Perekonomian &amp; Struktur Sektoral</h2>
            <span class="subtitle">Produk Domestik Regional Bruto (PDRB), Garis Kemiskinan &amp; Sektor Unggulan</span>
        </div>

        <!-- 5 Key Economic Stats -->
        <div class="data-grid-4" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
            <div class="data-box">
                <span class="num">${region.pdrb_total ? formatPdrb(region.pdrb_total) : '<span class="na">–</span>'}</span>
                <span class="label">PDRB Total (ADHB)</span>
                <span class="unit">nilai ekonomi bruto</span>
            </div>
            <div class="data-box">
                <span class="num">${region.pdrb_perkapita ? 'Rp ' + Number(region.pdrb_perkapita).toFixed(2) + ' Jt' : '<span class="na">–</span>'}</span>
                <span class="label">PDRB Per Kapita</span>
                <span class="unit">pendapatan per tahun</span>
            </div>
            <div class="data-box">
                <span class="num">
                    ${growth !== null ? growth.toFixed(2) + '%' : '<span class="na">–</span>'}
                    ${growth !== null ? `
                        <span style="font-size: 13px; color: ${growth >= 0 ? 'var(--green)' : 'var(--coral)'}; font-weight: 700;">
                            ${growth >= 0 ? '[Naik]' : '[Turun]'}
                        </span>
                    ` : ''}
                </span>
                <span class="label">Pertumbuhan Ekonomi</span>
                <span class="unit">laju pertumbuhan tahunan</span>
            </div>
            <div class="data-box">
                <span class="num" style="color: var(--merah);">${region.persentase_miskin !== null && region.persentase_miskin !== undefined ? Number(region.persentase_miskin).toFixed(2) + '%' : '<span class="na">–</span>'}</span>
                <span class="label">Tingkat Kemiskinan</span>
                <span class="unit">penduduk pra-sejahtera</span>
            </div>
            <div class="data-box">
                <span class="num">${region.garis_kemiskinan ? 'Rp ' + formatNumber(Math.round(region.garis_kemiskinan)) : '<span class="na">–</span>'}</span>
                <span class="label">Garis Kemiskinan</span>
                <span class="unit">Rp / kapita / bulan</span>
            </div>
        </div>

        <!-- Top Contributing Sectors Table -->
        ${sectors.length > 0 ? `
            <div style="margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--line);">
                <div style="font-size: 13px; font-weight: 700; color: var(--text-hi); margin-bottom: 12px;">
                    10 Sektor Ekonomi PDRB Penyumbang Terbesar Daerah
                </div>
                <div>
                    ${sectors.slice(0, 10).map((sec, idx) => {
                        const pct = totalSectorPdrb > 0 ? ((sec.val / totalSectorPdrb) * 100).toFixed(1) : '0';
                        const maxSec = sectors[0].val;
                        return `
                            <div class="sector-row">
                                <span class="rank">#${idx + 1}</span>
                                <span style="font-weight: 600; color: var(--text-hi);">${escapeHtml(sec.name)}</span>
                                <div class="bar-track">
                                    <div class="bar-fill" style="width: ${(sec.val / maxSec) * 100}%;"></div>
                                </div>
                                <span class="pct">${pct}%</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : ''}
    </section>
    `;

    mainContent.innerHTML = html;

    // Initialize Sticky Navigation ScrollSpy & Click Synchronization
    setupStickyNav();
});

// Sticky Navigation ScrollSpy & Smooth Scroll Sync
function setupStickyNav() {
    const tabLinks = document.querySelectorAll('.sec-tab-link');
    const sections = document.querySelectorAll('section.content-card[id]');

    if (tabLinks.length === 0 || sections.length === 0) return;

    let isManualScrolling = false;

    function setActiveTab(targetId) {
        tabLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === targetId || href === `#${targetId.replace(/^#/, '')}`) {
                link.classList.add('active');
                // Scroll tab bar horizontally if needed
                try {
                    link.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                } catch (err) {}
            } else {
                link.classList.remove('active');
            }
        });
    }

    // 1. Tab Click Event Listener (Smooth Scroll with Sticky Header Offset)
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            if (!targetId || !targetId.startsWith('#')) return;

            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                isManualScrolling = true;
                setActiveTab(targetId);
                try {
                    history.pushState(null, null, targetId);
                } catch (err) {}

                // Offset 75px for sticky navigation bar height
                const targetTop = targetSection.getBoundingClientRect().top + window.scrollY - 75;
                window.scrollTo({
                    top: targetTop,
                    behavior: 'smooth'
                });

                setTimeout(() => {
                    isManualScrolling = false;
                }, 750);
            }
        });
    });

    // 2. ScrollSpy Listener (Sync active tab with visible viewport section)
    function onScrollSpy() {
        if (isManualScrolling) return;

        // Check if user has scrolled to the bottom of the page
        const isAtBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 50);
        if (isAtBottom && sections.length > 0) {
            setActiveTab(`#${sections[sections.length - 1].id}`);
            return;
        }

        // Use getBoundingClientRect().top relative to viewport (offset 160px for sticky nav bar)
        const navThreshold = 160;
        let currentSecId = null;

        sections.forEach(sec => {
            const rect = sec.getBoundingClientRect();
            if (rect.top <= navThreshold) {
                currentSecId = `#${sec.id}`;
            }
        });

        // Fallback to first section if at top of page
        if (!currentSecId && sections.length > 0) {
            currentSecId = `#${sections[0].id}`;
        }

        if (currentSecId) {
            setActiveTab(currentSecId);
        }
    }

    window.addEventListener('scroll', onScrollSpy, { passive: true });
    // Trigger initial check
    onScrollSpy();

    // 3. Initial check for direct URL hash navigation (e.g. #sec-demografi)
    if (window.location.hash) {
        const hashSection = document.querySelector(window.location.hash);
        if (hashSection) {
            setActiveTab(window.location.hash);
            setTimeout(() => {
                const targetTop = hashSection.getBoundingClientRect().top + window.scrollY - 75;
                window.scrollTo({ top: targetTop, behavior: 'smooth' });
            }, 250);
        }
    }
}

// Helper utilities
function calculateCompleteness(d) {
    const keys = Object.keys(d);
    if (keys.length === 0) return 100;
    const filled = keys.filter(k => d[k] !== null && d[k] !== undefined && d[k] !== '').length;
    return Math.round((filled / keys.length) * 100);
}

function getInitials(name) {
    if (!name) return 'ID';
    return name
        .replace(/^(h\.|dr\.|drs\.|ir\.|haji|prof\.)/gi, '')
        .trim()
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('');
}

function formatNumber(n) {
    if (n === null || n === undefined || isNaN(n)) return '–';
    return Number(n).toLocaleString('id-ID');
}

function formatShortNumber(n) {
    if (n === null || n === undefined || isNaN(n)) return '–';
    const num = Number(n);
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace('.0', '') + ' Jt';
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace('.0', '') + ' Rb';
    return num.toString();
}

function formatPdrb(val) {
    if (!val || isNaN(val)) return '–';
    const n = Number(val);
    if (n >= 1_000_000) {
        return `Rp ${(n / 1_000_000).toFixed(2)} T`;
    }
    if (n >= 1_000) {
        return `Rp ${(n / 1_000).toFixed(1)} M`;
    }
    return `Rp ${formatNumber(n)} Jt`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Setup Custom Searchable & Filterable Region Picker Component
function setupCustomRegionPicker(currentRegion) {
    const customPicker = document.getElementById('customRegionPicker');
    const trigger = document.getElementById('pickerTrigger');
    const dropdown = document.getElementById('pickerDropdown');
    const searchInput = document.getElementById('pickerSearchInput');
    const searchClear = document.getElementById('pickerSearchClear');
    const resultsCount = document.getElementById('pickerResultsCount');
    const resultsList = document.getElementById('pickerResultsList');
    const pickerCurrentName = document.getElementById('pickerCurrentName');

    if (!customPicker || !trigger || !dropdown || !resultsList) return;

    if (pickerCurrentName && currentRegion) {
        pickerCurrentName.textContent = `${currentRegion.kabkota} (${currentRegion.prov})`;
    }

    let currentIsland = 'all';
    let currentQuery = '';

    function renderResults() {
        const q = currentQuery.toLowerCase().trim();
        const filtered = REGION_DATA.filter(r => {
            // 1. Island filter
            if (currentIsland !== 'all') {
                const provNorm = (r.prov || '').toLowerCase();
                const islandMap = {
                    'sumatera': ['aceh', 'sumatera', 'riau', 'jambi', 'bengkulu', 'lampung', 'bangka'],
                    'jawa': ['jakarta', 'jawa', 'banten', 'yogyakarta'],
                    'kalimantan': ['kalimantan'],
                    'sulawesi': ['sulawesi', 'gorontalo'],
                    'balinusa': ['bali', 'nusa'],
                    'malukupapua': ['maluku', 'papua']
                };
                const keywords = islandMap[currentIsland] || [];
                const matchIsland = keywords.some(kw => provNorm.includes(kw));
                if (!matchIsland) return false;
            }

            // 2. Search query filter
            if (!q) return true;
            const nameNorm = (r.kabkota || '').toLowerCase();
            const provNorm = (r.prov || '').toLowerCase();
            return nameNorm.includes(q) || provNorm.includes(q);
        });

        if (resultsCount) {
            resultsCount.textContent = `Menampilkan ${filtered.length} Daerah`;
        }

        resultsList.innerHTML = '';
        if (filtered.length === 0) {
            resultsList.innerHTML = `<div style="padding: 16px; text-align: center; font-size: 12px; color: var(--text-low);">Tidak ada daerah yang cocok</div>`;
            return;
        }

        filtered.slice(0, 100).forEach(r => {
            const isSelected = String(r.id) === String(currentRegion.id);
            const isKota = (r.kabkota || '').toUpperCase().startsWith('KOTA');

            const item = document.createElement('div');
            item.className = `picker-item ${isSelected ? 'selected' : ''}`;
            item.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${escapeHtml(r.kabkota)}</span>
                    <span class="item-prov">${escapeHtml(r.prov)}</span>
                </div>
                <span class="item-badge ${isKota ? 'kota' : ''}">${isKota ? 'KOTA' : 'KAB'}</span>
            `;

            item.addEventListener('click', () => {
                const targetVal = r.id || r.slug;
                window.location.href = `profil.html?id=${encodeURIComponent(targetVal)}`;
            });

            resultsList.appendChild(item);
        });
    }

    // Toggle dropdown visibility
    function openPicker() {
        customPicker.classList.add('open');
        dropdown.hidden = false;
        renderResults();
        setTimeout(() => searchInput?.focus(), 50);
    }

    function closePicker() {
        customPicker.classList.remove('open');
        dropdown.hidden = true;
    }

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dropdown.hidden) openPicker();
        else closePicker();
    });

    dropdown.addEventListener('click', (e) => e.stopPropagation());

    // Instant Search Input Listener
    searchInput?.addEventListener('input', (e) => {
        currentQuery = e.target.value;
        if (searchClear) searchClear.hidden = !currentQuery;
        renderResults();
    });

    searchClear?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        currentQuery = '';
        if (searchClear) searchClear.hidden = true;
        renderResults();
        searchInput?.focus();
    });

    // Island Filter Pills Listener
    const filterPills = dropdown.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentIsland = pill.getAttribute('data-island') || 'all';
            renderResults();
        });
    });

    // Close on click outside or Escape key
    document.addEventListener('click', closePicker);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePicker();
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (dropdown.hidden) openPicker();
            else closePicker();
        }
    });
}