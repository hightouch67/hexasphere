import * as THREE from 'three';
import { HexaSphere } from './src/hexasphere';

// Initialize Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000011, 1);

// Add lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 10, 5);
scene.add(directionalLight);

// Position camera
camera.position.z = 80;

// Create hexasphere (smaller for network visualization)
let hexasphere = new HexaSphere(30, 30, 0.98, scene, 'planet');

// Add sample cities for testing
setTimeout(() => {
    addSampleCities();
}, 2000); // Wait 2 seconds for hexasphere to initialize

// Domain management
let domains = [];
let domainTileMap = new Map(); // domain -> tileIndex
let selectedDomain = null;
let sampleCitiesAdded = false; // Flag to prevent duplicate sample cities

// Sample cities for testing (from main.ts)
const sampleCities = [
    { name: "Tokyo", lat: 35.6762, lon: 139.6503, color: 0xffff00 },
    { name: "Moscow", lat: 55.7558, lon: 37.6173, color: 0x00ff00 },
    { name: "New York", lat: 40.7128, lon: -74.0060, color: 0xff4444 },
    { name: "London", lat: 51.5074, lon: -0.1278, color: 0x4444ff },
    { name: "Sydney", lat: -33.8688, lon: 151.2093, color: 0x44ffff },
    { name: "Cairo", lat: 30.0444, lon: 31.2357, color: 0xff8844 },
    { name: "Mumbai", lat: 19.0760, lon: 72.8777, color: 0xff44ff },
    { name: "São Paulo", lat: -23.5505, lon: -46.6333, color: 0x88ff44 },
    { name: "Cape Town", lat: -33.9249, lon: 18.4241, color: 0xffffff },
    { name: "Los Angeles", lat: 34.0522, lon: -118.2437, color: 0xff8800 },
    { name: "Beijing", lat: 39.9042, lon: 116.4074, color: 0xff0000 },
    { name: "Paris", lat: 48.8566, lon: 2.3522, color: 0x0000ff },
    { name: "Dubai", lat: 25.2048, lon: 55.2708, color: 0x00ffff },
    { name: "Rio de Janeiro", lat: -22.9068, lon: -43.1729, color: 0x00ff00 },
    { name: "Toronto", lat: 43.6532, lon: -79.3832, color: 0x800080 }
];

// Mouse controls
let mouseDown = false;
let mouseX = 0, mouseY = 0;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Get IP geolocation (latitude/longitude)
async function getIPGeolocation(ip) {
    // Try multiple geolocation APIs in order
    const apis = [
        {
            name: 'ipapi.co',
            url: `https://ipapi.co/${ip}/json/`,
            parse: (data) => ({
                latitude: data.latitude,
                longitude: data.longitude,
                country: data.country_name,
                city: data.city,
                timezone: data.timezone
            })
        },
        {
            name: 'ip-api.com',
            url: `http://ip-api.com/json/${ip}?fields=status,lat,lon,country,city,timezone`,
            parse: (data) => data.status === 'success' ? ({
                latitude: data.lat,
                longitude: data.lon,
                country: data.country,
                city: data.city,
                timezone: data.timezone
            }) : null
        },
        {
            name: 'ipinfo.io',
            url: `https://ipinfo.io/${ip}/json`,
            parse: (data) => {
                const [lat, lon] = (data.loc || '0,0').split(',').map(Number);
                return {
                    latitude: lat,
                    longitude: lon,
                    country: data.country,
                    city: data.city,
                    timezone: data.timezone
                };
            }
        }
    ];
    
    for (const api of apis) {
        try {
            console.log(`Trying ${api.name} for IP ${ip}`);
            const response = await fetch(api.url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const result = api.parse(data);
            
            if (result && result.latitude && result.longitude) {
                console.log(`Successfully geolocated ${ip} using ${api.name}: ${result.city}, ${result.country}`);
                return result;
            }
        } catch (error) {
            console.warn(`${api.name} failed for IP ${ip}:`, error);
            continue;
        }
    }
    
    console.warn(`All geolocation APIs failed for IP ${ip}, using fallback`);
    
    // Fallback: generate deterministic pseudo-coordinates based on IP
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
        const char = ip.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    // Use IP octets for more realistic distribution
    const parts = ip.split('.').map(Number);
    let seed = 0;
    if (parts.length === 4 && parts.every(p => p >= 0 && p <= 255)) {
        seed = (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
    } else {
        seed = Math.abs(hash);
    }
    
    // Generate coordinates that follow real-world IP distribution patterns
    const latSeed = (seed % 1000) / 1000;
    const lonSeed = ((seed >> 10) % 1000) / 1000;
    
    // Most IPs are in populated areas (bias toward mid-latitudes)
    const latitude = (latSeed - 0.5) * 120; // -60 to +60 (avoid extreme poles)
    const longitude = (lonSeed - 0.5) * 360; // -180 to +180
    
    return {
        latitude: Math.max(-85, Math.min(85, latitude)),
        longitude: Math.max(-180, Math.min(180, longitude)),
        country: 'Unknown (Fallback)',
        city: 'Unknown',
        timezone: 'Unknown'
    };
}

// Known mappings removed - using coordinate transformation formula for all locations

// Convert latitude/longitude to hexasphere tile index using coordinate transformation
function geoToTileIndex(latitude, longitude) {
    const tiles = hexasphere.getTiles();
    
    // Apply the exact same formula that works in main.ts - just invert latitude
    const invertedLat = -latitude;
    console.log(`📍 Domain: lat=${latitude}°, lon=${longitude}° -> inverted lat=${invertedLat}°`);
    console.log(`🔍 Finding closest tile for inverted coordinates: lat=${invertedLat}°, lon=${longitude}°`);
    
    // Find the tile whose center point is closest to the inverted coordinates
    let closestTile = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i];
        const tileLatLon = tile.getLatLon(hexasphere.radius);
        
        // Calculate distance between inverted coordinates and tile coordinates
        const latDiff = invertedLat - tileLatLon.lat;
        const lonDiff = longitude - tileLatLon.lon;
        const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
        
        if (distance < minDistance) {
            minDistance = distance;
            closestTile = i;
        }
    }
    
    console.log(`🏢 Mapped domain to tile ${closestTile} (distance: ${minDistance.toFixed(2)})`);
    return closestTile;
}

// Add sample cities to the hexasphere
function addSampleCities() {
    if (sampleCitiesAdded) {
        console.log("🏙️ Sample cities already added, skipping...");
        return;
    }
    
    console.log("🏙️ Adding sample cities to hexasphere...");
    
    for (const city of sampleCities) {
        // Special debugging for São Paulo sample city
        if (city.name === 'São Paulo') {
            console.log(`🇧🇷 São Paulo sample city: lat=${city.lat}, lon=${city.lon}`);
        }
        
        const tileIndex = geoToTileIndex(city.lat, city.lon);
        hexasphere.addTileLabel(tileIndex, city.name, city.color, 8);
        console.log(`📍 Added ${city.name} at tile ${tileIndex}`);
    }
    
    sampleCitiesAdded = true;
}

// Resolve domain to IP using a public DNS API
async function resolveDomain(domain) {
    try {
        // Using DNS over HTTPS (Cloudflare)
        const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, {
            headers: {
                'Accept': 'application/dns-json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.Answer && data.Answer.length > 0) {
            // Return the first A record
            const aRecord = data.Answer.find(record => record.type === 1);
            if (aRecord) {
                return aRecord.data;
            }
        }
        
        throw new Error('No A record found');
    } catch (error) {
        console.error(`Failed to resolve ${domain}:`, error);
        
        // Fallback: generate a pseudo-IP based on domain hash
        let hash = 0;
        for (let i = 0; i < domain.length; i++) {
            const char = domain.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        const a = (Math.abs(hash) % 223) + 1; // 1-223
        const b = (Math.abs(hash >> 8) % 255) + 1; // 1-255
        const c = (Math.abs(hash >> 16) % 255) + 1; // 1-255
        const d = (Math.abs(hash >> 24) % 254) + 1; // 1-254
        
        return `${a}.${b}.${c}.${d}`;
    }
}

// Add domain to the list
function addDomain(domain) {
    // Clean and validate domain
    domain = domain.trim().toLowerCase();
    if (!domain) return false;
    
    // Remove protocol if present
    domain = domain.replace(/^https?:\/\//, '');
    
    // Remove path if present
    domain = domain.split('/')[0];
    
    // Check if already exists
    if (domains.find(d => d.name === domain)) {
        return false;
    }
    
    domains.push({
        name: domain,
        ip: null,
        tileIndex: null,
        status: 'pending',
        geolocation: null
    });
    
    updateDomainList();
    updateStats();
    return true;
}

// Remove domain
function removeDomain(domain) {
    const index = domains.findIndex(d => d.name === domain);
    if (index !== -1) {
        domains.splice(index, 1);
        domainTileMap.delete(domain);
        updateDomainList();
        updateStats();
        
        // Clear visual indicators
        updateTileVisualization();
    }
}

// Resolve all domains
async function resolveAllDomains() {
    const resolveBtn = document.getElementById('resolveDomainBtn');
    const mapBtn = document.getElementById('mapToTilesBtn');
    
    resolveBtn.disabled = true;
    resolveBtn.textContent = '🔍 Resolving...';
    
    const pendingDomains = domains.filter(d => d.status === 'pending');
    
    for (let i = 0; i < pendingDomains.length; i++) {
        const domain = pendingDomains[i];
        
        try {
            domain.ip = await resolveDomain(domain.name);
            
            // Get geolocation for the IP
            domain.geolocation = await getIPGeolocation(domain.ip);
            domain.status = 'success';
            
            console.log(`Resolved ${domain.name}: ${domain.ip} -> ${domain.geolocation.city}, ${domain.geolocation.country}`);
        } catch (error) {
            domain.status = 'error';
            console.error(`Failed to resolve ${domain.name}:`, error);
        }
        
        updateDomainList();
        updateStats();
        
        // Small delay to avoid overwhelming the API
        if (i < pendingDomains.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    resolveBtn.disabled = false;
    resolveBtn.textContent = '🔍 Resolve All Domains';
    
    // Enable mapping if we have resolved domains
    const resolvedDomains = domains.filter(d => d.status === 'success');
    mapBtn.disabled = resolvedDomains.length === 0;
}

// Map domains to tiles
function mapDomainsToTiles() {
    const mapBtn = document.getElementById('mapToTilesBtn');
    mapBtn.disabled = true;
    mapBtn.textContent = '📍 Mapping...';
    
    const resolvedDomains = domains.filter(d => d.status === 'success');
    const totalTiles = hexasphere.getTiles().length;
    
    // Clear existing mappings
    domainTileMap.clear();
    
    resolvedDomains.forEach(domain => {
        if (domain.geolocation) {
            const tileIndex = geoToTileIndex(domain.geolocation.latitude, domain.geolocation.longitude);
            domain.tileIndex = tileIndex;
            domainTileMap.set(domain.name, tileIndex);
            
            console.log(`Mapped ${domain.name} to tile ${tileIndex} at ${domain.geolocation.latitude.toFixed(2)}, ${domain.geolocation.longitude.toFixed(2)}`);
        }
    });
    
    updateTileVisualization();
    updateStats();
    
    mapBtn.disabled = false;
    mapBtn.textContent = '📍 Map to Tiles';
}

// Update tile visualization
function updateTileVisualization() {
    const tiles = hexasphere.getTiles();
    
    // Reset all tiles to default colors
    tiles.forEach((tile, index) => {
        const latLon = tile.getLatLon(hexasphere.radius);
        const terrainInfo = hexasphere.getTerrainInfo(latLon.lat, latLon.lon);
        hexasphere.setTileColor(index, terrainInfo.color);
    });
    
    // Clear existing paths but preserve sample cities
    hexasphere.clearPathLines();
    
    // Highlight domain tiles
    console.log(`🎯 Updating visualization for ${domains.length} domains`);
    domains.forEach(domain => {
        if (domain.tileIndex !== null) {
            let color = 0x4FC3F7; // Default blue for domain tiles

            if (selectedDomain === domain.name) {
                color = 0xff6b6b; // Red for selected domain
            }

            // Make the label color white if the domain name contains "seed"
            let labelColor = color;
            if (domain.name.toLowerCase().includes("seed")) {
                labelColor = 0xffffff;
            }

            hexasphere.setTileColor(domain.tileIndex, color);

            // Add label with possibly white color for "seed" domains
            hexasphere.addTileLabel(domain.tileIndex, domain.name, labelColor, 10);
            console.log(`📍 Placed ${domain.name} on tile ${domain.tileIndex}`);
        } else {
            console.log(`❌ No tile index for ${domain.name}`);
        }
    });
    
    // Draw paths between all domain tiles
    drawNetworkPaths();
}

// Update only domain visualization without touching sample cities
function updateDomainVisualization() {
    const tiles = hexasphere.getTiles();
    
    // Reset all tiles to default colors
    tiles.forEach((tile, index) => {
        const latLon = tile.getLatLon(hexasphere.radius);
        const terrainInfo = hexasphere.getTerrainInfo(latLon.lat, latLon.lon);
        hexasphere.setTileColor(index, terrainInfo.color);
    });
    
    // Clear existing paths but preserve sample cities
    hexasphere.clearPathLines();
    
    // Highlight domain tiles
    domains.forEach(domain => {
        if (domain.tileIndex !== null) {
            let color = 0x4FC3F7; // Default blue for domain tiles
            
            if (selectedDomain === domain.name) {
                color = 0xff6b6b; // Red for selected domain
            }
            
            hexasphere.setTileColor(domain.tileIndex, color);
        }
    });
    
    // Draw paths between all domain tiles
    drawNetworkPaths();
}

// Draw paths between all domain tiles to show network connections
function drawNetworkPaths() {
    const validDomains = domains.filter(d => d.tileIndex !== null);

    if (validDomains.length < 2) return;

    // Create spider web pattern - each domain connects to the next one in sequence
    for (let i = 0; i < validDomains.length; i++) {
        const domain1 = validDomains[i];
        const domain2 = validDomains[(i + 1) % validDomains.length]; // Connect to next domain, wrap around to first

        // Create a curved path between the two tiles
        const tile1 = hexasphere.getTiles()[domain1.tileIndex];
        const tile2 = hexasphere.getTiles()[domain2.tileIndex];

        if (tile1 && tile2) {
            // Generate a unique color for each connection using HSL
            const hue = Math.floor((i / validDomains.length) * 360);
            const color = new THREE.Color(`hsl(${hue}, 80%, 50%)`);
            hexasphere.createCurvedLine(domain1.tileIndex, domain2.tileIndex, color.getHex(), 12);
        }
    }
}


// Update domain list display
function updateDomainList() {
    const domainList = document.getElementById('domainList');
    
    if (domains.length === 0) {
        domainList.innerHTML = '<p style="color: #666; text-align: center; margin: 20px 0;">No domains added yet</p>';
        return;
    }
    
    domainList.innerHTML = domains.map(domain => {
        const locationText = domain.geolocation ? 
            `${domain.geolocation.city}, ${domain.geolocation.country}` : 
            'Location unknown';
        const coordsText = domain.geolocation ? 
            `${domain.geolocation.latitude.toFixed(2)}, ${domain.geolocation.longitude.toFixed(2)}` : 
            '';
        
        return `
            <div class="domain-item">
                <div>
                    <div class="domain-name">${domain.name}</div>
                    <div class="domain-ip">${domain.ip || 'Not resolved'}</div>
                    ${domain.geolocation ? `<div style="font-size: 10px; color: #999;">${locationText}</div>` : ''}
                    ${coordsText ? `<div style="font-size: 9px; color: #666; font-family: monospace;">${coordsText}</div>` : ''}
                </div>
                <div>
                    <span class="domain-status status-${domain.status}">${domain.status.toUpperCase()}</span>
                    <button onclick="removeDomain('${domain.name}')" style="background: #f44336; color: white; border: none; padding: 2px 6px; border-radius: 3px; margin-left: 5px; cursor: pointer; font-size: 10px;">×</button>
                </div>
            </div>
        `;
    }).join('');
}

// Update statistics
function updateStats() {
    document.getElementById('domainCount').textContent = domains.length;
    document.getElementById('resolvedCount').textContent = domains.filter(d => d.status === 'success').length;
    document.getElementById('mappedCount').textContent = domains.filter(d => d.tileIndex !== null).length;
}

// Save domain mapping to JSON file
function saveDomainMapping() {
    const mappingData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        hexasphereConfig: {
            radius: hexasphere.radius,
            totalTiles: hexasphere.getTiles().length
        },
        domains: domains.map(domain => ({
            name: domain.name,
            ip: domain.ip,
            tileIndex: domain.tileIndex,
            status: domain.status,
            geolocation: domain.geolocation
        })),
        selectedDomain: selectedDomain
    };
    
    const jsonString = JSON.stringify(mappingData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = `domain-mapping-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
    
    console.log('Domain mapping saved:', mappingData);
}

// Load domain mapping from JSON file
function loadDomainMapping(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const mappingData = JSON.parse(e.target.result);
            
            // Validate the data structure
            if (!mappingData.domains || !Array.isArray(mappingData.domains)) {
                throw new Error('Invalid mapping file format');
            }
            
            // Check hexasphere compatibility
            const currentTiles = hexasphere.getTiles().length;
            if (mappingData.hexasphereConfig && mappingData.hexasphereConfig.totalTiles !== currentTiles) {
                const proceed = confirm(
                    `Warning: The saved mapping was created with ${mappingData.hexasphereConfig.totalTiles} tiles, ` +
                    `but current hexasphere has ${currentTiles} tiles. ` +
                    `Tile positions may not match exactly. Continue loading?`
                );
                if (!proceed) return;
            }
            
            // Clear current data
            domains = [];
            domainTileMap.clear();
            selectedDomain = null;
            
            // Load domains
            mappingData.domains.forEach(domainData => {
                const domain = {
                    name: domainData.name,
                    ip: domainData.ip,
                    tileIndex: domainData.tileIndex,
                    status: domainData.status || 'pending',
                    geolocation: domainData.geolocation || null
                };
                
                domains.push(domain);
                
                if (domain.tileIndex !== null) {
                    domainTileMap.set(domain.name, domain.tileIndex);
                }
            });
            
            // Restore selected domain
            selectedDomain = mappingData.selectedDomain || null;
            
            // Update UI
            updateDomainList();
            updateStats();
            updateTileVisualization();
            
            // Enable mapping button if we have resolved domains
            const resolvedDomains = domains.filter(d => d.status === 'success');
            document.getElementById('mapToTilesBtn').disabled = resolvedDomains.length === 0;
            
            console.log('Domain mapping loaded:', mappingData);
            alert(`Successfully loaded ${domains.length} domains from ${mappingData.timestamp || 'unknown date'}`);
            
        } catch (error) {
            console.error('Error loading mapping file:', error);
            alert('Error loading mapping file: ' + error.message);
        }
    };
    
    reader.readAsText(file);
}

// Export domains to text file (bonus feature)
function exportDomainsToText() {
    const domainText = domains.map(domain => {
        if (domain.status === 'success') {
            return `${domain.name} -> ${domain.ip} (Tile: ${domain.tileIndex})`;
        } else {
            return `${domain.name} (${domain.status})`;
        }
    }).join('\n');
    
    const blob = new Blob([domainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = `domains-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
}

// Mouse event handlers
function onMouseDown(event) {
    mouseDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
}

function onMouseUp(event) {
    if (mouseDown) {
        const deltaX = Math.abs(event.clientX - mouseX);
        const deltaY = Math.abs(event.clientY - mouseY);
        
        if (deltaX < 5 && deltaY < 5) {
            onTileClick(event);
        }
    }
    mouseDown = false;
}

function onMouseMove(event) {
    if (!mouseDown) return;

    const deltaX = event.clientX - mouseX;
    const deltaY = event.clientY - mouseY;

    scene.rotation.y += deltaX * 0.005;
    scene.rotation.x += deltaY * 0.005;

    mouseX = event.clientX;
    mouseY = event.clientY;
}

function onTileClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const tileMeshes = hexasphere.getTiles()
        .map(tile => tile.mesh)
        .filter(mesh => mesh !== undefined);

    const intersects = raycaster.intersectObjects(tileMeshes);

    if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const clickedTileIndex = hexasphere.getTiles().findIndex(tile => tile.mesh === clickedMesh);
        
        // Find domain on this tile
        const domain = domains.find(d => d.tileIndex === clickedTileIndex);
        
        if (domain) {
            selectedDomain = selectedDomain === domain.name ? null : domain.name;
            updateDomainVisualization();
            
            if (selectedDomain) {
                console.log(`Selected domain: ${domain.name} (${domain.ip}) on tile ${clickedTileIndex}`);
            }
        } else {
            selectedDomain = null;
            updateDomainVisualization();
        }
    }
}

// UI Event Listeners
document.getElementById('addDomainBtn').addEventListener('click', () => {
    const input = document.getElementById('domainInput');
    if (addDomain(input.value)) {
        input.value = '';
    } else {
        alert('Invalid domain or domain already exists');
    }
});

document.getElementById('domainInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('addDomainBtn').click();
    }
});

document.getElementById('bulkAddBtn').addEventListener('click', () => {
    const textarea = document.getElementById('bulkDomainInput');
    const domainList = textarea.value.split('\n').filter(d => d.trim());
    
    let added = 0;
    domainList.forEach(domain => {
        if (addDomain(domain)) added++;
    });
    
    if (added > 0) {
        textarea.value = '';
        alert(`Added ${added} domains`);
    }
});

document.getElementById('clearAllBtn').addEventListener('click', () => {
    if (confirm('Clear all domains?')) {
        domains = [];
        domainTileMap.clear();
        selectedDomain = null;
        updateDomainList();
        updateStats();
        updateTileVisualization();
        document.getElementById('mapToTilesBtn').disabled = true;
    }
});

document.getElementById('resolveDomainBtn').addEventListener('click', resolveAllDomains);
document.getElementById('mapToTilesBtn').addEventListener('click', mapDomainsToTiles);

// Save/Load functionality
document.getElementById('saveMappingBtn').addEventListener('click', saveDomainMapping);

document.getElementById('loadMappingBtn').addEventListener('click', () => {
    document.getElementById('loadFileInput').click();
});

document.getElementById('loadFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        loadDomainMapping(file);
        // Reset the input so the same file can be loaded again
        e.target.value = '';
    }
});

// Load existing domain-mapping.json
document.getElementById('loadExistingBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('./domain-mapping.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const mappingData = await response.json();
        
        // Clear current data
        domains = [];
        domainTileMap.clear();
        selectedDomain = null;
        
        // Load domains from the existing file
        mappingData.domains.forEach(domainData => {
            const domain = {
                name: domainData.name,
                ip: domainData.ip,
                tileIndex: null, // Will be recalculated with geolocation
                status: domainData.ip ? 'success' : 'pending',
                geolocation: null // Will be fetched
            };
            
            domains.push(domain);
        });
        
        updateDomainList();
        updateStats();
        
        console.log(`Loaded ${domains.length} domains from domain-mapping.json`);
        alert(`Loaded ${domains.length} domains. Click "Resolve All Domains" to get geolocation data.`);
        
    } catch (error) {
        console.error('Error loading domain-mapping.json:', error);
        alert('Could not load domain-mapping.json. Make sure the file exists in the same directory.');
    }
});

// Global function for remove buttons
window.removeDomain = removeDomain;

// Mouse event listeners
document.addEventListener('mousedown', onMouseDown);
document.addEventListener('mouseup', onMouseUp);
document.addEventListener('mousemove', onMouseMove);

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let lastTime = 0;
function animate(currentTime) {
    requestAnimationFrame(animate);
    
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Animate atmosphere clouds
    if (hexasphere && hexasphere.getAtmosphereMesh()) {
        setTimeout(() => {
            hexasphere.animateAtmosphere(deltaTime);
        }, 500); // Use setTimeout to prevent blocking
    }
    
    renderer.render(scene, camera);
}

// Add renderer to page
document.body.appendChild(renderer.domElement);

// Zoom controls
document.addEventListener('wheel', (event) => {
    camera.position.z += event.deltaY * 0.1;
    camera.position.z = Math.max(15, Math.min(150, camera.position.z));
});

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
            case 's':
                event.preventDefault();
                saveDomainMapping();
                break;
            case 'o':
                event.preventDefault();
                document.getElementById('loadFileInput').click();
                break;
        }
    }
});

// Start animation after a delay to allow hexasphere to initialize
setTimeout(() => {
    animate();
}, 1000); // Wait 1 second for atmosphere to be created

// Automatically load domain-mapping.json on startup
setTimeout(async () => {
    try {
        console.log('Attempting to auto-load domain-mapping.json...');
        const response = await fetch('./domain-mapping.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const mappingData = await response.json();
        
        // Clear current data
        domains = [];
        domainTileMap.clear();
        selectedDomain = null;
        
        // Load domains from the existing file with geographic data
        mappingData.domains.forEach(domainData => {
            // Always recalculate tile index using the new coordinate formula
            let tileIndex = null;
            
            if (domainData.latitude && domainData.longitude) {
                console.log(`📍 Processing ${domainData.name}: lat=${domainData.latitude}, lon=${domainData.longitude}`);
                
                // Special debugging for São Paulo
                if (domainData.name.includes('sao') || domainData.name.includes('paulo') || domainData.city === 'São Paulo') {
                    console.log(`🇧🇷 São Paulo domain: lat=${domainData.latitude}, lon=${domainData.longitude}`);
                }
                
                tileIndex = geoToTileIndex(domainData.latitude, domainData.longitude);
                console.log(`🔄 Recalculated ${domainData.name} (${domainData.city}, ${domainData.country}) from old tile ${domainData.tileIndex || 'none'} to new tile ${tileIndex}`);
            } else {
                console.log(`❌ No geolocation data for ${domainData.name}`);
            }
            
            const domain = {
                name: domainData.name,
                ip: domainData.ip,
                tileIndex: tileIndex,
                status: domainData.status || (domainData.ip ? 'success' : 'pending'),
                geolocation: domainData.latitude && domainData.longitude ? {
                    latitude: domainData.latitude,
                    longitude: domainData.longitude,
                    country: domainData.country || 'Unknown',
                    city: domainData.city || 'Unknown',
                    timezone: domainData.timezone || 'Unknown'
                } : null
            };
            
            domains.push(domain);
            
            // Add to tile map if we have a valid tile index
            if (tileIndex !== null && tileIndex !== undefined) {
                domainTileMap.set(domainData.name, tileIndex);
            }
        });
        
        updateDomainList();
        updateStats();
        updateTileVisualization();
        
        console.log(`Auto-loaded ${domains.length} domains from domain-mapping.json with geographic data`);
        
        // Update the JSON file with the calculated tile indices
        const hasUpdatedTiles = domains.some((domain, index) => 
            domain.tileIndex !== mappingData.domains[index].tileIndex
        );
        
        if (hasUpdatedTiles) {
            console.log('Updating domain-mapping.json with recalculated tile indices...');
            const updatedMapping = {
                ...mappingData,
                domains: domains.map(domain => ({
                    name: domain.name,
                    ip: domain.ip,
                    tileIndex: domain.tileIndex,
                    status: domain.status,
                    country: domain.geolocation?.country || 'Unknown',
                    city: domain.geolocation?.city || 'Unknown',
                    region: mappingData.domains.find(d => d.name === domain.name)?.region || 'Unknown',
                    isp: mappingData.domains.find(d => d.name === domain.name)?.isp || 'Unknown',
                    org: mappingData.domains.find(d => d.name === domain.name)?.org || 'Unknown',
                    latitude: domain.geolocation?.latitude,
                    longitude: domain.geolocation?.longitude
                }))
            };
            
        }
        
        // Skip automatic geolocation resolution since we already have the data
        console.log('Geographic data loaded from file - skipping geolocation API calls');
        
    } catch (error) {
        console.warn('Could not auto-load domain-mapping.json:', error);
        console.log('Loading example domains instead...');
        
        // Fallback to example domains if the file doesn't exist
        const exampleDomains = ['google.com', 'github.com', 'stackoverflow.com'];
        exampleDomains.forEach(domain => addDomain(domain));
    }
}, 1000);

console.log('🌐 Domain Network Mapper initialized!');
