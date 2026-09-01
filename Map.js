/* ============================================================
   Portal Data Kabupaten & Kota — Main Dashboard Controller (map.js)
   Pure Sans-Serif typography, Indonesian Merah-Putih color palette,
   and clean professional UI without emojis.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Validate data existence
    if (typeof REGION_DATA === 'undefined' || !Array.isArray(REGION_DATA)) {
        console.error('REGION_DATA is missing or not loaded.');
        return;
    }

    // 2. Metrics definition with clean text tags (no emojis)
    const METRICS = {
        kepadatan: {
            id: 'kepadatan',
            label: 'Kepadatan Penduduk',
            shortLabel: 'Kepadatan',
            tag: 'PADAT',
            category: 'Kependudukan',
            unit: 'jiwa/km²',
            note: 'Dihitung dari total estimasi penduduk dibagi luas daratan resmi.',
            getValue: (d) => (d.kepadatan !== null && !isNaN(d.kepadatan) ? Number(d.kepadatan) : null),
            format: (v) => `${formatNumber(Math.round(v))} jiwa/km²`,
            formatShort: (v) => `${formatNumber(Math.round(v))}`,
            classify: (v) => {
                if (v > 3000) return 'Sangat Padat (Metropolitan)';
                if (v > 1000) return 'Padat (Perkotaan)';
                if (v > 200) return 'Sedang';
                return 'Rendah / Jarang';
            }
        },
        penduduk: {
            id: 'penduduk',
            label: 'Jumlah Penduduk',
            shortLabel: 'Penduduk',
            tag: 'JIWA',
            category: 'Kependudukan',
            unit: 'jiwa',
            note: 'Estimasi total jiwa penduduk kabupaten/kota.',
            getValue: (d) => (d.penduduk !== null && !isNaN(d.penduduk) ? Number(d.penduduk) : null),
            format: (v) => `${formatNumber(v)} jiwa`,
            formatShort: (v) => formatShortNumber(v),
            classify: (v) => {
                if (v > 2000000) return 'Mega (>2 Juta)';
                if (v > 1000000) return 'Besar (1-2 Juta)';
                if (v > 500000) return 'Sedang (500rb-1Jt)';
                return 'Kecil (<500rb)';
            }
        },
        ipm_total: {
            id: 'ipm_total',
            label: 'Indeks Pembangunan Manusia (IPM)',
            shortLabel: 'Indeks IPM',
            tag: 'IPM',
            category: 'Kesejahteraan',
            unit: 'skor 0–100',
            note: 'Mengukur capaian kesehatan, pendidikan, & standar hidup layak (Standar BPS).',
            getValue: (d) => (d.ipm_total !== null && !isNaN(d.ipm_total) ? Number(d.ipm_total) : null),
            format: (v) => `${v.toFixed(2)}`,
            formatShort: (v) => `${v.toFixed(1)}`,
            classify: (v) => {
                if (v >= 80) return 'Sangat Tinggi (≥80)';
                if (v >= 70) return 'Tinggi (70–79.9)';
                if (v >= 60) return 'Sedang (60–69.9)';
                return 'Rendah (<60)';
            }
        },
        pdrb_perkapita: {
            id: 'pdrb_perkapita',
            label: 'PDRB Per Kapita',
            shortLabel: 'PDRB/Kapita',
            tag: 'PDRB',
            category: 'Ekonomi',
            unit: 'Jt Rp/tahun',
            note: 'Pendapatan domestik bruto per kapita atas dasar harga berlaku.',
            getValue: (d) => (d.pdrb_perkapita !== null && !isNaN(d.pdrb_perkapita) ? Number(d.pdrb_perkapita) : null),
            format: (v) => `Rp ${v.toFixed(2)} Jt`,
            formatShort: (v) => `Rp ${Math.round(v)} Jt`,
            classify: (v) => {
                if (v > 100) return 'Sangat Tinggi (>100 Jt)';
                if (v > 50) return 'Tinggi (50–100 Jt)';
                if (v > 25) return 'Menengah (25–50 Jt)';
                return 'Berkembang (<25 Jt)';
            }
        },
        persentase_miskin: {
            id: 'persentase_miskin',
            label: 'Tingkat Kemiskinan',
            shortLabel: 'Kemiskinan',
            tag: 'MISKIN',
            category: 'Kesejahteraan',
            unit: '% penduduk',
            note: 'Persentase penduduk dengan pengeluaran di bawah garis kemiskinan daerah.',
            getValue: (d) => (d.persentase_miskin !== null && !isNaN(d.persentase_miskin) ? Number(d.persentase_miskin) : null),
            format: (v) => `${v.toFixed(2)}%`,
            formatShort: (v) => `${v.toFixed(1)}%`,
            classify: (v) => {
                if (v < 6) return 'Sangat Rendah (<6%)';
                if (v < 10) return 'Rendah (6–10%)';
                if (v < 15) return 'Sedang (10–15%)';
                return 'Tinggi (>15%)';
            }
        },
        luas: {
            id: 'luas',
            label: 'Luas Wilayah',
            shortLabel: 'Luas',
            tag: 'LUAS',
            category: 'Geografi',
            unit: 'km²',
            note: 'Total luas wilayah daratan resmi menurut rilis BPS.',
            getValue: (d) => (d.luas !== null && !isNaN(d.luas) ? Number(d.luas) : null),
            format: (v) => `${formatNumber(Math.round(v))} km²`,
            formatShort: (v) => `${formatShortNumber(v)} km²`,
            classify: (v) => {
                if (v > 10000) return 'Sangat Luas (>10.000 km²)';
                if (v > 3000) return 'Luas (3.000-10.000 km²)';
                if (v > 500) return 'Sedang';
                return 'Kecil / Kompak (<500 km²)';
            }
        }
    };

    // Island bounds definition for quick pan/zoom
    const ISLAND_BOUNDS = {
        sumatera: [[-5.9, 95.0], [5.9, 106.1]],
        jawa: [[-8.8, 105.0], [-5.8, 114.6]],
        kalimantan: [[-4.2, 108.5], [4.3, 119.0]],
        sulawesi: [[-5.8, 118.5], [1.9, 125.3]],
        bali_nusa: [[-11.0, 114.4], [-8.0, 125.2]],
        papua: [[-9.1, 126.0], [0.8, 141.0]]
    };

    // State
    let currentMetric = 'kepadatan';
    let filterProv = '';
    let filterType = 'all';
    let leaderboardMode = 'top';
    let selectedRegion = null;
    let currentView = 'map';
    let tableSortField = 'active_metric';
    let tableSortAsc = false;
    const markers = new Map();

    // 3. Initialize Leaflet Map
    const map = L.map('map', {
        center: [-1.2, 117.5],
        zoom: 5,
        minZoom: 4,
        maxZoom: 13,
        zoomControl: false,
        attributionControl: true
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // OpenStreetMap standard tile layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    const geojsonLayerGroup = L.layerGroup().addTo(map);

    let allGeoJsonFeatures = [];

    // Helper String Normalization & Matching
    function normalizeStr(val) {
        return String(val || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    }

    function sameProvName(a, b) {
        const x = normalizeStr(a);
        const y = normalizeStr(b);
        if (!x || !y) return false;
        if (x === y) return true;

        const aliases = {
            'jakartaraya': 'dkijakarta', 'jakarta': 'dkijakarta', 'dki': 'dkijakarta',
            'yogyakarta': 'diyogyakarta', 'daerahistimewayogyakarta': 'diyogyakarta',
            'bangkabelitung': 'kepulauanbangkabelitung', 'kepbangkabelitung': 'kepulauanbangkabelitung'
        };

        const normX = aliases[x] || x;
        const normY = aliases[y] || y;

        if (normX === normY) return true;

        // Match DOB Papua expansion provinces (Papua Pegunungan, Papua Tengah, Papua Selatan, Papua Barat Daya) with base Papua in GeoJSON
        if (normX.startsWith('papua') && normY.startsWith('papua')) return true;

        return false;
    }

    function findBpsRegionData(gCountry, gName) {
        if (!gName) return null;

        // 1. Primary match with province verification
        let found = REGION_DATA.find(d => {
            if (!sameProvName(d.prov, gCountry)) return false;
            const bpsKab = normalizeStr(d.kabkota);
            const gKab = normalizeStr(gName);
            if (bpsKab === gKab) return true;
            const cBps = bpsKab.replace(/^kota/, '').replace(/^kabupaten/, '');
            const cGeo = gKab.replace(/^kota/, '').replace(/^kabupaten/, '');
            return cBps === cGeo && cBps.length > 2;
        });

        if (found) return found;

        // 2. Fallback match by regency name across all 514 regions
        const gKab = normalizeStr(gName);
        const cGeo = gKab.replace(/^kota/, '').replace(/^kabupaten/, '');
        if (cGeo.length > 2) {
            found = REGION_DATA.find(d => {
                const bpsKab = normalizeStr(d.kabkota);
                const cBps = bpsKab.replace(/^kota/, '').replace(/^kabupaten/, '');
                return cBps === cGeo;
            });
        }

        return found;
    }

    // Load Indonesia Regency/City GeoJSON
    async function loadGeoJSON() {
        if (typeof window !== 'undefined' && window.INDONESIA_KAB_GEOJSON && Array.isArray(window.INDONESIA_KAB_GEOJSON.features)) {
            allGeoJsonFeatures = window.INDONESIA_KAB_GEOJSON.features.filter(f => f.geometry !== null);
            console.log('GeoJSON loaded from script bundle:', allGeoJsonFeatures.length, 'features');
            createOrUpdateMarkers();
            return;
        }
        try {
            const res = await fetch('indonesia-kab.json');
            if (res.ok) {
                const data = await res.json();
                allGeoJsonFeatures = data.features.filter(f => f.geometry !== null);
                console.log('GeoJSON successfully loaded:', allGeoJsonFeatures.length, 'features');
                createOrUpdateMarkers();
            }
        } catch (e) {
            console.warn('GeoJSON loading deferred or unavailable:', e);
        }
    }
    loadGeoJSON();

    // 4. Calculate metric bounds and stats
    function getMetricBounds(metricKey, dataset = REGION_DATA) {
        const metric = METRICS[metricKey];
        const values = dataset
            .map(d => metric.getValue(d))
            .filter(v => v !== null && !isNaN(v));

        if (values.length === 0) return { min: 0, max: 100, p5: 0, p95: 100, avg: 0 };
        values.sort((a, b) => a - b);

        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const p5 = values[Math.floor(values.length * 0.05)];
        const p95 = values[Math.floor(values.length * 0.95)];

        return {
            min: Math.min(...values),
            max: Math.max(...values),
            p5,
            p95,
            avg
        };
    }

    function getMetricGradientCSS(metricKey) {
        if (metricKey === 'ipm_total') {
            return 'linear-gradient(90deg, #ef4444, #f59e0b, #10b981)';
        } else if (metricKey === 'persentase_miskin') {
            return 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)';
        } else if (metricKey === 'pdrb_perkapita') {
            return 'linear-gradient(90deg, #93c5fd, #2563eb, #1e1b4b)';
        } else if (metricKey === 'luas') {
            return 'linear-gradient(90deg, #99f6e4, #0d9488, #134e4a)';
        } else {
            return 'linear-gradient(90deg, #818cf8, #4f46e5, #1e1b4b)';
        }
    }

    function getColorForRatio(t, metricKey) {
        t = Math.max(0, Math.min(1, t));
        let c1, c2, c3;

        if (metricKey === 'ipm_total') {
            // Low IPM = Red (#ef4444) -> Mid = Amber (#f59e0b) -> High = Green (#10b981)
            c1 = [239, 68, 68];
            c2 = [245, 158, 11];
            c3 = [16, 185, 129];
        } else if (metricKey === 'persentase_miskin') {
            // Low Poverty = Green (#10b981) -> Mid = Amber (#f59e0b) -> High = Red (#ef4444)
            c1 = [16, 185, 129];
            c2 = [245, 158, 11];
            c3 = [239, 68, 68];
        } else if (metricKey === 'pdrb_perkapita') {
            // Soft Slate -> Royal Indigo -> Deep Navy
            c1 = [147, 197, 253];
            c2 = [37, 99, 235];
            c3 = [30, 27, 75];
        } else if (metricKey === 'luas') {
            // Soft Mint Teal -> Deep Teal -> Dark Teal
            c1 = [153, 246, 228];
            c2 = [13, 148, 136];
            c3 = [19, 78, 74];
        } else {
            // Kependudukan: Soft Indigo -> Royal Indigo -> Dark Navy
            c1 = [129, 140, 248];
            c2 = [79, 70, 229];
            c3 = [30, 27, 75];
        }

        let r, g, b;
        if (t < 0.5) {
            const k = t / 0.5;
            r = Math.round(c1[0] + (c2[0] - c1[0]) * k);
            g = Math.round(c1[1] + (c2[1] - c1[1]) * k);
            b = Math.round(c1[2] + (c2[2] - c1[2]) * k);
        } else {
            const k = (t - 0.5) / 0.5;
            r = Math.round(c2[0] + (c3[0] - c2[0]) * k);
            g = Math.round(c2[1] + (c3[1] - c2[1]) * k);
            b = Math.round(c2[2] + (c3[2] - c2[2]) * k);
        }
        return `rgb(${r}, ${g}, ${b})`;
    }

    // 5. Filter Dataset
    function getFilteredData() {
        return REGION_DATA.filter(d => {
            if (filterProv && (d.prov || '').toUpperCase() !== filterProv.toUpperCase()) {
                return false;
            }
            const isKota = (d.kabkota || '').toUpperCase().startsWith('KOTA');
            if (filterType === 'kabupaten' && isKota) return false;
            if (filterType === 'kota' && !isKota) return false;
            return true;
        });
    }

    // 6. Populate Custom Searchable Province Dropdown
    const provFilter = document.getElementById('provFilter');
    const provCustomSelect = document.getElementById('provCustomSelect');
    const provSelectTrigger = document.getElementById('provSelectTrigger');
    const provSelectLabel = document.getElementById('provSelectLabel');
    const provSelectMenu = document.getElementById('provSelectMenu');
    const provSearchInput = document.getElementById('provSearchInput');
    const provOptionsList = document.getElementById('provOptionsList');

    if (provFilter) {
        const provinces = Array.from(new Set(REGION_DATA.map(d => d.prov).filter(Boolean))).sort();
        
        // Populate hidden select for fallback/sync
        provFilter.innerHTML = '<option value="">Semua Provinsi (Nasional)</option>';
        provinces.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = `Provinsi ${p}`;
            provFilter.appendChild(opt);
        });

        function renderProvOptions(query = '') {
            if (!provOptionsList) return;
            const q = query.trim().toLowerCase();
            
            let html = `<div class="prov-opt-item ${!filterProv ? 'active' : ''}" data-value="">Semua Provinsi (Nasional)</div>`;
            
            const filtered = provinces.filter(p => p.toLowerCase().includes(q));
            
            if (filtered.length === 0) {
                html += `<div class="prov-opt-empty">Tidak ada provinsi dengan nama "${escapeHtml(query)}"</div>`;
            } else {
                html += filtered.map(p => `
                    <div class="prov-opt-item ${filterProv === p ? 'active' : ''}" data-value="${escapeHtml(p)}">
                        Provinsi ${escapeHtml(p)}
                    </div>
                `).join('');
            }
            
            provOptionsList.innerHTML = html;

            provOptionsList.querySelectorAll('.prov-opt-item').forEach(item => {
                item.addEventListener('click', () => {
                    const val = item.getAttribute('data-value') || '';
                    filterProv = val;
                    if (provFilter) provFilter.value = val;
                    if (provSelectLabel) {
                        provSelectLabel.textContent = val ? `Provinsi ${val}` : 'Semua Provinsi (Nasional)';
                    }
                    closeProvSelect();
                    applyFilters();

                    // Auto zoom to province bounds if selected
                    if (val && allGeoJsonFeatures.length > 0) {
                        const provFeatures = allGeoJsonFeatures.filter(f => f.properties && sameProvName(f.properties.COUNTRY, val));
                        if (provFeatures.length > 0) {
                            const tempLayer = L.geoJSON(provFeatures);
                            map.flyToBounds(tempLayer.getBounds(), { padding: [40, 40], duration: 1.0 });
                        }
                    } else if (!val) {
                        map.flyTo([-1.2, 117.5], 5, { duration: 1.0 });
                    }
                });
            });
        }

        function openProvSelect() {
            if (!provCustomSelect || !provSelectMenu) return;
            provCustomSelect.classList.add('open');
            provSelectMenu.hidden = false;
            if (provSearchInput) {
                provSearchInput.value = '';
                provSearchInput.focus();
            }
            renderProvOptions('');
        }

        function closeProvSelect() {
            if (!provCustomSelect || !provSelectMenu) return;
            provCustomSelect.classList.remove('open');
            provSelectMenu.hidden = true;
        }

        provSelectTrigger?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (provSelectMenu?.hidden) {
                openProvSelect();
            } else {
                closeProvSelect();
            }
        });

        provSearchInput?.addEventListener('input', (e) => {
            renderProvOptions(e.target.value);
        });

        document.addEventListener('click', (e) => {
            if (provCustomSelect && !provCustomSelect.contains(e.target)) {
                closeProvSelect();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && provCustomSelect?.classList.contains('open')) {
                closeProvSelect();
            }
        });

        provFilter.addEventListener('change', (e) => {
            filterProv = e.target.value;
            if (provSelectLabel) {
                provSelectLabel.textContent = filterProv ? `Provinsi ${filterProv}` : 'Semua Provinsi (Nasional)';
            }
            applyFilters();
        });
    }

    // 7. Type Filter Pills
    const typePills = document.querySelectorAll('.type-pill');
    typePills.forEach(pill => {
        pill.addEventListener('click', () => {
            typePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            filterType = pill.getAttribute('data-type');
            applyFilters();
        });
    });

    // 8. Quick Island Navigation
    const islandPills = document.querySelectorAll('.island-pill');
    islandPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const key = pill.getAttribute('data-bounds');
            if (ISLAND_BOUNDS[key]) {
                map.fitBounds(ISLAND_BOUNDS[key], { padding: [40, 40], duration: 1.2 });
            }
        });
    });

    // 9. Metric Indicator List & Category Pills
    let currentMetricCategory = 'all';
    const catPills = document.querySelectorAll('.m-cat-pill');
    catPills.forEach(pill => {
        pill.addEventListener('click', () => {
            catPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentMetricCategory = pill.getAttribute('data-cat');
            renderMetricCards();
        });
    });

    const metricCardsContainer = document.getElementById('metricCards');
    function renderMetricCards() {
        if (!metricCardsContainer) return;
        metricCardsContainer.innerHTML = '';

        Object.values(METRICS).forEach(m => {
            if (currentMetricCategory !== 'all' && m.category !== currentMetricCategory) {
                return;
            }

            const item = document.createElement('div');
            item.className = `metric-item ${m.id === currentMetric ? 'active' : ''}`;
            item.innerHTML = `
                <div class="m-item-left">
                    <span class="m-tag">${m.tag}</span>
                    <div>
                        <div class="m-title">${escapeHtml(m.label)}</div>
                        <div class="m-sub">${escapeHtml(m.category)} &bull; ${escapeHtml(m.unit)}</div>
                    </div>
                </div>
            `;
            item.addEventListener('click', () => {
                if (currentMetric !== m.id) {
                    currentMetric = m.id;
                    renderMetricCards();
                    updateAllViews();
                }
            });
            metricCardsContainer.appendChild(item);
        });
    }

    // 10. Leaderboard Top/Bottom Toggle
    const lbTopBtn = document.getElementById('lbTopBtn');
    const lbBottomBtn = document.getElementById('lbBottomBtn');

    lbTopBtn?.addEventListener('click', () => {
        leaderboardMode = 'top';
        lbTopBtn.classList.add('active');
        lbBottomBtn?.classList.remove('active');
        updateLeaderboard(getFilteredData());
    });

    lbBottomBtn?.addEventListener('click', () => {
        leaderboardMode = 'bottom';
        lbBottomBtn.classList.add('active');
        lbTopBtn?.classList.remove('active');
        updateLeaderboard(getFilteredData());
    });

    // 11. Update National Benchmark Summary & Map Context
    function updateNationalSummary(dataset) {
        const m = METRICS[currentMetric];
        const bounds = getMetricBounds(currentMetric, dataset);

        const bmMarg = document.getElementById('bmMetricName');
        const natMin = document.getElementById('natMin');
        const natAvg = document.getElementById('natAvg');
        const natMax = document.getElementById('natMax');

        if (bmMarg) bmMarg.textContent = m.label;
        if (natMin) natMin.textContent = m.formatShort(bounds.min);
        if (natAvg) natAvg.textContent = m.formatShort(bounds.avg);
        if (natMax) natMax.textContent = m.formatShort(bounds.max);

        // Update map context strip
        const stripMetricLabel = document.getElementById('stripMetricLabel');
        const stripFilterLabel = document.getElementById('stripFilterLabel');
        if (stripMetricLabel) stripMetricLabel.textContent = `${m.label} (${m.unit})`;
        if (stripFilterLabel) {
            const provText = filterProv ? `Provinsi ${filterProv}` : 'Seluruh Indonesia';
            const typeText = filterType === 'all' ? 'Wilayah' : filterType === 'kabupaten' ? 'Kabupaten' : 'Kota';
            stripFilterLabel.textContent = `${provText} • ${dataset.length} ${typeText}`;
        }

        // Update map legend
        const legTitle = document.getElementById('legendMetricTitle');
        const scaleMin = document.getElementById('scaleMin');
        const scaleMax = document.getElementById('scaleMax');
        const scaleBar = document.querySelector('.legend-scale-bar, .scale-bar');

        if (legTitle) legTitle.textContent = `${m.label} (${m.unit})`;
        if (scaleMin) scaleMin.textContent = m.formatShort(bounds.min);
        if (scaleMax) scaleMax.textContent = m.formatShort(bounds.max);
        if (scaleBar) scaleBar.style.background = getMetricGradientCSS(currentMetric);
    }

    // Helper to fly to a region with right drawer offset (440px right padding)
    function focusRegionMap(target) {
        if (!target) return;

        // Locate exact GeoJSON feature bounds in allGeoJsonFeatures (WITHOUT altering filterProv)
        let targetBounds = null;
        if (allGeoJsonFeatures.length > 0 && target.prov && target.kabkota) {
            const normProv = target.prov;
            const normKab = target.kabkota;
            const matchingFeature = allGeoJsonFeatures.find(f => {
                if (!f.properties) return false;
                if (!sameProvName(f.properties.COUNTRY, normProv)) return false;
                const geoKab = normalizeStr(f.properties.NAME_1);
                const bpsKab = normalizeStr(normKab);
                if (geoKab === bpsKab) return true;
                const cBps = bpsKab.replace(/^kota/, '').replace(/^kabupaten/, '');
                const cGeo = geoKab.replace(/^kota/, '').replace(/^kabupaten/, '');
                return cBps === cGeo && cBps.length > 2;
            });

            if (matchingFeature) {
                const tempLayer = L.geoJSON(matchingFeature);
                targetBounds = tempLayer.getBounds();
            }
        }

        // Asymmetrical padding: 440px right padding keeps polygon centered in the visible map area (left of the 380px drawer)
        const drawerPadding = {
            paddingTopLeft: [60, 60],
            paddingBottomRight: [440, 60],
            maxZoom: 12,
            duration: 1.2
        };

        if (targetBounds && targetBounds.isValid()) {
            map.flyToBounds(targetBounds, drawerPadding);
        } else if (typeof target.lat === 'number' && typeof target.lng === 'number') {
            const ptBounds = L.latLngBounds(
                [target.lat - 0.04, target.lng - 0.04],
                [target.lat + 0.04, target.lng + 0.04]
            );
            map.flyToBounds(ptBounds, drawerPadding);
        }
    }

    function updateLeaderboard(dataset) {
        const lbContainer = document.getElementById('leaderboardList');
        if (!lbContainer) return;

        const m = METRICS[currentMetric];
        const validList = dataset
            .map(d => ({ region: d, val: m.getValue(d) }))
            .filter(item => item.val !== null && !isNaN(item.val));

        validList.sort((a, b) => leaderboardMode === 'top' ? b.val - a.val : a.val - b.val);
        const displayList = validList.slice(0, 5);

        if (displayList.length === 0) {
            lbContainer.innerHTML = '<div style="font-size: 11.5px; color: #8b95a5; padding: 6px 0;">Tidak ada data tersedia.</div>';
            return;
        }

        const maxVal = Math.max(...displayList.map(item => item.val));
        lbContainer.innerHTML = displayList.map((item, idx) => {
            const pct = maxVal > 0 ? Math.min(100, Math.max(8, (item.val / maxVal) * 100)) : 10;
            return `
                <div class="lb-item" data-id="${item.region.id}">
                    <span class="lb-rank">${idx + 1}</span>
                    <div class="lb-info">
                        <div class="lb-name">${escapeHtml(item.region.kabkota || '')}</div>
                        <div class="lb-prov">${escapeHtml(item.region.prov || '')}</div>
                        <div class="lb-bar-wrap">
                            <div class="lb-bar" style="width: ${pct}%;"></div>
                        </div>
                    </div>
                    <span class="lb-val">${m.formatShort(item.val)}</span>
                </div>
            `;
        }).join('');

        lbContainer.querySelectorAll('.lb-item').forEach(el => {
            el.addEventListener('click', () => {
                const regId = Number(el.getAttribute('data-id'));
                const target = REGION_DATA.find(r => r.id === regId);
                if (target) {
                    focusRegionMap(target);
                    selectRegion(target);
                }
            });
        });
    }

    // Attach CTA button to switch to Table View
    const lbCtaTableBtn = document.getElementById('lbCtaTableBtn');
    lbCtaTableBtn?.addEventListener('click', () => {
        const btnViewTable = document.getElementById('btnViewTable');
        btnViewTable?.click();
    });

    // 12. Render Markers or Polygons on Map
    function createOrUpdateMarkers() {
        markersLayer.clearLayers();
        geojsonLayerGroup.clearLayers();
        markers.clear();

        const filtered = getFilteredData();
        const bounds = getMetricBounds(currentMetric, REGION_DATA);
        const m = METRICS[currentMetric];

        // --- RENDER POLIGON KABUPATEN/KOTA (GEOJSON AVAILABLE) ---
        if (allGeoJsonFeatures.length > 0) {
            const displayFeatures = filterProv
                ? allGeoJsonFeatures.filter(f => f.properties && sameProvName(f.properties.COUNTRY, filterProv))
                : allGeoJsonFeatures;

            if (displayFeatures.length > 0) {
                const geoLayer = L.geoJSON(displayFeatures, {
                    style: (feature) => {
                        const props = feature.properties || {};
                        const regData = findBpsRegionData(props.COUNTRY, props.NAME_1);
                        const val = regData ? m.getValue(regData) : null;

                        let fillColor = '#8b95a5';
                        if (val !== null) {
                            const ratio = bounds.p95 > bounds.p5 ? (val - bounds.p5) / (bounds.p95 - bounds.p5) : 0.5;
                            fillColor = getColorForRatio(ratio, currentMetric);
                        }

                        return {
                            fillColor: fillColor,
                            weight: filterProv ? 1.0 : 0.4,
                            opacity: 0.85,
                            color: '#ffffff',
                            fillOpacity: 0.40,
                            className: 'r-polygon'
                        };
                    },
                    onEachFeature: (feature, layer) => {
                        const props = feature.properties || {};
                        const regName = (props.NAME_1 || 'Wilayah').trim();
                        const regType = (props.VARNAME_2 || '').trim();
                        const fullName = `${regType} ${regName}`.trim();
                        const provName = (props.COUNTRY || '').trim();
                        const regData = findBpsRegionData(provName, regName);
                        const val = regData ? m.getValue(regData) : null;
                        const valDisplay = val !== null ? m.format(val) : 'Data belum tersedia';
                        const classification = val !== null ? m.classify(val) : '';

                        layer.bindTooltip(`
                            <div style="font-family: var(--font-sans); font-size: 12px; line-height: 1.4;">
                                <div style="font-size: 10px; text-transform: uppercase; color: #525c6e; letter-spacing: .03em; font-weight:600;">PROVINSI ${escapeHtml(provName)}</div>
                                <strong style="color: #1f242e; font-size: 13.5px; font-weight:700;">${escapeHtml(fullName)}</strong>
                                <div style="color: #cf1e2e; font-weight: 700; margin-top: 3px;">${m.label}: ${valDisplay}</div>
                                ${classification ? `<div style="font-size: 10.5px; color: #525c6e; margin-top: 1px;">Kategori: <b>${classification}</b></div>` : ''}
                            </div>
                        `, {
                            direction: 'top',
                            offset: [0, -6],
                            opacity: 1
                        });

                        layer.on({
                            mouseover: (e) => {
                                const l = e.target;
                                l.setStyle({ weight: 2.5, color: '#dadde4ff', fillOpacity: 0.65 });
                                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                                    l.bringToFront();
                                }
                            },
                            mouseout: (e) => {
                                geoLayer.resetStyle(e.target);
                            },
                            click: () => {
                                if (regData) {
                                    selectRegion(regData);
                                }
                            }
                        });
                    }
                }).addTo(geojsonLayerGroup);

                if (filterProv) {
                    map.flyToBounds(geoLayer.getBounds(), { padding: [40, 40], duration: 1.0 });
                }
                return;
            }
        }

        // --- FALLBACK: DOT MARKERS JIKA GEOJSON BELUM LOADED ---
        filtered.forEach(region => {
            if (typeof region.lat !== 'number' || typeof region.lng !== 'number' || isNaN(region.lat) || isNaN(region.lng)) {
                return;
            }

            const val = m.getValue(region);
            let color = '#8b95a5';
            let radius = 6;

            if (val !== null) {
                const ratio = bounds.p95 > bounds.p5 ? (val - bounds.p5) / (bounds.p95 - bounds.p5) : 0.5;
                color = getColorForRatio(ratio);
                radius = 5 + Math.max(0, Math.min(6, ratio * 6));
            }

            const marker = L.circleMarker([region.lat, region.lng], {
                radius: radius,
                fillColor: color,
                color: '#ffffff',
                weight: 1.5,
                opacity: 0.9,
                fillOpacity: 0.85,
                className: 'r-dot'
            });

            const valDisplay = val !== null ? m.format(val) : 'Data belum tersedia';
            const classification = val !== null ? m.classify(val) : '';

            marker.bindTooltip(`
                <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; line-height: 1.4;">
                    <div style="font-size: 10px; text-transform: uppercase; color: #525c6e; letter-spacing: .03em; font-weight:600;">PROVINSI ${escapeHtml(region.prov || '')}</div>
                    <strong style="color: #1f242e; font-size: 13.5px; font-weight:700;">${escapeHtml(region.kabkota || '')}</strong>
                    <div style="color: #cf1e2e; font-weight: 700; margin-top: 3px;">${m.label}: ${valDisplay}</div>
                    ${classification ? `<div style="font-size: 10.5px; color: #525c6e; margin-top: 1px;">Kategori: <b>${classification}</b></div>` : ''}
                </div>
            `, {
                direction: 'top',
                offset: [0, -6],
                opacity: 1
            });

            marker.on('click', () => {
                selectRegion(region);
            });

            marker.addTo(markersLayer);
            markers.set(region.id || region.slug || `${region.lat},${region.lng}`, marker);
        });

        // Zoom to filtered markers if province filter is applied
        if (filterProv && filtered.length > 0) {
            const validCoords = filtered.filter(r => typeof r.lat === 'number' && typeof r.lng === 'number');
            if (validCoords.length > 0) {
                const group = L.featureGroup(validCoords.map(r => L.marker([r.lat, r.lng])));
                map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 9 });
            }
        }
    }

    // 13. Render Table View with Dynamic Active Metric Column
    function renderTable() {
        const tableBody = document.getElementById('tableBody');
        const tableCountLabel = document.getElementById('tableCountLabel');
        const thActiveMetric = document.getElementById('thActiveMetric');
        if (!tableBody) return;

        const m = METRICS[currentMetric];
        if (thActiveMetric) {
            thActiveMetric.textContent = `${m.label} (${m.unit})`;
        }

        let filtered = [...getFilteredData()];
        if (tableCountLabel) {
            tableCountLabel.textContent = `Menampilkan ${filtered.length} dari ${REGION_DATA.length} kabupaten & kota`;
        }

        // Sort data
        filtered.sort((a, b) => {
            let valA, valB;
            if (tableSortField === 'active_metric') {
                valA = m.getValue(a);
                valB = m.getValue(b);
            } else {
                valA = a[tableSortField];
                valB = b[tableSortField];
            }

            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;

            if (typeof valA === 'string') {
                return tableSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return tableSortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        });

        tableBody.innerHTML = filtered.map((r, idx) => {
            const targetUrl = `profil.html?id=${encodeURIComponent(r.id || '')}&slug=${encodeURIComponent(r.slug || '')}`;
            const activeVal = m.getValue(r);
            const activeDisplay = activeVal !== null ? m.formatShort(activeVal) : '–';

            return `
                <tr>
                    <td style="color: var(--text-low); font-weight:600;">#${idx + 1}</td>
                    <td><strong>${escapeHtml(r.kabkota || '')}</strong></td>
                    <td style="color: var(--text-mid);">${escapeHtml(r.prov || '')}</td>
                    <td class="highlight-col">${activeDisplay}</td>
                    <td>${r.penduduk ? formatNumber(r.penduduk) : '–'}</td>
                    <td><b>${r.ipm_total ? r.ipm_total.toFixed(2) : '–'}</b></td>
                    <td>${r.pdrb_perkapita ? 'Rp ' + Number(r.pdrb_perkapita).toFixed(1) + ' Jt' : '–'}</td>
                    <td>${r.persentase_miskin ? r.persentase_miskin.toFixed(2) + '%' : '–'}</td>
                    <td><a href="${targetUrl}" class="action-btn">Lihat Profil &rarr;</a></td>
                </tr>
            `;
        }).join('');
    }

    // Attach table header click listeners for sorting
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.getAttribute('data-sort');
            if (sortKey === 'rank') return;

            if (tableSortField === sortKey) {
                tableSortAsc = !tableSortAsc;
            } else {
                tableSortField = sortKey;
                tableSortAsc = false;
            }
            renderTable();
        });
    });

    // 14. View Mode Toggle (Map vs Table)
    const btnViewMap = document.getElementById('btnViewMap');
    const btnViewTable = document.getElementById('btnViewTable');
    const tableViewWrap = document.getElementById('tableViewWrap');
    const mapLegend = document.getElementById('mapLegend');
    const mapContextStrip = document.getElementById('mapContextStrip');

    function setViewMode(mode) {
        currentView = mode;
        if (mode === 'map') {
            btnViewMap?.classList.add('active');
            btnViewTable?.classList.remove('active');
            tableViewWrap?.classList.remove('active');
            if (mapLegend) mapLegend.style.display = 'block';
            if (mapContextStrip) mapContextStrip.style.display = 'flex';
            setTimeout(() => map.invalidateSize(), 100);
        } else {
            btnViewTable?.classList.add('active');
            btnViewMap?.classList.remove('active');
            tableViewWrap?.classList.add('active');
            if (mapLegend) mapLegend.style.display = 'none';
            if (mapContextStrip) mapContextStrip.style.display = 'none';
            renderTable();
        }
    }

    btnViewMap?.addEventListener('click', () => setViewMode('map'));
    btnViewTable?.addEventListener('click', () => setViewMode('table'));

    // 15. Apply Filters & Update Views
    function applyFilters() {
        const filtered = getFilteredData();
        createOrUpdateMarkers();
        updateNationalSummary(filtered);
        updateLeaderboard(filtered);
        if (currentView === 'table') {
            renderTable();
        }
    }

    function updateAllViews() {
        const filtered = getFilteredData();
        createOrUpdateMarkers();
        updateNationalSummary(filtered);
        updateLeaderboard(filtered);
        if (currentView === 'table') {
            renderTable();
        }
    }

    // 16. Region Side Panel Detail
    const regionPanel = document.getElementById('regionPanel');
    const rpClose = document.getElementById('rpClose');
    const rpContent = document.getElementById('rpContent');

    function selectRegion(region) {
        selectedRegion = region;
        if (!regionPanel || !rpContent) return;

        const isKota = (region.kabkota || '').toUpperCase().startsWith('KOTA');
        const completeness = region.completeness || (Math.round(
            (Object.values(region).filter(v => v !== null && v !== undefined && v !== '').length / Object.keys(region).length) * 100
        ));

        const initials = (region.kepala || region.kabkota || 'ID')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(w => w[0].toUpperCase())
            .join('');

        const targetUrl = `profil.html?id=${encodeURIComponent(region.id || '')}&slug=${encodeURIComponent(region.slug || '')}`;

        // Active metric calculation for spotlight card
        const m = METRICS[currentMetric];
        const val = m.getValue(region);
        const valDisplay = val !== null ? m.format(val) : 'Belum tersedia';
        const classification = val !== null ? m.classify(val) : 'Data belum lengkap';

        // National bounds comparison
        const natBounds = getMetricBounds(currentMetric, REGION_DATA);
        let compareText = '';
        if (val !== null && natBounds.avg > 0) {
            const diff = val - natBounds.avg;
            const sign = diff >= 0 ? '+' : '';
            compareText = `${sign}${m.formatShort(diff)} dibanding rata-rata nasional (${m.formatShort(natBounds.avg)})`;
        }

        rpContent.innerHTML = `
            <span class="rp-type-tag">${isKota ? 'KOTA OTONOM' : 'KABUPATEN'}</span>
            <div class="rp-prov">PROVINSI ${escapeHtml(region.prov || '')}</div>
            <h2 class="rp-name">${escapeHtml(region.kabkota || '')}</h2>

            <!-- Tier 1: Spotlight Active Metric -->
            <div class="rp-spotlight">
                <div class="sp-label">Indikator Terpilih: ${m.label}</div>
                <div class="sp-val">${valDisplay}</div>
                <div class="sp-compare">Status: <b>${classification}</b> ${compareText ? `<br><small style="color:var(--text-mid);">${compareText}</small>` : ''}</div>
            </div>

            <!-- Tier 2: Leadership Info -->
            ${region.kepala ? `
                <div class="rp-lead">
                    <div class="avatar">${initials}</div>
                    <div class="who">
                        <b>${escapeHtml(region.kepala)}</b>
                        <small>${isKota ? 'Walikota' : 'Bupati'}${region.wakil ? ` &bull; Wakil: ${escapeHtml(region.wakil)}` : ''}</small>
                    </div>
                </div>
            ` : ''}

            <!-- Tier 3: Core Statistical Pillars -->
            <div class="rp-grid">
                <div class="stat">
                    <span class="num">${region.penduduk ? formatNumber(region.penduduk) : '<span class="na">–</span>'}</span>
                    <span class="label">Penduduk <span class="unit">jiwa</span></span>
                </div>
                <div class="stat">
                    <span class="num">${region.luas ? formatNumber(Math.round(region.luas)) : '<span class="na">–</span>'}</span>
                    <span class="label">Luas Wilayah <span class="unit">km²</span></span>
                </div>
                <div class="stat">
                    <span class="num">${region.kepadatan ? formatNumber(Math.round(region.kepadatan)) : '<span class="na">–</span>'}</span>
                    <span class="label">Kepadatan <span class="unit">j/km²</span></span>
                </div>
                <div class="stat">
                    <span class="num">${region.ipm_total ? region.ipm_total.toFixed(2) : '<span class="na">–</span>'}</span>
                    <span class="label">Indeks IPM <span class="unit">skor</span></span>
                </div>
                <div class="stat">
                    <span class="num">${region.pdrb_perkapita ? 'Rp ' + Number(region.pdrb_perkapita).toFixed(1) : '<span class="na">–</span>'}</span>
                    <span class="label">PDRB/Kapita <span class="unit">Jt</span></span>
                </div>
                <div class="stat">
                    <span class="num">${region.persentase_miskin ? region.persentase_miskin.toFixed(2) + '%' : '<span class="na">–</span>'}</span>
                    <span class="label">Kemiskinan <span class="unit">%</span></span>
                </div>
            </div>

            <!-- Tier 4: Data Completeness & CTA -->
            <div class="rp-meter-row">
                <div class="meter"><i style="width: ${completeness}%"></i></div>
                <span>Kelengkapan BPS: <b>${completeness}%</b></span>
            </div>

            <a href="${targetUrl}" class="btn btn-primary rp-cta">
                Buka Profil Lengkap &amp; Sektoral
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
            </a>
        `;

        regionPanel.classList.add('open');
    }

    function closePanel() {
        if (regionPanel) {
            regionPanel.classList.remove('open');
        }
        selectedRegion = null;
    }

    if (rpClose) {
        rpClose.addEventListener('click', closePanel);
    }

    // 17. Search Bar & Dropdown
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const searchClearBtn = document.getElementById('searchClearBtn');

    function doSearch(query) {
        if (!searchResults) return;
        const q = (query || '').trim().toLowerCase();

        if (!q) {
            searchResults.hidden = true;
            searchResults.innerHTML = '';
            if (searchClearBtn) searchClearBtn.hidden = true;
            return;
        }

        if (searchClearBtn) searchClearBtn.hidden = false;

        const matches = REGION_DATA.filter(d => {
            const name = (d.kabkota || '').toLowerCase();
            const prov = (d.prov || '').toLowerCase();
            return name.includes(q) || prov.includes(q);
        }).slice(0, 10);

        searchResults.hidden = false;

        if (matches.length === 0) {
            searchResults.innerHTML = `<div class="rempty">Tidak ditemukan wilayah dengan kata kunci "${escapeHtml(query)}"</div>`;
            return;
        }

        const m = METRICS[currentMetric];

        searchResults.innerHTML = matches.map((r, i) => {
            const isKota = (r.kabkota || '').toUpperCase().startsWith('KOTA');
            const val = m.getValue(r);
            const valStr = val !== null ? `${m.shortLabel}: ${m.formatShort(val)}` : '';

            return `
                <div class="result-row" data-index="${i}">
                    <div class="r-main">
                        <span class="r-type-badge ${isKota ? 'kota' : ''}">${isKota ? 'KOTA' : 'KAB'}</span>
                        <div>
                            <div class="rname">${escapeHtml(r.kabkota || '')}</div>
                            <div class="rprov">Provinsi ${escapeHtml(r.prov || '')}</div>
                        </div>
                    </div>
                    <span class="chip">${valStr || (r.penduduk ? formatShortNumber(r.penduduk) + ' jiwa' : 'Data')}</span>
                </div>
            `;
        }).join('');

        searchResults.querySelectorAll('.result-row').forEach((row, idx) => {
            row.addEventListener('click', () => {
                const target = matches[idx];
                searchResults.hidden = true;
                if (searchInput) searchInput.value = target.kabkota || '';

                focusRegionMap(target);
                selectRegion(target);
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            doSearch(e.target.value);
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim()) {
                doSearch(searchInput.value);
            }
        });
    }

    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            doSearch('');
        });
    }

    // Close search on click outside
    document.addEventListener('click', (e) => {
        if (searchResults && !searchResults.contains(e.target) && !searchInput?.contains(e.target)) {
            searchResults.hidden = true;
        }
    });

    // Keyboard shortcut '/' to search, 'Escape' to close
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== searchInput) {
            e.preventDefault();
            searchInput?.focus();
            searchInput?.select();
        } else if (e.key === 'Escape') {
            if (searchResults && !searchResults.hidden) {
                searchResults.hidden = true;
            } else if (regionPanel && regionPanel.classList.contains('open')) {
                closePanel();
            }
        }
    });

    // 17.5. Collapsible Sidebar Toggle & Map Resize
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebarEdgeToggle = document.getElementById('sidebarEdgeToggle');
    const sidebarElement = document.querySelector('.sidebar');

    function toggleSidebar() {
        if (!sidebarElement) return;
        sidebarElement.classList.toggle('collapsed');
        // Redraw Leaflet canvas after CSS transition (320ms) so map is 100% full width
        setTimeout(() => {
            map.invalidateSize();
        }, 320);
    }

    sidebarToggleBtn?.addEventListener('click', toggleSidebar);
    sidebarEdgeToggle?.addEventListener('click', toggleSidebar);

    // 18. Initial Render
    renderMetricCards();
    applyFilters();

    // Check URL params for direct focus on load
    const urlParams = new URLSearchParams(window.location.search);
    const initialId = urlParams.get('id');
    const initialSlug = urlParams.get('slug');
    if (initialId || initialSlug) {
        const found = REGION_DATA.find(r => (initialId && String(r.id) === String(initialId)) || (initialSlug && r.slug === initialSlug));
        if (found && typeof found.lat === 'number' && typeof found.lng === 'number') {
            map.setView([found.lat, found.lng], 9);
            selectRegion(found);
        }
    }
});

// Helper utilities
function formatNumber(n) {
    if (n === null || n === undefined || isNaN(n)) return '–';
    return Number(n).toLocaleString('id-ID');
}

function formatShortNumber(n) {
    if (n === null || n === undefined || isNaN(n)) return '–';
    const num = Number(n);
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace('.0', '') + ' Jt';
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace('.0', '') + ' Rb';
    return Number.isInteger(num) ? num.toString() : num.toFixed(1).replace('.0', '');
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