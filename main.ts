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

// Toggle for no-draw mode
const viewMode = 'tile'; // Options: 'tile', 'planet', or 'both'

// Create initial hexasphere
let hexasphere = new HexaSphere(25, 20, 0.98, scene, viewMode);

// Output tile coordinates to console (no drawing)
function logTileCoordinates() {
    const tiles = hexasphere.getTiles();
    tiles.forEach((tile, idx) => {
        // Output center and boundary points
        console.log(`Tile ${idx}: center=`, tile.centerPoint, 'boundary=', tile.boundary);
    });
}

logTileCoordinates();

// Add sample city labels after hexasphere is ready
setTimeout(() => {
    addSampleCities();
}, 1000);

// Mouse controls and tile selection
let mouseDown = false;
let mouseX = 0, mouseY = 0;
let selectedTileIndex = -1;
let pathfindingStartTile = -1;
let pathfindingEndTile = -1;
let currentPath: any[] = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseDown(event: MouseEvent) {
    mouseDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
}

function onMouseUp(event: MouseEvent) {
    if (mouseDown) {
        // Only trigger click if mouse didn't move much (to distinguish from drag)
        const deltaX = Math.abs(event.clientX - mouseX);
        const deltaY = Math.abs(event.clientY - mouseY);
        
        if (deltaX < 5 && deltaY < 5) {
            onTileClick(event);
        }
    }
    mouseDown = false;
}

function onMouseMove(event: MouseEvent) {
    if (!mouseDown) return;

    const deltaX = event.clientX - mouseX;
    const deltaY = event.clientY - mouseY;

    scene.rotation.y += deltaX * 0.005;
    scene.rotation.x += deltaY * 0.005;

    mouseX = event.clientX;
    mouseY = event.clientY;
}

function onTileClick(event: MouseEvent) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    let clickedTileIndex = -1;

    if (viewMode === 'tile' || viewMode === 'both') {
        // Get all tile meshes
        const tileMeshes = hexasphere.getTiles()
            .map(tile => tile.mesh)
            .filter(mesh => mesh !== undefined) as THREE.Mesh[];

        // Check for intersections
        const intersects = raycaster.intersectObjects(tileMeshes);

        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object as THREE.Mesh;
            
            // Find which tile was clicked
            clickedTileIndex = hexasphere.getTiles().findIndex(tile => tile.mesh === clickedMesh);
        }
    } else if (viewMode === 'planet') {
        // For planet mode, intersect with planet mesh and find nearest tile
        const planetMesh = hexasphere.getPlanetMesh();
        if (planetMesh) {
            const intersects = raycaster.intersectObject(planetMesh);
            if (intersects.length > 0) {
                const intersectionPoint = intersects[0].point;
                
                // Find the nearest tile to the intersection point
                const tiles = hexasphere.getTiles();
                let nearestTileIndex = 0;
                let minDistance = Infinity;
                
                for (let i = 0; i < tiles.length; i++) {
                    const tile = tiles[i];
                    const distance = intersectionPoint.distanceTo(new THREE.Vector3(
                        tile.centerPoint.x,
                        tile.centerPoint.y,
                        tile.centerPoint.z
                    ));
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestTileIndex = i;
                    }
                }
                clickedTileIndex = nearestTileIndex;
            }
        }
    }

    if (clickedTileIndex !== -1) {
        selectTile(clickedTileIndex);
    }
}

function selectTile(tileIndex: number) {
    const tiles = hexasphere.getTiles();
    const pathfindingMode = (document.getElementById('pathfindingMode') as HTMLInputElement).checked;
    
    if (pathfindingMode) {
        handlePathfindingSelection(tileIndex);
    } else {
        handleNormalSelection(tileIndex);
    }
}

function handleNormalSelection(tileIndex: number) {
    const tiles = hexasphere.getTiles();
    
    // Clear any existing path
    clearPath();
    
    // Reset previous selection
    if (selectedTileIndex !== -1 && selectedTileIndex < tiles.length) {
        resetTileColor(selectedTileIndex);
        // Reset neighbors
        for (const neighbor of tiles[selectedTileIndex].neighbors) {
            const neighborIndex = tiles.indexOf(neighbor);
            if (neighborIndex !== -1) {
                resetTileColor(neighborIndex);
            }
        }
    }

    selectedTileIndex = tileIndex;
    const selectedTile = tiles[tileIndex];
    
    // Highlight selected tile in bright yellow
    hexasphere.setTileColor(tileIndex, 0xffff00);
    
    // Highlight neighbors in orange
    for (const neighbor of selectedTile.neighbors) {
        const neighborIndex = tiles.indexOf(neighbor);
        if (neighborIndex !== -1) {
            hexasphere.setTileColor(neighborIndex, 0xff8800);
        }
    }
    
    // Update info panel
    updateTileInfo(selectedTile, tileIndex);
}

function handlePathfindingSelection(tileIndex: number) {
    const tiles = hexasphere.getTiles();
    
    if (pathfindingStartTile === -1) {
        // First tile selection - set as start
        clearPath();
        pathfindingStartTile = tileIndex;
        pathfindingEndTile = -1;
        
        // Highlight start tile in green
        hexasphere.setTileColor(tileIndex, 0x00ff00);
        
        updatePathfindingInfo('start', tileIndex);
    } else if (pathfindingEndTile === -1 && tileIndex !== pathfindingStartTile) {
        // Second tile selection - set as end and find path
        pathfindingEndTile = tileIndex;
        
        // Highlight end tile in red
        hexasphere.setTileColor(tileIndex, 0xff0000);
        
        // Find and display path
        const startTile = tiles[pathfindingStartTile];
        const endTile = tiles[pathfindingEndTile];
        currentPath = hexasphere.findPath(startTile, endTile);
        
        displayPath();
        updatePathfindingInfo('complete', tileIndex);
    } else {
        // Reset pathfinding
        clearPath();
        pathfindingStartTile = tileIndex;
        pathfindingEndTile = -1;
        
        // Highlight new start tile in green
        hexasphere.setTileColor(tileIndex, 0x00ff00);
        
        updatePathfindingInfo('start', tileIndex);
    }
}

function clearPath() {
    const tiles = hexasphere.getTiles();
    
    // Reset start tile
    if (pathfindingStartTile !== -1) {
        resetTileColor(pathfindingStartTile);
    }
    
    // Reset end tile
    if (pathfindingEndTile !== -1) {
        resetTileColor(pathfindingEndTile);
    }
    
    // Reset path tiles
    for (const pathTile of currentPath) {
        const pathIndex = tiles.indexOf(pathTile);
        if (pathIndex !== -1) {
            resetTileColor(pathIndex);
        }
    }
    
    // Clear curved path lines
    hexasphere.clearPathLines();
    
    currentPath = [];
}

function displayPath() {
    const tiles = hexasphere.getTiles();
    
    // Highlight path tiles in cyan (skip start and end tiles)
    for (let i = 1; i < currentPath.length - 1; i++) {
        const pathTile = currentPath[i];
        const pathIndex = tiles.indexOf(pathTile);
        if (pathIndex !== -1) {
            hexasphere.setTileColor(pathIndex, 0x00ffff);
        }
    }
    
    // Create ONE single curved line through the entire path
    if (currentPath.length >= 2) {
        const startIndex = tiles.indexOf(currentPath[0]);
        const endIndex = tiles.indexOf(currentPath[currentPath.length - 1]);
        
        if (startIndex !== -1 && endIndex !== -1) {
            hexasphere.createCurvedLine(startIndex, endIndex, 0x00ffff, 30);
        }
    }
}

function resetTileColor(tileIndex: number) {
    const tile = hexasphere.getTiles()[tileIndex];
    const latLon = tile.getLatLon(hexasphere.radius);
    
    // Get the actual terrain info to restore the correct color
    const terrainInfo = hexasphere.getTerrainInfo(latLon.lat, latLon.lon);
    
    // Use the terrain's actual color
    hexasphere.setTileColor(tileIndex, terrainInfo.color);
}

function updateTileInfo(tile: any, tileIndex: number) {
    const latLon = tile.getLatLon(hexasphere.radius);
    const terrainInfo = hexasphere.getTerrainInfo(latLon.lat, latLon.lon);
    
    // Calculate 3D elevation effect
    let elevationMultiplier = 0;
    if (terrainInfo.type === 'mountain') {
        elevationMultiplier = 0.15;
    } else if (terrainInfo.type === 'arctic' && terrainInfo.elevation > 150) {
        elevationMultiplier = 0.12;
    } else if (terrainInfo.type === 'desert') {
        elevationMultiplier = 0.05;
    } else if (terrainInfo.type === 'forest') {
        elevationMultiplier = 0.03;
    } else if (terrainInfo.type === 'city') {
        elevationMultiplier = 0.2;
    }
    
    const heightAboveSurface = (terrainInfo.elevation / 255) * elevationMultiplier * hexasphere.radius;
    
    const tileInfoElement = document.getElementById('tileInfo')!;
    tileInfoElement.innerHTML = `
        <h4>Selected Tile #${tileIndex}</h4>
        <p><strong>Terrain:</strong> ${terrainInfo.type.charAt(0).toUpperCase() + terrainInfo.type.slice(1)}</p>
        <p><strong>Base Elevation:</strong> ${terrainInfo.elevation.toFixed(0)}m</p>
        ${heightAboveSurface > 0 ? `<p><strong>3D Height:</strong> +${heightAboveSurface.toFixed(1)} units above surface</p>` : ''}
        <p><strong>Temperature:</strong> ${terrainInfo.temperature.toFixed(1)}°C</p>
        <p><strong>Latitude:</strong> ${latLon.lat.toFixed(2)}°</p>
        <p><strong>Longitude:</strong> ${latLon.lon.toFixed(2)}°</p>
        <p><strong>Boundary Points:</strong> ${tile.boundary.length}</p>
        <p><strong>Neighbors:</strong> ${tile.neighbors.length}</p>
        
        <h5>Neighbor Details:</h5>
        <div style="max-height: 150px; overflow-y: auto; font-size: 11px;">
            ${tile.neighbors.map((neighbor: any, idx: number) => {
                const neighborLatLon = neighbor.getLatLon(hexasphere.radius);
                const neighborTerrain = hexasphere.getTerrainInfo(neighborLatLon.lat, neighborLatLon.lon);
                return `
                    <div style="margin: 5px 0; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 3px;">
                        <strong>Neighbor ${idx + 1}:</strong> ${neighborTerrain.type}<br>
                        Lat: ${neighborLatLon.lat.toFixed(1)}°, Lon: ${neighborLatLon.lon.toFixed(1)}°<br>
                        Elev: ${neighborTerrain.elevation.toFixed(0)}m, Temp: ${neighborTerrain.temperature.toFixed(1)}°C
                    </div>
                `;
            }).join('')}
        </div>
        
        <p style="font-size: 11px; color: #ccc; margin-top: 10px;">
            Click another tile to select it, or click empty space to deselect.
        </p>
    `;
}

function updatePathfindingInfo(mode: 'start' | 'complete', tileIndex: number) {
    const tileInfoElement = document.getElementById('tileInfo')!;
    const tiles = hexasphere.getTiles();
    
    if (mode === 'start') {
        const tile = tiles[tileIndex];
        const latLon = tile.getLatLon(hexasphere.radius);
        const isLand = hexasphere.isLandPublic(latLon.lat, latLon.lon);
        
        tileInfoElement.innerHTML = `
            <h4>🎯 Pathfinding Mode</h4>
            <div style="padding: 10px; background: rgba(0,255,0,0.2); border-radius: 5px; margin-bottom: 10px;">
                <h5 style="margin: 0; color: #00ff00;">Start Tile #${tileIndex}</h5>
                <p><strong>Type:</strong> ${isLand ? 'Land' : 'Ocean'}</p>
                <p><strong>Lat:</strong> ${latLon.lat.toFixed(2)}°, <strong>Lon:</strong> ${latLon.lon.toFixed(2)}°</p>
            </div>
            <p style="font-size: 12px; color: #ccc;">
                🎯 <strong>Next:</strong> Click another tile to set the destination and find the shortest path!
            </p>
        `;
    } else if (mode === 'complete') {
        const startTile = tiles[pathfindingStartTile];
        const endTile = tiles[pathfindingEndTile];
        const startLatLon = startTile.getLatLon(hexasphere.radius);
        const endLatLon = endTile.getLatLon(hexasphere.radius);
        
        tileInfoElement.innerHTML = `
            <h4>🛤️ Path Found!</h4>
            <div style="padding: 8px; background: rgba(0,255,0,0.2); border-radius: 5px; margin-bottom: 8px;">
                <h6 style="margin: 0; color: #00ff00;">Start: Tile #${pathfindingStartTile}</h6>
                <p style="margin: 2px 0; font-size: 11px;">Lat: ${startLatLon.lat.toFixed(1)}°, Lon: ${startLatLon.lon.toFixed(1)}°</p>
            </div>
            <div style="padding: 8px; background: rgba(255,0,0,0.2); border-radius: 5px; margin-bottom: 8px;">
                <h6 style="margin: 0; color: #ff0000;">End: Tile #${pathfindingEndTile}</h6>
                <p style="margin: 2px 0; font-size: 11px;">Lat: ${endLatLon.lat.toFixed(1)}°, Lon: ${endLatLon.lon.toFixed(1)}°</p>
            </div>
            <div style="padding: 8px; background: rgba(0,255,255,0.2); border-radius: 5px; margin-bottom: 10px;">
                <h6 style="margin: 0; color: #00ffff;">Path Length: ${currentPath.length} tiles</h6>
                <p style="margin: 2px 0; font-size: 11px;">Distance: ${(currentPath.length - 1)} hops</p>
            </div>
            <p style="font-size: 11px; color: #ccc;">
                Click another tile to start a new path.
            </p>
        `;
    }
}

// Add sample cities using 2D projection map approach
function addSampleCities() {
    const cities = [
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

    const tiles = hexasphere.getTiles();
    const placedCities: string[] = [];
    
    console.log("🗺️ Finding cities using 2D projection map approach...");
    
    // Get the actual projection map dimensions from the hexasphere
    const projectionCanvas = (hexasphere as any).projectionCanvas;
    const projectionData = (hexasphere as any).projectionData;
    
    if (!projectionCanvas || !projectionData) {
        console.log("❌ Projection map not loaded, falling back to simple lat/lon matching");
        // Fallback to simple approach
        for (const city of cities) {
            let closestTileIndex = 0;
            let minDistance = Infinity;
            
            for (let i = 0; i < tiles.length; i++) {
                const tileLatLon = tiles[i].getLatLon(hexasphere.radius);
                const latDiff = Math.abs(tileLatLon.lat - city.lat);
                const lonDiff = Math.abs(tileLatLon.lon - city.lon);
                const lonDistance = Math.min(lonDiff, 360 - lonDiff);
                const distance = Math.sqrt(latDiff * latDiff + lonDistance * lonDistance * 0.5);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestTileIndex = i;
                }
            }
            
            hexasphere.addTileLabel(closestTileIndex, city.name, city.color, 8);
            placedCities.push(city.name);
        }
        return;
    }
    
    const mapWidth = projectionCanvas.width;
    const mapHeight = projectionCanvas.height;
    console.log(`📐 Projection map dimensions: ${mapWidth}x${mapHeight}`);
    
    for (const city of cities) {
        // Invert the latitude for tile selection
        const invertedLat = -city.lat;
        console.log(`📍 ${city.name}: lat=${city.lat}°, lon=${city.lon}° -> inverted lat=${invertedLat}°`);
        
        // Find the tile whose center point is closest to the inverted city coordinates
        let closestTileIndex = 0;
        let minDistance = Infinity;
        
        for (let i = 0; i < tiles.length; i++) {
            const tileLatLon = tiles[i].getLatLon(hexasphere.radius);
            
            // Calculate distance between inverted city coordinates and tile coordinates
            const latDiff = invertedLat - tileLatLon.lat;
            const lonDiff = city.lon - tileLatLon.lon;
            const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestTileIndex = i;
            }
        }
        
        // Get the closest tile's coordinates
        const tileLatLon = tiles[closestTileIndex].getLatLon(hexasphere.radius);
        const isLand = hexasphere.isLandPublic(tileLatLon.lat, tileLatLon.lon);
        
        // Place the city
        hexasphere.addTileLabel(closestTileIndex, city.name, city.color, 8);
        placedCities.push(city.name);
        
        console.log(`🏙️ Placed ${city.name} on tile ${closestTileIndex}`);
        console.log(`   Target: ${city.lat.toFixed(2)}°, ${city.lon.toFixed(2)}°`);
        console.log(`   Inverted lat: ${invertedLat.toFixed(2)}°`);
        console.log(`   Tile: ${tileLatLon.lat.toFixed(2)}°, ${tileLatLon.lon.toFixed(2)}°`);
        console.log(`   Distance: ${minDistance.toFixed(2)}°`);
        console.log(`   Land: ${isLand ? 'YES' : 'NO'}`);
    }
    
    console.log(`✅ Successfully placed ${placedCities.length}/${cities.length} cities: ${placedCities.join(', ')}`);
    
    // Test the 2D projection by drawing cities on the projection map
    testProjectionMap();
}

// Test function to draw cities on the 2D projection map
function testProjectionMap() {
    const projectionCanvas = (hexasphere as any).projectionCanvas;
    if (!projectionCanvas) {
        console.log("❌ No projection canvas available for testing");
        return;
    }
    
    // Make the projection map visible for testing
    const projectionImg = document.getElementById('projection') as HTMLImageElement;
    if (projectionImg) {
        projectionImg.style.display = 'block';
        projectionImg.style.position = 'absolute';
        projectionImg.style.top = '20px';
        projectionImg.style.right = '20px';
        projectionImg.style.width = '400px';
        projectionImg.style.height = '200px';
        projectionImg.style.border = '2px solid white';
        projectionImg.style.zIndex = '1000';
    }
    
    // Create a test canvas to overlay on the projection map
    const testCanvas = document.createElement('canvas');
    testCanvas.width = projectionCanvas.width;
    testCanvas.height = projectionCanvas.height;
    testCanvas.style.position = 'absolute';
    testCanvas.style.top = '20px';
    testCanvas.style.right = '20px';
    testCanvas.style.width = '400px';
    testCanvas.style.height = '200px';
    testCanvas.style.pointerEvents = 'none';
    testCanvas.style.zIndex = '1001';
    testCanvas.style.border = '2px solid red';
    
    const ctx = testCanvas.getContext('2d')!;
    
    // Test cities
    const testCities = [
        { name: "New York", lat: 40.7128, lon: -74.0060, color: 'red' },
        { name: "London", lat: 51.5074, lon: -0.1278, color: 'blue' },
        { name: "Tokyo", lat: 35.6762, lon: 139.6503, color: 'yellow' },
        { name: "Sydney", lat: -33.8688, lon: 151.2093, color: 'green' },
        { name: "São Paulo", lat: -23.5505, lon: -46.6333, color: 'orange' }
    ];
    
    console.log("🗺️ Testing 2D projection coordinates:");
    
    for (const city of testCities) {
        // Convert to pixel coordinates using standard equirectangular projection
        // Apply the same scaling factor and offsets as the main function
        const scaleFactor = 2.4; // Increase scale to spread cities more
        const lonOffset = 250; // Shift longitude even more to the right
        const latOffset = -120; // Shift latitude down even more
        
        const scaledLon = city.lon * scaleFactor + lonOffset;
        const scaledLat = city.lat * scaleFactor + latOffset;
        
        const pixelX = Math.floor(projectionCanvas.width * (scaledLon + 180) / 360);
        const pixelY = Math.floor(projectionCanvas.height * (90 - scaledLat) / 180);
        
        // Scale coordinates to fit the display size
        const displayX = (pixelX / projectionCanvas.width) * 400;
        const displayY = (pixelY / projectionCanvas.height) * 200;
        
        console.log(`📍 ${city.name}: lat=${city.lat}°, lon=${city.lon}° -> pixel (${pixelX}, ${pixelY}) -> display (${displayX.toFixed(1)}, ${displayY.toFixed(1)})`);
        
        // Draw a circle on the test canvas
        ctx.fillStyle = city.color;
        ctx.beginPath();
        ctx.arc(displayX, displayY, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw city name
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeText(city.name, displayX + 10, displayY - 10);
        ctx.fillText(city.name, displayX + 10, displayY - 10);
    }
    
    // Add the test canvas to the page
    document.body.appendChild(testCanvas);
    
    console.log("✅ Test canvas added to projection map. Check the top-right corner!");
    console.log("🔍 Red=New York, Blue=London, Yellow=Tokyo, Green=Sydney, Orange=São Paulo");
    console.log("📐 Projection map dimensions:", projectionCanvas.width, "x", projectionCanvas.height);
}

// Convert latitude and longitude to 3D Cartesian coordinates on a sphere
// This is the inverse of the hexasphere's getLatLon function
function latLonToCartesian(lat: number, lon: number, radius: number): { x: number, y: number, z: number } {
    // The hexasphere's getLatLon function:
    // phi = Math.acos(this.centerPoint.y / radius)
    // theta = (Math.atan2(this.centerPoint.x, this.centerPoint.z) + Math.PI + Math.PI / 2) % (Math.PI * 2) - Math.PI
    // lat = 180 * phi / Math.PI - 90
    // lon = 180 * theta / Math.PI
    
    // So to reverse this:
    // phi = (lat + 90) * Math.PI / 180
    // theta = lon * Math.PI / 180
    // y = radius * cos(phi)
    // For x and z, we need to reverse: theta = (atan2(x, z) + π + π/2) % (2π) - π
    // This gives us: atan2(x, z) = theta - π/2
    // So: x = radius * sin(phi) * cos(theta - π/2)
    //     z = radius * sin(phi) * sin(theta - π/2)
    
    const phi = (lat + 90) * Math.PI / 180; // Convert latitude to phi (0 at south pole, π at north pole)
    const theta = lon * Math.PI / 180; // Convert longitude to theta (-π to π)
    
    const adjustedTheta = theta - Math.PI / 2;
    
    return {
        x: radius * Math.sin(phi) * Math.cos(adjustedTheta),
        y: radius * Math.cos(phi), // Y is up (north pole)
        z: radius * Math.sin(phi) * Math.sin(adjustedTheta)
    };
}

// Calculate spherical distance between two 3D points on a sphere
function calculateSphericalDistance(point1: { x: number, y: number, z: number }, point2: { x: number, y: number, z: number }): number {
    // Normalize vectors to unit sphere
    const normalize = (p: { x: number, y: number, z: number }) => {
        const length = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
        return { x: p.x / length, y: p.y / length, z: p.z / length };
    };
    
    const p1 = normalize(point1);
    const p2 = normalize(point2);
    
    // Calculate dot product
    const dotProduct = p1.x * p2.x + p1.y * p2.y + p1.z * p2.z;
    
    // Clamp to avoid numerical errors
    const clampedDot = Math.max(-1, Math.min(1, dotProduct));
    
    // Calculate angle between vectors (spherical distance)
    return Math.acos(clampedDot);
}

document.addEventListener('mousedown', onMouseDown);
document.addEventListener('mouseup', onMouseUp);
document.addEventListener('mousemove', onMouseMove);

// Handle window resize
window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation state
let isAnimating = false;

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Only rotate if animation is enabled
    if (isAnimating) {
        scene.rotation.y += 0.002;
    }
    
    renderer.render(scene, camera);
}

// Add renderer to page
document.body.appendChild(renderer.domElement);


// Control event handlers
const radiusSlider = document.getElementById('radiusSlider') as HTMLInputElement;
const subdivisionsSlider = document.getElementById('subdivisionsSlider') as HTMLInputElement;
const tileSizeSlider = document.getElementById('tileSizeSlider') as HTMLInputElement;
const regenerateButton = document.getElementById('regenerateBtn') as HTMLButtonElement;
const animationToggleButton = document.getElementById('animationToggleBtn') as HTMLButtonElement;

const radiusValue = document.getElementById('radiusValue')!;
const subdivisionsValue = document.getElementById('subdivisionsValue')!;
const tileSizeValue = document.getElementById('tileSizeValue')!;
const tileCount = document.getElementById('tileCount')!;

// Update display values
radiusSlider.addEventListener('input', () => {
    radiusValue.textContent = radiusSlider.value;
});

subdivisionsSlider.addEventListener('input', () => {
    subdivisionsValue.textContent = subdivisionsSlider.value;
});

tileSizeSlider.addEventListener('input', () => {
    tileSizeValue.textContent = tileSizeSlider.value;
});

// Regenerate button
regenerateButton.addEventListener('click', () => {
    const radius = parseFloat(radiusSlider.value);
    const subdivisions = parseInt(subdivisionsSlider.value);
    const tileSize = parseFloat(tileSizeSlider.value);
    
    regenerateButton.textContent = 'Generating...';
    regenerateButton.disabled = true;
    
    // Small delay to allow UI update
    setTimeout(() => {
        hexasphere.regenerate(radius, subdivisions, tileSize);
        tileCount.textContent = hexasphere.getTiles().length.toString();
        regenerateButton.textContent = 'Regenerate Hexasphere';
        regenerateButton.disabled = false;
        
        // Re-add cities after regeneration
        setTimeout(() => {
            addSampleCities();
        }, 500);
    }, 100);
});

// Animation toggle button
animationToggleButton.addEventListener('click', () => {
    isAnimating = !isAnimating;
    
    if (isAnimating) {
        animationToggleButton.textContent = '⏸️ Pause Animation';
        animationToggleButton.style.background = 'linear-gradient(45deg, #ff6b6b, #ee5a24)';
    } else {
        animationToggleButton.textContent = '▶️ Start Animation';
        animationToggleButton.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
    }
});

// Zoom controls
document.addEventListener('wheel', (event) => {
    camera.position.z += event.deltaY * 0.1;
    camera.position.z = Math.max(20, Math.min(200, camera.position.z));
});

// Update tile count when hexasphere is ready
setTimeout(() => {
    tileCount.textContent = hexasphere.getTiles().length.toString();
}, 1000);

// Start animation
animate();

console.log('🎉 Corrected Hexasphere with controls initialized!');


