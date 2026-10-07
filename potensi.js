/* ============================================================
   Portal Data Indonesia — Potensi Pajak Controller (potensi.js)
   Mengatur visualisasi titik POI, koridor jalan, zoom interaktif,
   sidebar kontrol, dan panel detail objek berbasis bukti PAD360.
   ============================================================ */

(function () {
    const fmt = (n) => (n !== null && n !== undefined ? Number(n).toLocaleString('id-ID') : '0');
    const rp = (v) => {
        if (!v) return 'Rp 0';
        if (v >= 1) return 'Rp ' + v.toFixed(2).replace('.', ',') + ' M';
        return 'Rp ' + Math.round(v * 1000) + ' Jt';
    };

    function formatDisplayName(rawName) {
        if (!rawName) return '';
        const s = rawName.trim();
        const overrides = {
            'KEPULAUAN BANGKA BELITUNG': 'Babel',
            'KEPULAUAN RIAU': 'Kep. Riau',
            'NUSA TENGGARA BARAT': 'NTB',
            'NUSA TENGGARA TIMUR': 'NTT',
            'DI YOGYAKARTA': 'DIY',
            'DKI JAKARTA': 'DKI',
            'JAWA BARAT': 'Jabar',
            'JAWA TENGAH': 'Jateng',
            'JAWA TIMUR': 'Jatim',
            'BANTEN': 'Banten',
            'SUMATERA UTARA': 'Sumut',
            'SUMATERA BARAT': 'Sumbar',
            'SUMATERA SELATAN': 'Sumsel',
            'SULAWESI UTARA': 'Sulut',
            'SULAWESI SELATAN': 'Sulsel',
            'SULAWESI TENGGARA': 'Sultra',
            'SULAWESI TENGAH': 'Sulteng',
            'SULAWESI BARAT': 'Sulbar',
            'KALIMANTAN TIMUR': 'Kaltim',
            'KALIMANTAN BARAT': 'Kalbar',
            'KALIMANTAN SELATAN': 'Kalsel',
            'KALIMANTAN TENGAH': 'Kalteng',
            'KALIMANTAN UTARA': 'Kaltara',
            'MALUKU UTARA': 'Malut',
            'PAPUA BARAT DAYA': 'Papua B.Daya',
            'PAPUA PEGUNUNGAN': 'Papua Peg.',
            'PAPUA SELATAN': 'Papua Sel.',
            'PAPUA TENGAH': 'Papua Tgh.'
        };
        if (overrides[s.toUpperCase()]) return overrides[s.toUpperCase()];
        const clean = s.replace(/^(KAB\.|KOTA)\s+/i, '');
        return clean.toLowerCase().replace(/(?:^|\s|-)\S/g, (char) => char.toUpperCase());
    }

    const ISLAND_REGIONS = [
        {
            id: 'sumatera',
            name: 'Wilayah Sumatera',
            shortName: 'Sumatera',
            lat: 0.5,
            lng: 101.5,
            zoom: 6.2,
            provIds: [
                'aceh', 'sumatera-utara', 'sumatera-barat', 'riau', 'kepulauan-riau',
                'jambi', 'sumatera-selatan', 'kepulauan-bangka-belitung', 'bengkulu', 'lampung'
            ]
        },
        {
            id: 'jawa',
            name: 'Wilayah Jawa',
            shortName: 'Jawa',
            lat: -7.2,
            lng: 109.8,
            zoom: 7.2,
            provIds: ['banten', 'dki-jakarta', 'jawa-barat', 'jawa-tengah', 'di-yogyakarta', 'jawa-timur']
        },
        {
            id: 'kalimantan',
            name: 'Wilayah Kalimantan',
            shortName: 'Kalimantan',
            lat: -0.2,
            lng: 114.0,
            zoom: 6.2,
            provIds: ['kalimantan-barat', 'kalimantan-tengah', 'kalimantan-selatan', 'kalimantan-timur', 'kalimantan-utara']
        },
        {
            id: 'sulawesi',
            name: 'Wilayah Sulawesi',
            shortName: 'Sulawesi',
            lat: -1.8,
            lng: 121.0,
            zoom: 6.2,
            provIds: ['sulawesi-utara', 'gorontalo', 'sulawesi-tengah', 'sulawesi-barat', 'sulawesi-selatan', 'sulawesi-tenggara']
        },
        {
            id: 'bali-nusa-tenggara',
            name: 'Bali & Nusa Tenggara',
            shortName: 'Bali & NT',
            lat: -8.6,
            lng: 118.5,
            zoom: 6.8,
            provIds: ['bali', 'nusa-tenggara-barat', 'nusa-tenggara-timur']
        },
        {
            id: 'maluku',
            name: 'Wilayah Maluku',
            shortName: 'Maluku',
            lat: -2.8,
            lng: 128.5,
            zoom: 6.5,
            provIds: ['maluku-utara', 'maluku']
        },
        {
            id: 'papua',
            name: 'Wilayah Papua',
            shortName: 'Papua',
            lat: -4.0,
            lng: 137.5,
            zoom: 6.2,
            provIds: ['papua-barat-daya', 'papua-barat', 'papua-tengah', 'papua-pegunungan', 'papua-selatan', 'papua']
        }
    ];

    class PotensiController {
        constructor() {
            this.map = null;
            this.active = false;
            this.data = null;
            this.state = {
                scope: 'nasional', // 'nasional' | 'pulau' | 'provinsi' | 'kota' | 'koridor'
                selectedIsland: null,
                selectedProv: null,
                selectedCity: null,
                selectedCorridor: null,
                selectedObject: null,
                categoryFilter: 'all',
                statusFilter: 'all'
            };

            this.layers = {
                clusters: L.layerGroup(),
                poiMarkers: L.layerGroup(),
                corridors: L.layerGroup(),
                checkpoints: L.layerGroup(),
                cityBoundary: L.layerGroup()
            };
        }

        init(map) {
            this.map = map;
            window.PotensiCtrl = this;
            this.loadData();
            this.setupUI();
            this.bindEvents();
        }

        getData() {
            if (this.data) return this.data;
            if (typeof window !== 'undefined' && window.PotensiData) return window.PotensiData;
            return { provinces: [], cities: [], categories: [], corridors: {}, objects: {} };
        }

        async loadData() {
            this.data = typeof window !== 'undefined' && window.PotensiData ? window.PotensiData : null;
            try {
                const res = await fetch('potensi-data.json');
                if (res.ok) {
                    this.data = await res.json();
                    window.PotensiData = this.data;
                    if (this.active) {
                        this.renderSidebar();
                        this.renderMapLayers();
                    }
                }
            } catch (e) {
                // Fallback to preloaded script object when running via file://
            }
        }

        setupUI() {
            this.btnModeProfil = document.getElementById('btnModeProfil');
            this.btnModePotensi = document.getElementById('btnModePotensi');
            this.modeSwitcherWrap = document.getElementById('modeSwitcherWrap');
            this.headerSearch = document.querySelector('.header-search');
            this.sidebarProfileView = document.getElementById('sidebarProfileView');
            this.sidebarPotensiView = document.getElementById('sidebarPotensiView');
            this.mapContextStrip = document.getElementById('mapContextStrip');
            this.regionPanel = document.getElementById('regionPanel');
            this.rpContent = document.getElementById('rpContent');
            this.mapLegend = document.getElementById('mapLegend');
        }

        bindEvents() {
            this.btnModeProfil?.addEventListener('click', () => this.setMode('profil'));
            this.btnModePotensi?.addEventListener('click', () => this.setMode('potensi'));

            // Listen to view switcher changes (table vs map)
            const btnViewTable = document.getElementById('btnViewTable');
            const btnViewMap = document.getElementById('btnViewMap');

            btnViewTable?.addEventListener('click', () => {
                if (this.modeSwitcherWrap) this.modeSwitcherWrap.style.display = 'none';
                if (this.active) this.clearLayersFromMap();
            });

            btnViewMap?.addEventListener('click', () => {
                if (this.modeSwitcherWrap) this.modeSwitcherWrap.style.display = 'flex';
                if (this.active) this.renderMapLayers();
            });
        }

        setMode(mode) {
            const data = this.getData();
            if (mode === 'potensi') {
                this.active = true;
                this.btnModePotensi?.classList.add('active');
                this.btnModeProfil?.classList.remove('active');

                // Hide top header search bar in Potensi mode (sidebar has dedicated search)
                if (this.headerSearch) this.headerSearch.style.display = 'none';

                // Switch sidebars
                if (this.sidebarProfileView) this.sidebarProfileView.style.display = 'none';
                if (this.sidebarPotensiView) this.sidebarPotensiView.style.display = 'flex';

                // Hide standard geojson choropleth if any
                if (window.profileGeojsonLayer && this.map && this.map.hasLayer(window.profileGeojsonLayer)) {
                    this.map.removeLayer(window.profileGeojsonLayer);
                }

                // If no province is selected, start at national view
                if (!this.state.selectedProv && !this.state.selectedCity) {
                    this.state.scope = 'nasional';
                    if (this.map) this.map.flyTo([-2.5, 118], 5, { duration: 1.0 });
                }

                this.renderSidebar();
                this.renderMapLayers();
                this.updateContextStrip();
                this.updateLegend();
            } else {
                this.active = false;
                this.btnModeProfil?.classList.add('active');
                this.btnModePotensi?.classList.remove('active');

                // Restore top header search bar in Profil mode
                if (this.headerSearch) this.headerSearch.style.display = '';

                // Switch sidebars
                if (this.sidebarPotensiView) this.sidebarPotensiView.style.display = 'none';
                if (this.sidebarProfileView) this.sidebarProfileView.style.display = 'flex';

                // Remove Potensi layers
                this.clearLayersFromMap();

                // Restore standard geojson choropleth
                if (window.profileGeojsonLayer && this.map && !this.map.hasLayer(window.profileGeojsonLayer)) {
                    this.map.addLayer(window.profileGeojsonLayer);
                }

                // Restore profile context & legend
                if (window.updateProfileContext) window.updateProfileContext();
                if (window.updateProfileLegend) window.updateProfileLegend();
            }
        }

        clearLayersFromMap() {
            Object.values(this.layers).forEach((layer) => {
                if (this.map && this.map.hasLayer(layer)) {
                    this.map.removeLayer(layer);
                }
                layer.clearLayers();
            });
        }

        selectIsland(islandId, fly = true) {
            if (!islandId) {
                this.state.scope = 'nasional';
                this.state.selectedIsland = null;
                this.state.selectedProv = null;
                this.state.selectedCity = null;
                this.state.selectedCorridor = null;
                this.state.selectedObject = null;
                if (fly && this.map) this.map.flyTo([-2.5, 118], 5, { duration: 1.2 });
                this.renderSidebar();
                this.renderMapLayers();
                this.updateContextStrip();
                return;
            }
            const isl = ISLAND_REGIONS.find((i) => i.id === islandId);
            if (!isl) return;
            this.state.selectedIsland = isl;
            this.state.selectedProv = null;
            this.state.selectedCity = null;
            this.state.selectedCorridor = null;
            this.state.selectedObject = null;
            this.state.scope = 'pulau';

            if (fly && this.map) {
                const data = this.getData();
                const provsInIsland = data.provinces.filter((p) => isl.provIds.includes(p.id));
                if (provsInIsland.length > 0) {
                    const bounds = L.latLngBounds(provsInIsland.map((p) => [p.lat, p.lng]));
                    this.map.flyToBounds(bounds.pad(0.2), { duration: 1.2 });
                } else {
                    this.map.flyTo([isl.lat, isl.lng], isl.zoom || 6.5, { duration: 1.2 });
                }
            }
            this.renderSidebar();
            this.renderMapLayers();
            this.updateContextStrip();
        }

        selectProvince(provId, fly = true) {
            if (!provId) {
                if (this.state.selectedIsland) {
                    this.selectIsland(this.state.selectedIsland.id, fly);
                } else {
                    this.selectIsland(null, fly);
                }
                return;
            }
            const data = this.getData();
            const prov = data.provinces.find((p) => p.id === provId);
            if (!prov) return;

            // Automatically resolve parent island
            const isl = ISLAND_REGIONS.find((i) => i.provIds.includes(prov.id));
            this.state.selectedIsland = isl || null;
            this.state.selectedProv = prov;
            this.state.selectedCity = null; // Leave kabupaten/kota unselected
            this.state.selectedCorridor = null;
            this.state.selectedObject = null;
            this.state.scope = 'provinsi';

            if (fly && this.map) {
                const citiesInProv = data.cities.filter((c) => c.provId === prov.id);
                if (citiesInProv.length > 0) {
                    const bounds = L.latLngBounds(citiesInProv.map((c) => [c.lat, c.lng]));
                    this.map.flyToBounds(bounds.pad(0.18), { duration: 1.2 });
                } else {
                    this.map.flyTo([prov.lat, prov.lng], 7.5, { duration: 1.2 });
                }
            }
            this.renderSidebar();
            this.renderMapLayers();
            this.updateContextStrip();
        }

        selectCity(cityId, fly = true) {
            if (!cityId) {
                if (this.state.selectedProv) {
                    this.selectProvince(this.state.selectedProv.id, fly);
                } else if (this.state.selectedIsland) {
                    this.selectIsland(this.state.selectedIsland.id, fly);
                } else {
                    this.selectIsland(null, fly);
                }
                return;
            }
            const data = this.getData();
            const city = data.cities.find((c) => c.id === cityId);
            if (!city) return;
            const prov = data.provinces.find((p) => p.id === city.provId);
            const isl = prov ? ISLAND_REGIONS.find((i) => i.provIds.includes(prov.id)) : null;

            this.state.scope = 'kota';
            this.state.selectedIsland = isl || null;
            this.state.selectedProv = prov || null;
            this.state.selectedCity = city;
            this.state.selectedCorridor = null;
            this.state.selectedObject = null;

            if (fly && this.map) {
                this.map.flyTo([city.lat, city.lng], city.zoom || 13, { duration: 1.2 });
            }
            this.renderSidebar();
            this.renderMapLayers();
            this.updateContextStrip();
        }

        selectCorridor(corrId) {
            const data = this.getData();
            const corr = data.corridors[corrId];
            if (!corr) return;
            this.state.scope = 'koridor';
            this.state.selectedCorridor = corr;

            const routeCoords = corr.path || corr.route;
            if (routeCoords && routeCoords.length && this.map) {
                const bounds = L.latLngBounds(routeCoords);
                this.map.flyToBounds(bounds.pad(0.4), { duration: 1.0 });
            }
            this.renderSidebar();
            this.renderMapLayers();
            this.updateContextStrip();
        }

        selectObject(objId) {
            const data = this.getData();
            const obj = data.objects[objId];
            if (!obj) return;
            this.state.selectedObject = obj;

            if (this.map && obj.lat && obj.lng) {
                this.map.flyTo([obj.lat, obj.lng], 16, { duration: 0.8 });
            }
            this.renderMapLayers();
            this.renderDetailPanel(obj);
        }

        async fetchRoadSnappedRoute(corridor, polyline, cpMarkers) {
            if (!corridor || !corridor.checkpoints || corridor.checkpoints.length < 2) return;
            if (corridor._snappedPath && corridor._snappedPath.length) return corridor._snappedPath;
            if (corridor._fetchingRoute) return;
            corridor._fetchingRoute = true;

            try {
                const coordsStr = corridor.checkpoints.map((cp) => `${cp.lng},${cp.lat}`).join(';');
                const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
                const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
                if (!res.ok) return;
                const json = await res.json();
                if (json.code === 'Ok' && json.routes && json.routes[0]) {
                    const roadCoords = json.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                    corridor._snappedPath = roadCoords;

                    if (json.routes[0].distance) {
                        corridor.length = `${(json.routes[0].distance / 1000).toFixed(1).replace('.', ',')} km`;
                    }

                    // Snap checkpoint positions directly onto nearest road surface
                    if (json.waypoints && json.waypoints.length === corridor.checkpoints.length) {
                        json.waypoints.forEach((wp, idx) => {
                            if (wp && wp.location) {
                                corridor.checkpoints[idx].lat = wp.location[1];
                                corridor.checkpoints[idx].lng = wp.location[0];
                                if (cpMarkers && cpMarkers[idx]) {
                                    cpMarkers[idx].setLatLng([wp.location[1], wp.location[0]]);
                                }
                            }
                        });
                    }

                    if (polyline) {
                        polyline.setLatLngs(roadCoords);
                    }
                }
            } catch (err) {
                // Silently fallback to initial coordinates if offline
            } finally {
                corridor._fetchingRoute = false;
            }
        }

        renderMapLayers() {
            if (!this.active || !this.map) return;
            this.clearLayersFromMap();

            // Add layers back
            Object.values(this.layers).forEach((layer) => {
                if (!this.map.hasLayer(layer)) {
                    this.map.addLayer(layer);
                }
            });

            const data = this.getData();
            const currentCity = this.state.selectedCity;
            const currentProv = this.state.selectedProv;
            const currentIsland = this.state.selectedIsland;

            // 1. Level 1: Scope Nasional (Overview of 7 Major Island Regions)
            if (this.state.scope === 'nasional' || (!currentIsland && !currentProv && !currentCity)) {
                ISLAND_REGIONS.forEach((isl) => {
                    const provsInIsland = data.provinces.filter((p) => isl.provIds.includes(p.id));
                    const totalPoi = provsInIsland.reduce((s, p) => s + (p.poi || 0), 0);
                    const totalPot = provsInIsland.reduce((s, p) => s + (p.pot || 0), 0);

                    const iconHtml = `
                        <div class="potensi-cluster-stick-pin island-variant">
                            <div class="cluster-stick-badge">
                                <span class="poi-count">${totalPoi}</span>
                                <span class="poi-unit">POI</span>
                            </div>
                            <div class="cluster-stick-label" title="${isl.name}">${isl.shortName || isl.name}</div>
                            <div class="cluster-stick-stem"></div>
                            <div class="cluster-stick-ground">
                                <div class="ground-ring ring-outer"></div>
                                <div class="ground-ring ring-inner"></div>
                                <div class="ground-center-dot"></div>
                            </div>
                        </div>
                    `;
                    const customIcon = L.divIcon({
                        className: 'potensi-cluster-wrapper',
                        html: iconHtml,
                        iconSize: [70, 72],
                        iconAnchor: [35, 67]
                    });

                    const marker = L.marker([isl.lat, isl.lng], { icon: customIcon });
                    marker.on('click', () => {
                        this.selectIsland(isl.id);
                    });
                    this.layers.clusters.addLayer(marker);
                });
                return;
            }

            // 2. Level 2: Scope Pulau (Provinces within this selected Island)
            if (currentIsland && !currentProv && !currentCity) {
                const provsInIsland = data.provinces.filter((p) => currentIsland.provIds.includes(p.id));
                provsInIsland.forEach((p, idx) => {
                    const shortName = formatDisplayName(p.name);
                    const isEven = idx % 2 === 0;
                    const stemClass = isEven ? '' : 'stem-mid';
                    const h = isEven ? 64 : 72;
                    const anchorY = isEven ? 59 : 67;

                    const iconHtml = `
                        <div class="potensi-cluster-stick-pin ${stemClass}">
                            <div class="cluster-stick-badge">
                                <span class="poi-count">${p.poi}</span>
                                <span class="poi-unit">POI</span>
                            </div>
                            <div class="cluster-stick-label" title="${p.name}">${shortName}</div>
                            <div class="cluster-stick-stem"></div>
                            <div class="cluster-stick-ground">
                                <div class="ground-ring ring-outer"></div>
                                <div class="ground-ring ring-inner"></div>
                                <div class="ground-center-dot"></div>
                            </div>
                        </div>
                    `;
                    const customIcon = L.divIcon({
                        className: 'potensi-cluster-wrapper',
                        html: iconHtml,
                        iconSize: [54, h],
                        iconAnchor: [27, anchorY]
                    });

                    const marker = L.marker([p.lat, p.lng], { icon: customIcon });
                    marker.on('click', () => {
                        this.selectProvince(p.id);
                    });
                    this.layers.clusters.addLayer(marker);
                });
                return;
            }

            // 3. Level 3: Scope Provinsi (Kabupaten & Kota in this Province)
            if (currentProv && !currentCity) {
                const citiesInProv = data.cities.filter((c) => c.provId === currentProv.id);
                const cityIdsInProv = new Set(citiesInProv.map((c) => c.id));

                citiesInProv.forEach((city, idx) => {
                    const shortName = formatDisplayName(city.name);
                    const isEven = idx % 2 === 0;
                    const stemClass = isEven ? '' : 'stem-mid';
                    const h = isEven ? 64 : 72;
                    const anchorY = isEven ? 59 : 67;

                    const iconHtml = `
                        <div class="potensi-cluster-stick-pin city-variant ${stemClass}">
                            <div class="cluster-stick-badge">
                                <span class="poi-count">${city.poi}</span>
                                <span class="poi-unit">POI</span>
                            </div>
                            <div class="cluster-stick-label" title="${city.name}">${shortName}</div>
                            <div class="cluster-stick-stem"></div>
                            <div class="cluster-stick-ground">
                                <div class="ground-ring ring-outer"></div>
                                <div class="ground-ring ring-inner"></div>
                                <div class="ground-center-dot"></div>
                            </div>
                        </div>
                    `;
                    const customIcon = L.divIcon({
                        className: 'potensi-cluster-wrapper',
                        html: iconHtml,
                        iconSize: [54, h],
                        iconAnchor: [27, anchorY]
                    });

                    const marker = L.marker([city.lat, city.lng], { icon: customIcon });
                    marker.on('click', () => {
                        this.selectCity(city.id);
                    });
                    this.layers.clusters.addLayer(marker);
                });
                return;
            }

            // 4. Level 4: If at City Level
            if (currentCity) {
                // Render neighboring cities bubbles in the same province
                if (currentProv) {
                    data.cities
                        .filter((c) => c.provId === currentProv.id && c.id !== currentCity.id)
                        .forEach((otherCity, idx) => {
                            const shortName = formatDisplayName(otherCity.name);
                            const isEven = idx % 2 === 0;
                            const stemClass = isEven ? '' : 'stem-mid';
                            const h = isEven ? 60 : 68;
                            const anchorY = isEven ? 55 : 63;

                            const otherIconHtml = `
                                <div class="potensi-cluster-stick-pin neighbor-variant ${stemClass}">
                                    <div class="cluster-stick-badge">
                                        <span class="poi-count">${otherCity.poi}</span>
                                    </div>
                                    <div class="cluster-stick-label" title="${otherCity.name}">${shortName}</div>
                                    <div class="cluster-stick-stem"></div>
                                    <div class="cluster-stick-ground">
                                        <div class="ground-ring ring-outer"></div>
                                        <div class="ground-ring ring-inner"></div>
                                        <div class="ground-center-dot"></div>
                                    </div>
                                </div>
                            `;
                            const otherIcon = L.divIcon({
                                className: 'potensi-cluster-wrapper',
                                html: otherIconHtml,
                                iconSize: [50, h],
                                iconAnchor: [25, anchorY]
                            });
                            const otherMarker = L.marker([otherCity.lat, otherCity.lng], { icon: otherIcon });
                            otherMarker.on('click', () => {
                                this.selectCity(otherCity.id);
                            });
                            this.layers.clusters.addLayer(otherMarker);
                        });
                }

                // Render Corridors for this city (snapped to real street network)
                Object.values(data.corridors)
                    .filter((c) => c.cityId === currentCity.id)
                    .forEach((c) => {
                        const isSelected = this.state.selectedCorridor?.id === c.id;
                        const routeCoords = c._snappedPath || c.path || c.route || [];
                        if (!routeCoords.length) return;

                        const polyline = L.polyline(routeCoords, {
                            color: isSelected ? '#cf1e2e' : c.color || '#0d9488',
                            weight: isSelected ? 7 : 5,
                            opacity: isSelected ? 0.95 : 0.75,
                            dashArray: isSelected ? null : '6, 6',
                            lineCap: 'round',
                            lineJoin: 'round'
                        });

                        polyline.on('click', () => {
                            this.selectCorridor(c.id);
                        });
                        polyline.bindTooltip(`<b>${c.name}</b> (${c.length || c.km || '1,8 km'})<br>${c.status || 'Aktif'}`, { sticky: true });
                        this.layers.corridors.addLayer(polyline);

                        const cpMarkers = {};

                        // If corridor is selected, render checkpoints
                        if (isSelected && c.checkpoints) {
                            c.checkpoints.forEach((cp, idx) => {
                                const isDone = cp.done !== undefined ? cp.done : cp.status === 'done';
                                const num = cp.num || cp.n || '1';
                                const label = cp.title || cp.label || 'Checkpoint';
                                const cpIconHtml = `
                                    <div class="potensi-cp-marker ${isDone ? 'done' : 'pending'}">
                                        <span>${num}</span>
                                    </div>
                                `;
                                const cpIcon = L.divIcon({
                                    className: 'potensi-cp-wrapper',
                                    html: cpIconHtml,
                                    iconSize: [28, 28],
                                    iconAnchor: [14, 14]
                                });

                                const cpMarker = L.marker([cp.lat, cp.lng], { icon: cpIcon });
                                cpMarker.on('click', () => {
                                    this.renderCheckpointDetail(cp, c);
                                });
                                cpMarker.bindTooltip(`<b>Checkpoint ${num}</b>: ${label}<br>${isDone ? '✓ Sudah diperiksa' : '⏳ Belum diperiksa'}`, {
                                    direction: 'top',
                                    offset: [0, -14]
                                });
                                this.layers.checkpoints.addLayer(cpMarker);
                                cpMarkers[idx] = cpMarker;
                            });
                        }

                        // Auto-fetch real street routing from OSM
                        if (!c._snappedPath) {
                            this.fetchRoadSnappedRoute(c, polyline, cpMarkers);
                        }
                    });

                // Render POI Markers for this city
                Object.values(data.objects)
                    .filter((o) => o.cityId === currentCity.id)
                    .forEach((o) => {
                        // Apply category filter
                        if (this.state.categoryFilter !== 'all' && o.category !== this.state.categoryFilter) {
                            return;
                        }

                        const catMeta = data.categories.find((cat) => cat.id === o.category) || { color: '#0d9488', tag: 'POI' };
                        const isObjSelected = this.state.selectedObject?.id === o.id;

                        const poiIconHtml = `
                            <div class="potensi-stick-pin ${isObjSelected ? 'selected' : ''}" style="--pin-color: ${catMeta.color};">
                                <div class="stick-pin-head">
                                    <span class="stick-pin-badge">${catMeta.tag || 'POI'}</span>
                                </div>
                                <div class="stick-pin-stem"></div>
                                <div class="stick-pin-ground">
                                    <div class="ground-ring ring-outer"></div>
                                    <div class="ground-ring ring-inner"></div>
                                    <div class="ground-center-dot"></div>
                                </div>
                            </div>
                        `;

                        const poiIcon = L.divIcon({
                            className: 'potensi-pin-wrapper',
                            html: poiIconHtml,
                            iconSize: [40, 52],
                            iconAnchor: [20, 47]
                        });

                        const poiMarker = L.marker([o.lat, o.lng], { icon: poiIcon });
                        poiMarker.on('click', () => {
                            this.selectObject(o.id);
                        });

                        poiMarker.bindTooltip(
                            `<b>${o.name}</b><br><span style="color:${catMeta.color}">●</span> ${o.catName}<br>${o.addr}<br><b>${o.estimatedValue}</b>`,
                            { direction: 'top', offset: [0, -48] }
                        );

                        this.layers.poiMarkers.addLayer(poiMarker);
                    });
            }
        }

        renderSidebar() {
            if (!this.sidebarPotensiView) return;

            const data = this.getData();
            const provs = data.provinces || [];
            const curIsland = this.state.selectedIsland;
            const curProv = this.state.selectedProv;
            const curCity = this.state.selectedCity;

            // Filter provinces by island if selected
            const provsInIsland = curIsland ? provs.filter((p) => curIsland.provIds.includes(p.id)) : provs;
            const citiesInProv = curProv ? data.cities.filter((c) => c.provId === curProv.id) : [];
            const corridorsInCity = curCity ? Object.values(data.corridors).filter((c) => c.cityId === curCity.id) : [];
            const objectsInCity = curCity ? Object.values(data.objects).filter((o) => o.cityId === curCity.id) : [];

            // Compute active metrics based on hierarchy level
            let totalPoi = 0;
            let perluVerif = 0;
            let potFinansial = 0;

            if (curCity) {
                totalPoi = curCity.poi;
                perluVerif = curCity.ver;
                potFinansial = curCity.pot;
            } else if (curProv) {
                totalPoi = curProv.poi;
                perluVerif = curProv.ver;
                potFinansial = curProv.pot;
            } else if (curIsland) {
                totalPoi = provsInIsland.reduce((s, p) => s + (p.poi || 0), 0);
                perluVerif = provsInIsland.reduce((s, p) => s + (p.ver || 0), 0);
                potFinansial = provsInIsland.reduce((s, p) => s + (p.pot || 0), 0);
            } else {
                totalPoi = provs.reduce((s, p) => s + (p.poi || 0), 0);
                perluVerif = provs.reduce((s, p) => s + (p.ver || 0), 0);
                potFinansial = provs.reduce((s, p) => s + (p.pot || 0), 0);
            }

            this.sidebarPotensiView.innerHTML = `
                <!-- 1. Breadcrumbs Scope (Sticky Header) -->
                <div class="sidebar-section potensi-scope-section">
                    <div class="potensi-scope-bar">
                        ${
                            !curIsland && !curProv && !curCity
                                ? `<span class="scope-crumb active">Nasional</span>`
                                : curIsland && !curProv && !curCity
                                ? `<button type="button" class="scope-crumb" id="btnScopeNasional">Nasional</button><span class="crumb-sep">›</span><span class="scope-crumb active">${curIsland.shortName || curIsland.name}</span>`
                                : curProv && !curCity
                                ? `<button type="button" class="scope-crumb" id="btnScopeNasional">Nasional</button><span class="crumb-sep">›</span><span class="scope-crumb active" title="${curProv.name}">${formatDisplayName(curProv.name)}</span>`
                                : `<button type="button" class="scope-crumb" id="btnScopeNasional">Nasional</button><span class="crumb-sep">›</span><button type="button" class="scope-crumb" id="btnScopeProv" title="${curProv ? curProv.name : 'Provinsi'}">${curProv ? formatDisplayName(curProv.name) : 'Provinsi'}</button><span class="crumb-sep">›</span><span class="scope-crumb active" title="${curCity.name}">${formatDisplayName(curCity.name)}</span>`
                        }
                    </div>
                </div>

                <!-- 2. Hierarki Wilayah Dropdown & Quick Search -->
                <div class="sidebar-section">
                    <div class="section-header">
                        <span class="section-tag">Wilayah Eksplorasi Potensi</span>
                    </div>

                    <!-- Quick Search Box -->
                    <div class="potensi-search-box">
                        <div class="potensi-search-input-wrap">
                            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            <input type="text" id="potensiSearchInput" class="potensi-search-input" placeholder="Cari kota / kabupaten / provinsi..." autocomplete="off">
                            <button type="button" id="potensiSearchClear" class="potensi-search-clear" aria-label="Hapus pencarian">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div id="potensiSearchResults" class="potensi-search-results"></div>
                    </div>

                    <div class="potensi-select-grid">
                        <label class="potensi-select-label">
                            <span>Provinsi</span>
                            <select id="potensiProvSelect" class="potensi-select">
                                <option value="" ${!curProv ? 'selected' : ''}>-- Pilih Provinsi (${provs.length} Provinsi) --</option>
                                ${provs.map((p) => `<option value="${p.id}" ${curProv && p.id === curProv.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                            </select>
                        </label>
                        <label class="potensi-select-label">
                            <span>Kabupaten / Kota</span>
                            <select id="potensiCitySelect" class="potensi-select" ${!curProv ? 'disabled style="opacity: 0.65; cursor: not-allowed;"' : ''}>
                                ${
                                    !curProv
                                        ? `<option value="" selected>-- Pilih Provinsi Terlebih Dahulu --</option>`
                                        : `
                                    <option value="" ${!curCity ? 'selected' : ''}>-- Pilih Kabupaten / Kota (${citiesInProv.length} Daerah) --</option>
                                    ${citiesInProv.map((c) => `<option value="${c.id}" ${curCity && c.id === curCity.id ? 'selected' : ''}>${c.name} (${c.poi} POI)</option>`).join('')}
                                `
                                }
                            </select>
                        </label>
                    </div>
                </div>

                <!-- 3. KPI Potensi Pajak (PAD360) -->
                <div class="sidebar-section">
                    <div class="section-header">
                        <span class="section-tag">${curCity ? `Indikasi Potensi: ${curCity.name}` : curProv ? `Indikasi Potensi: Provinsi ${curProv.name}` : curIsland ? `Indikasi Potensi: ${curIsland.name}` : `Indikasi Potensi: Nasional (38 Provinsi)`}</span>
                    </div>
                    <div class="potensi-kpi-grid">
                        <div class="pot-kpi-card">
                            <span class="pot-kpi-val" style="color: #0d9488;">${fmt(totalPoi)}</span>
                            <span class="pot-kpi-lbl">POI Terpetakan</span>
                        </div>
                        <div class="pot-kpi-card">
                            <span class="pot-kpi-val" style="color: #d97706;">${fmt(perluVerif)}</span>
                            <span class="pot-kpi-lbl">Perlu Verifikasi</span>
                        </div>
                        <div class="pot-kpi-card wide">
                            <span class="pot-kpi-val" style="color: #0369a1;">${rp(potFinansial)}</span>
                            <span class="pot-kpi-lbl">Potensi Indikatif / Tahun</span>
                            <span class="pot-kpi-sub">${curCity ? 'Asumsi dasar pengenaan tarif Perda Bapenda' : curProv ? `Akumulasi ${citiesInProv.length} kabupaten & kota` : curIsland ? `Akumulasi ${provsInIsland.length} provinsi di ${curIsland.name}` : 'Akumulasi 514 kabupaten & kota se-Indonesia'}</span>
                        </div>
                    </div>
                </div>

                <!-- 4. Filter Kategori Objek / POI -->
                <div class="sidebar-section">
                    <div class="section-header">
                        <span class="section-tag">Filter Kategori POI</span>
                    </div>
                    <div class="potensi-cat-pills">
                        <button type="button" class="pot-cat-pill ${this.state.categoryFilter === 'all' ? 'active' : ''}" data-cat="all">
                            Semua
                        </button>
                        ${(data.categories || [])
                            .map(
                                (c) => `
                            <button type="button" class="pot-cat-pill ${this.state.categoryFilter === c.id ? 'active' : ''}" data-cat="${c.id}">
                                <span class="cat-dot" style="background:${c.color};"></span> ${c.name || c.label}
                            </button>
                        `
                            )
                            .join('')}
                    </div>
                </div>

                ${
                    !curIsland && !curProv && !curCity
                        ? `
                <!-- Level 0: 7 Wilayah Utama Indonesia -->
                <div class="sidebar-section" style="flex: 1;">
                    <div class="section-header">
                        <span class="section-tag">7 Wilayah Utama Indonesia</span>
                    </div>
                    <p style="font-size: 11.5px; color: var(--text-mid); margin: 0 0 8px;">
                        Pilih salah satu wilayah di bawah atau klik pin di peta untuk eksplorasi provinsi:
                    </p>
                    <div class="potensi-object-list" style="display: flex; flex-direction: column; gap: 8px;">
                        ${ISLAND_REGIONS.map((isl) => {
                            const islandProvs = provs.filter((p) => isl.provIds.includes(p.id));
                            const pCount = islandProvs.reduce((s, p) => s + (p.poi || 0), 0);
                            const pPot = islandProvs.reduce((s, p) => s + (p.pot || 0), 0);
                            return `
                                <div class="pot-corr-card" data-island-pick="${isl.id}" style="cursor: pointer;">
                                    <div class="corr-header">
                                        <b style="font-size: 12.5px;">${isl.name}</b>
                                        <span class="corr-badge" style="background: #ccfbf1; color: #0f766e;">${isl.provIds.length} Provinsi</span>
                                    </div>
                                    <div class="corr-lead">${pCount} Titik POI Terpetakan</div>
                                    <div class="corr-meta" style="margin-top: 4px;">
                                        <span>Estimasi: <b>${rp(pPot)}</b></span>
                                        <span class="corr-progress" style="background: #e0f2fe; color: #0369a1;">Lihat Wilayah →</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                `
                        : curIsland && !curProv
                        ? `
                <!-- Level 1: Daftar Provinsi di Wilayah Terpilih -->
                <div class="sidebar-section" style="flex: 1;">
                    <div class="section-header">
                        <span class="section-tag">Provinsi di ${curIsland.name} (${provsInIsland.length})</span>
                    </div>
                    <p style="font-size: 11.5px; color: var(--text-mid); margin: 0 0 8px;">
                        Pilih provinsi di bawah atau klik titik pin di peta untuk eksplorasi kabupaten/kota:
                    </p>
                    <div class="potensi-object-list" style="display: flex; flex-direction: column; gap: 8px;">
                        ${provsInIsland
                            .map(
                                (p) => `
                            <div class="pot-corr-card" data-prov-pick="${p.id}" style="cursor: pointer;">
                                <div class="corr-header">
                                    <b style="font-size: 12.5px;">${p.name}</b>
                                    <span class="corr-badge" style="background: #ccfbf1; color: #0f766e;">${p.poi} POI</span>
                                </div>
                                <div class="corr-meta" style="margin-top: 4px;">
                                    <span>Estimasi: <b>${rp(p.pot)}</b></span>
                                    <span class="corr-progress" style="background: #e0f2fe; color: #0369a1;">${p.ver} Verifikasi</span>
                                </div>
                            </div>
                        `
                            )
                            .join('')}
                    </div>
                </div>
                `
                        : curProv && !curCity
                        ? `
                <!-- Level 2: Daftar Kabupaten & Kota di Provinsi Terpilih -->
                <div class="sidebar-section" style="flex: 1;">
                    <div class="section-header">
                        <span class="section-tag">Kabupaten &amp; Kota (${citiesInProv.length})</span>
                    </div>
                    <p style="font-size: 11.5px; color: var(--text-mid); margin: 0 0 8px;">
                        Pilih salah satu daerah di bawah atau klik titik pin di peta untuk melihat detail titik POI &amp; koridor:
                    </p>
                    <div class="potensi-object-list" style="display: flex; flex-direction: column; gap: 8px;">
                        ${citiesInProv
                            .map(
                                (c) => `
                            <div class="pot-corr-card" data-city-pick="${c.id}" style="cursor: pointer;">
                                <div class="corr-header">
                                    <b style="font-size: 12.5px;">${c.name}</b>
                                    <span class="corr-badge" style="background: #ccfbf1; color: #0f766e;">${c.poi} POI</span>
                                </div>
                                <div class="corr-meta" style="margin-top: 4px;">
                                    <span>Estimasi: <b>${rp(c.pot)}</b></span>
                                    <span class="corr-progress" style="background: #e0f2fe; color: #0369a1;">${c.ver} Verifikasi</span>
                                </div>
                            </div>
                        `
                            )
                            .join('')}
                    </div>
                </div>
                `
                        : `
                <!-- Level 3: Antrean Koridor Prioritas & POI Objek di Kota Terpilih -->
                <div class="sidebar-section">
                    <div class="section-header">
                        <span class="section-tag">Koridor Penyisiran Lapangan</span>
                    </div>
                    <p style="font-size: 11.5px; color: var(--text-mid); margin: 0 0 8px;">
                        Pilih koridor jalan di ${curCity.name} untuk melihat titik pemeriksaan (*checkpoint*):
                    </p>
                    <div class="potensi-corridor-list">
                        ${corridorsInCity
                            .map((c) => {
                                const isSel = this.state.selectedCorridor?.id === c.id;
                                const checkedCount = (c.checkpoints || []).filter((cp) => cp.status === 'done' || cp.done).length;
                                return `
                                <div class="pot-corr-card ${isSel ? 'active' : ''}" data-corr="${c.id}">
                                    <div class="corr-header">
                                        <b>${c.name}</b>
                                        <span class="corr-badge">${c.length || c.km || '1,8 km'}</span>
                                    </div>
                                    <span class="corr-lead">${c.scope || c.lead || 'Jalan Protokol'}</span>
                                    <div class="corr-meta">
                                        <span>${c.status || 'Aktif'}</span>
                                        <span class="corr-progress">${checkedCount}/${(c.checkpoints || []).length} Titik</span>
                                    </div>
                                </div>
                            `;
                            })
                            .join('')}
                    </div>
                </div>

                <div class="sidebar-section" style="flex: 1;">
                    <div class="section-header">
                        <span class="section-tag">Titik Objek Terdata (${objectsInCity.length})</span>
                    </div>
                    <div class="potensi-object-list" style="display: flex; flex-direction: column; gap: 8px;">
                        ${objectsInCity
                            .map((obj) => {
                                const isSel = this.state.selectedObject?.id === obj.id;
                                const catMeta = data.categories.find((c) => c.id === obj.category) || { color: '#0d9488', tag: 'POI' };
                                return `
                                <div class="pot-corr-card ${isSel ? 'active' : ''}" data-obj="${obj.id}" style="cursor: pointer;">
                                    <div class="corr-header">
                                        <b style="font-size: 12px;">${obj.name}</b>
                                        <span class="corr-badge" style="background: ${catMeta.color}22; color: ${catMeta.color}; border: 1px solid ${catMeta.color}44;">${catMeta.tag}</span>
                                    </div>
                                    <span class="corr-lead">${obj.addr}</span>
                                    <div class="corr-meta" style="margin-top: 4px;">
                                        <span style="font-weight: 600; color: #0f766e;">${obj.estimatedValue}</span>
                                        <span class="corr-progress" style="background: #e0f2fe; color: #0369a1;">Tahap ${obj.stage}</span>
                                    </div>
                                </div>
                            `;
                            })
                            .join('')}
                    </div>
                </div>
                `
                }
            `;

            // Attach listeners to dynamic elements
            const searchInput = document.getElementById('potensiSearchInput');
            const searchClear = document.getElementById('potensiSearchClear');
            const searchResults = document.getElementById('potensiSearchResults');

            if (searchInput && searchResults) {
                const handleSearch = () => {
                    const q = searchInput.value.trim().toLowerCase();
                    if (!q) {
                        if (searchClear) searchClear.style.display = 'none';
                        searchResults.innerHTML = '';
                        searchResults.classList.remove('open');
                        return;
                    }
                    if (searchClear) searchClear.style.display = 'flex';

                    // Search across all 514 cities & 38 provinces
                    const matchedCities = data.cities.filter((c) => {
                        const provName = (data.provinces.find((p) => p.id === c.provId)?.name || '').toLowerCase();
                        return c.name.toLowerCase().includes(q) || provName.includes(q) || c.id.toLowerCase().includes(q);
                    }).slice(0, 15);

                    if (!matchedCities.length) {
                        searchResults.innerHTML = `<div class="pot-search-empty">Tidak ada wilayah yang cocok dengan "<b>${q}</b>"</div>`;
                        searchResults.classList.add('open');
                        return;
                    }

                    searchResults.innerHTML = matchedCities
                        .map((c) => {
                            const prov = data.provinces.find((p) => p.id === c.provId);
                            const provName = prov ? prov.name : '';
                            return `
                            <button type="button" class="potensi-search-item" data-city="${c.id}" data-prov="${c.provId}">
                                <div class="pot-search-info">
                                    <span class="pot-search-name">${c.name}</span>
                                    <span class="pot-search-prov">${provName}</span>
                                </div>
                                <span class="pot-search-badge">${c.poi} POI</span>
                            </button>
                        `;
                        })
                        .join('');

                    searchResults.classList.add('open');

                    searchResults.querySelectorAll('.potensi-search-item').forEach((item) => {
                        item.addEventListener('click', () => {
                            const cId = item.dataset.city;
                            searchInput.value = '';
                            if (searchClear) searchClear.style.display = 'none';
                            searchResults.innerHTML = '';
                            searchResults.classList.remove('open');
                            this.selectCity(cId, true);
                        });
                    });
                };

                searchInput.addEventListener('input', handleSearch);
                searchInput.addEventListener('focus', () => {
                    if (searchInput.value.trim()) handleSearch();
                });

                searchClear?.addEventListener('click', () => {
                    searchInput.value = '';
                    searchClear.style.display = 'none';
                    searchResults.innerHTML = '';
                    searchResults.classList.remove('open');
                    searchInput.focus();
                });

                document.addEventListener('click', (e) => {
                    if (!e.target.closest('.potensi-search-box')) {
                        searchResults.classList.remove('open');
                    }
                });
            }

            document.getElementById('btnScopeNasional')?.addEventListener('click', () => {
                this.selectIsland(null, true);
            });

            document.getElementById('btnScopeIsland')?.addEventListener('click', () => {
                if (curIsland) this.selectIsland(curIsland.id, true);
            });

            document.getElementById('btnScopeProv')?.addEventListener('click', () => {
                if (curProv) this.selectProvince(curProv.id, true);
            });

            document.getElementById('potensiProvSelect')?.addEventListener('change', (e) => {
                this.selectProvince(e.target.value);
            });

            document.getElementById('potensiCitySelect')?.addEventListener('change', (e) => {
                this.selectCity(e.target.value);
            });

            this.sidebarPotensiView.querySelectorAll('.pot-cat-pill').forEach((btn) => {
                btn.addEventListener('click', () => {
                    this.state.categoryFilter = btn.dataset.cat;
                    this.renderSidebar();
                    this.renderMapLayers();
                });
            });

            this.sidebarPotensiView.querySelectorAll('.pot-corr-card[data-island-pick]').forEach((card) => {
                card.addEventListener('click', () => {
                    this.selectIsland(card.dataset.islandPick);
                });
            });

            this.sidebarPotensiView.querySelectorAll('.pot-corr-card[data-prov-pick]').forEach((card) => {
                card.addEventListener('click', () => {
                    this.selectProvince(card.dataset.provPick);
                });
            });

            this.sidebarPotensiView.querySelectorAll('.pot-corr-card[data-city-pick]').forEach((card) => {
                card.addEventListener('click', () => {
                    this.selectCity(card.dataset.cityPick);
                });
            });

            this.sidebarPotensiView.querySelectorAll('.pot-corr-card[data-corr]').forEach((card) => {
                card.addEventListener('click', () => {
                    this.selectCorridor(card.dataset.corr);
                });
            });

            this.sidebarPotensiView.querySelectorAll('.pot-corr-card[data-obj]').forEach((card) => {
                card.addEventListener('click', () => {
                    this.selectObject(card.dataset.obj);
                });
            });
        }

        updateContextStrip() {
            if (!this.mapContextStrip) return;
            const dot = this.mapContextStrip.querySelector('.dot');
            const mainLabel = this.mapContextStrip.querySelector('span:nth-child(2)');
            const subLabel = this.mapContextStrip.querySelector('.sub-tag');

            if (dot) dot.style.background = '#0d9488';
            if (mainLabel) {
                if (this.state.selectedCity) {
                    mainLabel.innerHTML = `Mode Potensi: <b>${this.state.selectedCity.name}</b>`;
                } else if (this.state.selectedProv) {
                    mainLabel.innerHTML = `Mode Potensi: <b>Provinsi ${this.state.selectedProv.name}</b>`;
                } else if (this.state.selectedIsland) {
                    mainLabel.innerHTML = `Mode Potensi: <b>${this.state.selectedIsland.name}</b>`;
                } else {
                    mainLabel.innerHTML = `Mode Potensi: <b>Peta Sebaran Potensi</b>`;
                }
            }
            if (subLabel) {
                if (this.state.selectedCorridor) {
                    subLabel.textContent = `${this.state.selectedCorridor.name} • ${this.state.selectedCorridor.length || this.state.selectedCorridor.km || '1,8 km'}`;
                } else if (this.state.selectedCity) {
                    subLabel.textContent = `${this.state.selectedCity.poi} Titik POI • Estimasi ${rp(this.state.selectedCity.pot)}`;
                } else if (this.state.selectedProv) {
                    subLabel.textContent = `${this.state.selectedProv.poi} Titik POI • Estimasi ${rp(this.state.selectedProv.pot)}`;
                } else if (this.state.selectedIsland) {
                    subLabel.textContent = `${this.state.selectedIsland.name} • ${this.state.selectedIsland.provIds.length} Provinsi`;
                } else {
                    subLabel.textContent = '7 Wilayah Utama • 514 Kabupaten & Kota';
                }
            }
        }

        updateLegend() {
            if (!this.mapLegend) return;
            this.mapLegend.innerHTML = `
                <div class="leg-title">Kategori Objek Potensi Pajak (PAD360)</div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; font-size: 11px;">
                    <span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#0E9E9A;margin-right:4px;"></i>Reklame</span>
                    <span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#d97706;margin-right:4px;"></i>Parkir PBJT</span>
                    <span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#7c3aed;margin-right:4px;"></i>Mall / PBB</span>
                    <span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#2563eb;margin-right:4px;"></i>Pabrik/Gudang</span>
                    <span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#059669;margin-right:4px;"></i>Ruang Publik</span>
                    <span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;margin-right:4px;"></i>Koridor Sisir</span>
                </div>
            `;
        }

        renderDetailPanel(obj) {
            if (!this.regionPanel || !this.rpContent) return;

            const data = this.getData();
            const city = data.cities.find((c) => c.id === obj.cityId);
            const prov = city ? data.provinces.find((p) => p.id === city.provId) : null;
            const regionLabel = city ? `${city.name}${prov ? ', ' + prov.name : ''}` : obj.cityId;

            const stepperFlow = ['Impor POI', 'Prioritas', 'Survei & Bukti', 'Validasi Objek', 'Tindak Lanjut', 'Realisasi'];

            this.rpContent.innerHTML = `
                <div class="rp-type-tag" style="background:#ccfbf1; color:#0f766e;">${obj.catName}</div>
                <div class="rp-prov">${obj.id} • ${regionLabel}</div>
                <h2 class="rp-name" style="font-size: 18px; margin-bottom: 6px;">${obj.name}</h2>
                
                <!-- Mockup Foto Objek / Board -->
                <div class="potensi-obj-photo">
                    <div class="board-mockup">
                        <span>${obj.name}</span>
                    </div>
                    <span class="photo-caption">Ilustrasi Bukti Lapangan • ${obj.addr}</span>
                </div>

                <!-- Spotlight Potensi Finansial -->
                <div class="rp-spotlight" style="background: linear-gradient(135deg, #f0fdfa, #e0f2fe); border-color: #99f6e4;">
                    <div class="sp-label">${obj.taxType} (Estimasi)</div>
                    <div class="sp-val" style="color: #0f766e; font-size: 18px;">${obj.estimatedValue}</div>
                    <div class="sp-compare" style="font-size: 11px;">Dasar: ${obj.formula}</div>
                </div>

                <!-- Spesifikasi Fisik & Legalitas -->
                <div class="potensi-spec-card">
                    <div class="spec-row"><span>Dimensi Fisik</span><b>${obj.w} × ${obj.h} meter (${obj.w * obj.h} m²)</b></div>
                    <div class="spec-row"><span>Jenis / Sisi</span><b>${obj.jenis} (${obj.sisi} Sisi)</b></div>
                    <div class="spec-row"><span>Pemilik / Operator</span><b>${obj.owner}</b></div>
                    <div class="spec-row"><span>Periode Pajak</span><b>${obj.periode}</b></div>
                    <div class="spec-row"><span>Status Register</span><b style="color:${obj.regStatus.includes('Cocok') || obj.regStatus.includes('Tervalidasi') ? '#0d9488' : '#d97706'}">${obj.regStatus}</b></div>
                    <div class="spec-row"><span>Izin Usaha / Lokasi</span><b>${obj.izinUsaha}</b></div>
                </div>

                <!-- 6 Tahap Alur Kasus -->
                <div style="margin: 14px 0 8px;">
                    <b style="font-size: 12px; color: var(--text-hi);">Alur Verifikasi Objek</b>
                    <div class="potensi-stepper">
                        ${stepperFlow
                            .map((step, idx) => {
                                const isDone = idx < obj.stage;
                                const isNow = idx === obj.stage;
                                return `
                                <div class="step-item ${isDone ? 'done' : isNow ? 'now' : ''}">
                                    <span class="step-num">${idx + 1}${isDone ? ' ✓' : ''}</span>
                                    <span class="step-lbl">${step}</span>
                                </div>
                            `;
                            })
                            .join('')}
                    </div>
                </div>

                <!-- Objek Terkait di Lokasi Sama -->
                ${
                    obj.related && obj.related.length
                        ? `
                    <div style="margin: 14px 0 8px;">
                        <b style="font-size: 12px; color: var(--text-hi);">Objek Terkait di Titik Ini</b>
                        <div class="potensi-related-list">
                            ${obj.related
                                .map(
                                    (rel) => `
                                <div class="rel-item">
                                    <span><b>${rel.id}</b> · ${rel.title}</span>
                                    <span class="rel-badge ${rel.badge}">${rel.type}</span>
                                </div>
                            `
                                )
                                .join('')}
                        </div>
                    </div>
                `
                        : ''
                }

                <!-- Riwayat Observasi Lapangan -->
                <div style="margin: 14px 0 8px;">
                    <b style="font-size: 12px; color: var(--text-hi);">Riwayat Observasi & Bukti</b>
                    <div class="potensi-timeline">
                        ${(obj.hist || [])
                            .map(
                                (h) => `
                            <div class="tl-row">
                                <span class="tl-date">${h[0]}</span>
                                <div class="tl-body">
                                    <b>${h[1]}</b>
                                    <small>${h[2]}</small>
                                </div>
                            </div>
                        `
                            )
                            .join('')}
                    </div>
                </div>

                <!-- Action Button: Update Data -->
                <button type="button" class="btn btn-primary" id="btnOpenUpdateModal" style="width: 100%; margin-top: 16px; justify-content: center; background: #0f766e; border-color: #0f766e; font-weight: 700;">
                    Update Data Objek (Pajak & Izin)
                </button>
            `;

            this.regionPanel.classList.add('open');

            document.getElementById('btnOpenUpdateModal')?.addEventListener('click', () => {
                this.openUpdateModal(obj);
            });
        }

        openUpdateModal(obj) {
            let modal = document.getElementById('potensiUpdateModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'potensiUpdateModal';
                modal.className = 'potensi-modal-backdrop';
                document.body.appendChild(modal);
            }

            modal.innerHTML = `
                <div class="potensi-modal-dialog">
                    <div class="potensi-modal-header">
                        <div>
                            <span style="font-size: 11px; font-weight: 700; color: #0f766e; text-transform: uppercase;">Update Status & Data Objek</span>
                            <h3 style="margin-top: 2px;">${obj.name} (${obj.id})</h3>
                        </div>
                        <button type="button" class="potensi-modal-close" id="btnCloseUpdateModal" aria-label="Tutup">&times;</button>
                    </div>

                    <form id="potensiUpdateForm" class="potensi-modal-body">
                        <div class="potensi-form-group">
                            <label for="updRegStatus">Status Register / Status Pajak</label>
                            <select id="updRegStatus" class="potensi-form-control">
                                <option value="Tervalidasi / Lunas Bayar Pajak" ${obj.regStatus.includes('Tervalidasi') || obj.regStatus.includes('Cocok') ? 'selected' : ''}>Tervalidasi / Lunas Bayar Pajak</option>
                                <option value="Penetapan SKPD (Surat Ketetapan)" ${obj.regStatus.includes('SKPD') ? 'selected' : ''}>Penetapan SKPD / Menunggu Pembayaran</option>
                                <option value="Perlu Pencocokan Register" ${obj.regStatus.includes('Perlu') ? 'selected' : ''}>Perlu Pencocokan Register</option>
                                <option value="Kandidat Baru (Belum Terdaftar)" ${obj.regStatus.includes('Kandidat') ? 'selected' : ''}>Kandidat Baru (Belum Terdaftar)</option>
                                <option value="Bukan Objek Pajak" ${obj.regStatus.includes('Bukan') ? 'selected' : ''}>Bukan Objek Pajak</option>
                            </select>
                        </div>

                        <div class="potensi-form-group">
                            <label for="updIzinUsaha">Status Izin Usaha / Reklame</label>
                            <select id="updIzinUsaha" class="potensi-form-control">
                                <option value="Terverifikasi" ${obj.izinUsaha === 'Terverifikasi' ? 'selected' : ''}>Terverifikasi / Izin Lengkap</option>
                                <option value="Dokumen Diunggah" ${obj.izinUsaha.includes('Dokumen') ? 'selected' : ''}>Dokumen Diunggah (Proses Telaah)</option>
                                <option value="Belum diverifikasi" ${obj.izinUsaha.includes('Belum') ? 'selected' : ''}>Belum Diverifikasi</option>
                                <option value="Tidak Ada Izin" ${obj.izinUsaha.includes('Tidak') ? 'selected' : ''}>Tidak Ada Izin / Ilegal</option>
                            </select>
                        </div>

                        <div class="potensi-form-group">
                            <label for="updStage">Tahapan Alur Verifikasi</label>
                            <select id="updStage" class="potensi-form-control">
                                <option value="1" ${obj.stage === 1 ? 'selected' : ''}>Tahap 1: Impor POI Awal</option>
                                <option value="2" ${obj.stage === 2 ? 'selected' : ''}>Tahap 2: Penentuan Prioritas</option>
                                <option value="3" ${obj.stage === 3 ? 'selected' : ''}>Tahap 3: Survei Lapangan & Bukti</option>
                                <option value="4" ${obj.stage === 4 ? 'selected' : ''}>Tahap 4: Validasi Objek & Ukuran</option>
                                <option value="5" ${obj.stage === 5 ? 'selected' : ''}>Tahap 5: Tindak Lanjut Bapenda / SKPD</option>
                                <option value="6" ${obj.stage >= 6 ? 'selected' : ''}>Tahap 6: Realisasi Pembayaran Kas Daerah</option>
                            </select>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div class="potensi-form-group">
                                <label for="updW">Lebar (Meter)</label>
                                <input type="number" id="updW" class="potensi-form-control" value="${obj.w}" min="1" step="0.5">
                            </div>
                            <div class="potensi-form-group">
                                <label for="updH">Tinggi / Panjang (Meter)</label>
                                <input type="number" id="updH" class="potensi-form-control" value="${obj.h}" min="1" step="0.5">
                            </div>
                        </div>

                        <div class="potensi-form-group">
                            <label for="updReason">Alasan Perubahan / Catatan Verifikasi</label>
                            <textarea id="updReason" class="potensi-form-control" rows="2" placeholder="Contoh: Wajib pajak sudah melunasi SKPD nomor 0192/BAPENDA dan izin diperpanjang."></textarea>
                        </div>
                    </form>

                    <div class="potensi-modal-footer">
                        <button type="button" class="btn" id="btnCancelUpdateModal" style="background: var(--surface); border: 1px solid var(--line);">Batal</button>
                        <button type="submit" form="potensiUpdateForm" class="btn btn-primary" style="background:#0f766e; border-color:#0f766e; font-weight:700;">Simpan Perubahan Data</button>
                    </div>
                </div>
            `;

            modal.classList.add('open');

            const closeModal = () => {
                modal.classList.remove('open');
            };

            modal.querySelector('#btnCloseUpdateModal')?.addEventListener('click', closeModal);
            modal.querySelector('#btnCancelUpdateModal')?.addEventListener('click', closeModal);

            modal.querySelector('#potensiUpdateForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const newReg = modal.querySelector('#updRegStatus').value;
                const newIzin = modal.querySelector('#updIzinUsaha').value;
                const newStage = parseInt(modal.querySelector('#updStage').value, 10) || obj.stage;
                const newW = parseFloat(modal.querySelector('#updW').value) || obj.w;
                const newH = parseFloat(modal.querySelector('#updH').value) || obj.h;
                const reason = modal.querySelector('#updReason').value.trim() || 'Pembaruan status kepatuhan pajak & izin oleh Admin.';

                // Update Object state
                obj.regStatus = newReg;
                obj.izinUsaha = newIzin;
                obj.stage = newStage;
                obj.w = newW;
                obj.h = newH;

                const todayStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                obj.hist = obj.hist || [];
                obj.hist.unshift([
                    todayStr,
                    `Status diperbarui: ${newReg} (${newIzin})`,
                    `Admin Bapenda · ${reason}`
                ]);

                closeModal();
                this.renderDetailPanel(obj);
                this.renderMapLayers();
            });
        }

        renderCheckpointDetail(cp, corridor) {
            if (!this.regionPanel || !this.rpContent) return;

            const isDone = cp.done !== undefined ? cp.done : cp.status === 'done';
            const num = cp.num || cp.n || '1';
            const label = cp.title || cp.label || 'Checkpoint';

            this.rpContent.innerHTML = `
                <div class="rp-type-tag" style="background:#fef3c7; color:#b45309;">Titik Checkpoint</div>
                <div class="rp-prov">Checkpoint ${num} • ${corridor.name}</div>
                <h2 class="rp-name" style="font-size: 18px; margin-bottom: 6px;">${label}</h2>

                <div class="potensi-spec-card" style="margin-top: 12px;">
                    <div class="spec-row"><span>Status</span><b>${isDone ? '✓ Sudah Diperiksa' : '⏳ Belum Diperiksa'}</b></div>
                    <div class="spec-row"><span>Koridor</span><b>${corridor.name}</b></div>
                    <div class="spec-row"><span>Catatan</span><b>${cp.note || 'Tidak ada catatan tambahan.'}</b></div>
                </div>

                <div style="padding: 16px; text-align: center; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; margin-top: 14px; font-size: 12px; color: var(--text-mid);">
                    Titik pengawasan fisik tim lapangan untuk mencocokkan izin reklame, parkir, dan PBB di sepanjang rute.
                </div>
            `;

            this.regionPanel.classList.add('open');
        }
    }

    window.PotensiController = PotensiController;
})();
