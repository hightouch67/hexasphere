"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var THREE = require("three");
var hexasphere_1 = require("./src/hexasphere");
// Initialize Three.js scene
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000011, 1);
// Add lighting
var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
var directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 10, 5);
scene.add(directionalLight);
// Position camera
camera.position.z = 80;
// Toggle for no-draw mode
var viewMode = 'tile'; // Options: 'tile', 'planet', or 'both'
// Create initial hexasphere
var hexasphere = new hexasphere_1.HexaSphere(25, 20, 0.98, scene, viewMode);
// Output tile coordinates to console (no drawing)
function logTileCoordinates() {
    var tiles = hexasphere.getTiles();
    tiles.forEach(function (tile, idx) {
        // Output center and boundary points
        console.log("Tile ".concat(idx, ": center="), tile.centerPoint, 'boundary=', tile.boundary);
    });
}
logTileCoordinates();
// Add sample city labels after hexasphere is ready
setTimeout(function () {
    addSampleCities();
    // Update tile visibility initially
    hexasphere.updateTileVisibility(camera);
}, 1000);
// Mouse controls and tile selection
var mouseDown = false;
var mouseX = 0, mouseY = 0;
var selectedTileIndex = -1;
var pathfindingStartTile = -1;
var pathfindingEndTile = -1;
var currentPath = [];
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
function onMouseDown(event) {
    mouseDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
}
function onMouseUp(event) {
    if (mouseDown) {
        // Only trigger click if mouse didn't move much (to distinguish from drag)
        var deltaX = Math.abs(event.clientX - mouseX);
        var deltaY = Math.abs(event.clientY - mouseY);
        if (deltaX < 5 && deltaY < 5) {
            onTileClick(event);
        }
    }
    mouseDown = false;
}
function onMouseMove(event) {
    if (!mouseDown)
        return;
    var deltaX = event.clientX - mouseX;
    var deltaY = event.clientY - mouseY;
    scene.rotation.y += deltaX * 0.005;
    scene.rotation.x += deltaY * 0.005;
    // Update tile visibility when rotating the view
    hexasphere.updateTileVisibility(camera);
    mouseX = event.clientX;
    mouseY = event.clientY;
}
function onTileClick(event) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    // Update raycaster
    raycaster.setFromCamera(mouse, camera);
    var clickedTileIndex = -1;
    if (viewMode === 'tile' || viewMode === 'both') {
        // Raycast the instanced mesh directly if available
        var instanced = hexasphere.getTileInstancedMesh ? hexasphere.getTileInstancedMesh() : undefined;
        if (instanced) {
            var intersects = raycaster.intersectObject(instanced);
            if (intersects.length > 0) {
                var intr = intersects[0];
                // For InstancedMesh, the intersection result has instanceId
                var instanceId = intr.instanceId;
                if (typeof instanceId === 'number' && instanceId >= 0) {
                    clickedTileIndex = instanceId;
                }
                else {
                    // Fallback: if instanceId not present, fall back to nearest tile by point
                    var intersectionPoint = intr.point;
                    var tiles = hexasphere.getTiles();
                    var nearest = -1;
                    var minDist = Infinity;
                    for (var i = 0; i < tiles.length; i++) {
                        var t = tiles[i];
                        var d = intersectionPoint.distanceTo(new THREE.Vector3(t.centerPoint.x, t.centerPoint.y, t.centerPoint.z));
                        if (d < minDist) {
                            minDist = d;
                            nearest = i;
                        }
                    }
                    clickedTileIndex = nearest;
                }
            }
        }
        else {
            // If no instanced mesh present (fallback), use original behavior
            var tileMeshes = hexasphere.getTiles()
                .map(function (tile) { return tile.mesh; })
                .filter(function (mesh) { return mesh !== undefined; });
            var intersects = raycaster.intersectObjects(tileMeshes);
            if (intersects.length > 0) {
                var clickedMesh_1 = intersects[0].object;
                clickedTileIndex = hexasphere.getTiles().findIndex(function (tile) { return tile.mesh === clickedMesh_1; });
            }
        }
    }
    else if (viewMode === 'planet') {
        // For planet mode, intersect with planet mesh and find nearest tile
        var planetMesh = hexasphere.getPlanetMesh();
        if (planetMesh) {
            var intersects = raycaster.intersectObject(planetMesh);
            if (intersects.length > 0) {
                var intersectionPoint = intersects[0].point;
                // Find the nearest tile to the intersection point
                var tiles = hexasphere.getTiles();
                var nearestTileIndex = 0;
                var minDistance = Infinity;
                for (var i = 0; i < tiles.length; i++) {
                    var tile = tiles[i];
                    var distance = intersectionPoint.distanceTo(new THREE.Vector3(tile.centerPoint.x, tile.centerPoint.y, tile.centerPoint.z));
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
function selectTile(tileIndex) {
    var tiles = hexasphere.getTiles();
    var pathfindingMode = document.getElementById('pathfindingMode').checked;
    if (pathfindingMode) {
        handlePathfindingSelection(tileIndex);
    }
    else {
        handleNormalSelection(tileIndex);
    }
}
function handleNormalSelection(tileIndex) {
    var tiles = hexasphere.getTiles();
    // Clear any existing path
    clearPath();
    // Reset previous selection
    if (selectedTileIndex !== -1 && selectedTileIndex < tiles.length) {
        resetTileColor(selectedTileIndex);
        // Reset neighbors
        for (var _i = 0, _a = tiles[selectedTileIndex].neighbors; _i < _a.length; _i++) {
            var neighbor = _a[_i];
            var neighborIndex = tiles.indexOf(neighbor);
            if (neighborIndex !== -1) {
                resetTileColor(neighborIndex);
            }
        }
    }
    selectedTileIndex = tileIndex;
    var selectedTile = tiles[tileIndex];
    // Highlight selected tile in bright yellow
    hexasphere.setTileColor(tileIndex, 0xffff00);
    // Highlight neighbors in orange
    for (var _b = 0, _c = selectedTile.neighbors; _b < _c.length; _b++) {
        var neighbor = _c[_b];
        var neighborIndex = tiles.indexOf(neighbor);
        if (neighborIndex !== -1) {
            hexasphere.setTileColor(neighborIndex, 0xff8800);
        }
    }
    // Update info panel
    updateTileInfo(selectedTile, tileIndex);
}
function handlePathfindingSelection(tileIndex) {
    var tiles = hexasphere.getTiles();
    if (pathfindingStartTile === -1) {
        // First tile selection - set as start
        clearPath();
        pathfindingStartTile = tileIndex;
        pathfindingEndTile = -1;
        // Highlight start tile in green
        hexasphere.setTileColor(tileIndex, 0x00ff00);
        updatePathfindingInfo('start', tileIndex);
    }
    else if (pathfindingEndTile === -1 && tileIndex !== pathfindingStartTile) {
        // Second tile selection - set as end and find path
        pathfindingEndTile = tileIndex;
        // Highlight end tile in red
        hexasphere.setTileColor(tileIndex, 0xff0000);
        // Find and display path
        var startTile = tiles[pathfindingStartTile];
        var endTile = tiles[pathfindingEndTile];
        currentPath = hexasphere.findPath(startTile, endTile);
        displayPath();
        updatePathfindingInfo('complete', tileIndex);
    }
    else {
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
    var tiles = hexasphere.getTiles();
    // Reset start tile
    if (pathfindingStartTile !== -1) {
        resetTileColor(pathfindingStartTile);
    }
    // Reset end tile
    if (pathfindingEndTile !== -1) {
        resetTileColor(pathfindingEndTile);
    }
    // Reset path tiles
    for (var _i = 0, currentPath_1 = currentPath; _i < currentPath_1.length; _i++) {
        var pathTile = currentPath_1[_i];
        var pathIndex = tiles.indexOf(pathTile);
        if (pathIndex !== -1) {
            resetTileColor(pathIndex);
        }
    }
    // Clear curved path lines
    hexasphere.clearPathLines();
    currentPath = [];
}
function displayPath() {
    var tiles = hexasphere.getTiles();
    // Highlight path tiles in cyan (skip start and end tiles)
    for (var i = 1; i < currentPath.length - 1; i++) {
        var pathTile = currentPath[i];
        var pathIndex = tiles.indexOf(pathTile);
        if (pathIndex !== -1) {
            hexasphere.setTileColor(pathIndex, 0x00ffff);
        }
    }
    // Create ONE single curved line through the entire path
    if (currentPath.length >= 2) {
        var startIndex = tiles.indexOf(currentPath[0]);
        var endIndex = tiles.indexOf(currentPath[currentPath.length - 1]);
        if (startIndex !== -1 && endIndex !== -1) {
            hexasphere.createCurvedLine(startIndex, endIndex, 0x00ffff, 30);
        }
    }
}
function resetTileColor(tileIndex) {
    var tile = hexasphere.getTiles()[tileIndex];
    var latLon = tile.getLatLon(hexasphere.radius);
    // Get the actual terrain info to restore the correct color
    var terrainInfo = hexasphere.getTerrainInfo(latLon.lat, latLon.lon);
    // Use the terrain's actual color
    hexasphere.setTileColor(tileIndex, terrainInfo.color);
}
function updateTileInfo(tile, tileIndex) {
    var latLon = tile.getLatLon(hexasphere.radius);
    var terrainInfo = hexasphere.getTerrainInfo(latLon.lat, latLon.lon);
    // Calculate 3D elevation effect
    var elevationMultiplier = 0;
    if (terrainInfo.type === 'mountain') {
        elevationMultiplier = 0.15;
    }
    else if (terrainInfo.type === 'arctic' && terrainInfo.elevation > 150) {
        elevationMultiplier = 0.12;
    }
    else if (terrainInfo.type === 'desert') {
        elevationMultiplier = 0.05;
    }
    else if (terrainInfo.type === 'forest') {
        elevationMultiplier = 0.03;
    }
    else if (terrainInfo.type === 'city') {
        elevationMultiplier = 0.2;
    }
    var heightAboveSurface = (terrainInfo.elevation / 255) * elevationMultiplier * hexasphere.radius;
    var tileInfoElement = document.getElementById('tileInfo');
    tileInfoElement.innerHTML = "\n        <h4>Selected Tile #".concat(tileIndex, "</h4>\n        <p><strong>Terrain:</strong> ").concat(terrainInfo.type.charAt(0).toUpperCase() + terrainInfo.type.slice(1), "</p>\n        <p><strong>Base Elevation:</strong> ").concat(terrainInfo.elevation.toFixed(0), "m</p>\n        ").concat(heightAboveSurface > 0 ? "<p><strong>3D Height:</strong> +".concat(heightAboveSurface.toFixed(1), " units above surface</p>") : '', "\n        <p><strong>Temperature:</strong> ").concat(terrainInfo.temperature.toFixed(1), "\u00B0C</p>\n        <p><strong>Latitude:</strong> ").concat(latLon.lat.toFixed(2), "\u00B0</p>\n        <p><strong>Longitude:</strong> ").concat(latLon.lon.toFixed(2), "\u00B0</p>\n        <p><strong>Boundary Points:</strong> ").concat(tile.boundary.length, "</p>\n        <p><strong>Neighbors:</strong> ").concat(tile.neighbors.length, "</p>\n        \n        <h5>Neighbor Details:</h5>\n        <div style=\"max-height: 150px; overflow-y: auto; font-size: 11px;\">\n            ").concat(tile.neighbors.map(function (neighbor, idx) {
        var neighborLatLon = neighbor.getLatLon(hexasphere.radius);
        var neighborTerrain = hexasphere.getTerrainInfo(neighborLatLon.lat, neighborLatLon.lon);
        return "\n                    <div style=\"margin: 5px 0; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 3px;\">\n                        <strong>Neighbor ".concat(idx + 1, ":</strong> ").concat(neighborTerrain.type, "<br>\n                        Lat: ").concat(neighborLatLon.lat.toFixed(1), "\u00B0, Lon: ").concat(neighborLatLon.lon.toFixed(1), "\u00B0<br>\n                        Elev: ").concat(neighborTerrain.elevation.toFixed(0), "m, Temp: ").concat(neighborTerrain.temperature.toFixed(1), "\u00B0C\n                    </div>\n                ");
    }).join(''), "\n        </div>\n        \n        <p style=\"font-size: 11px; color: #ccc; margin-top: 10px;\">\n            Click another tile to select it, or click empty space to deselect.\n        </p>\n    ");
}
function updatePathfindingInfo(mode, tileIndex) {
    var tileInfoElement = document.getElementById('tileInfo');
    var tiles = hexasphere.getTiles();
    if (mode === 'start') {
        var tile = tiles[tileIndex];
        var latLon = tile.getLatLon(hexasphere.radius);
        var isLand = hexasphere.isLandPublic(latLon.lat, latLon.lon);
        tileInfoElement.innerHTML = "\n            <h4>\uD83C\uDFAF Pathfinding Mode</h4>\n            <div style=\"padding: 10px; background: rgba(0,255,0,0.2); border-radius: 5px; margin-bottom: 10px;\">\n                <h5 style=\"margin: 0; color: #00ff00;\">Start Tile #".concat(tileIndex, "</h5>\n                <p><strong>Type:</strong> ").concat(isLand ? 'Land' : 'Ocean', "</p>\n                <p><strong>Lat:</strong> ").concat(latLon.lat.toFixed(2), "\u00B0, <strong>Lon:</strong> ").concat(latLon.lon.toFixed(2), "\u00B0</p>\n            </div>\n            <p style=\"font-size: 12px; color: #ccc;\">\n                \uD83C\uDFAF <strong>Next:</strong> Click another tile to set the destination and find the shortest path!\n            </p>\n        ");
    }
    else if (mode === 'complete') {
        var startTile = tiles[pathfindingStartTile];
        var endTile = tiles[pathfindingEndTile];
        var startLatLon = startTile.getLatLon(hexasphere.radius);
        var endLatLon = endTile.getLatLon(hexasphere.radius);
        tileInfoElement.innerHTML = "\n            <h4>\uD83D\uDEE4\uFE0F Path Found!</h4>\n            <div style=\"padding: 8px; background: rgba(0,255,0,0.2); border-radius: 5px; margin-bottom: 8px;\">\n                <h6 style=\"margin: 0; color: #00ff00;\">Start: Tile #".concat(pathfindingStartTile, "</h6>\n                <p style=\"margin: 2px 0; font-size: 11px;\">Lat: ").concat(startLatLon.lat.toFixed(1), "\u00B0, Lon: ").concat(startLatLon.lon.toFixed(1), "\u00B0</p>\n            </div>\n            <div style=\"padding: 8px; background: rgba(255,0,0,0.2); border-radius: 5px; margin-bottom: 8px;\">\n                <h6 style=\"margin: 0; color: #ff0000;\">End: Tile #").concat(pathfindingEndTile, "</h6>\n                <p style=\"margin: 2px 0; font-size: 11px;\">Lat: ").concat(endLatLon.lat.toFixed(1), "\u00B0, Lon: ").concat(endLatLon.lon.toFixed(1), "\u00B0</p>\n            </div>\n            <div style=\"padding: 8px; background: rgba(0,255,255,0.2); border-radius: 5px; margin-bottom: 10px;\">\n                <h6 style=\"margin: 0; color: #00ffff;\">Path Length: ").concat(currentPath.length, " tiles</h6>\n                <p style=\"margin: 2px 0; font-size: 11px;\">Distance: ").concat((currentPath.length - 1), " hops</p>\n            </div>\n            <p style=\"font-size: 11px; color: #ccc;\">\n                Click another tile to start a new path.\n            </p>\n        ");
    }
}
// Add sample cities using 2D projection map approach
function addSampleCities() {
    var cities = [
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
    var tiles = hexasphere.getTiles();
    var placedCities = [];
    console.log("🗺️ Finding cities using 2D projection map approach...");
    // Get the actual projection map dimensions from the hexasphere
    var projectionCanvas = hexasphere.projectionCanvas;
    var projectionData = hexasphere.projectionData;
    if (!projectionCanvas || !projectionData) {
        console.log("❌ Projection map not loaded, falling back to simple lat/lon matching");
        // Fallback to simple approach
        for (var _i = 0, cities_1 = cities; _i < cities_1.length; _i++) {
            var city = cities_1[_i];
            var closestTileIndex = 0;
            var minDistance = Infinity;
            for (var i = 0; i < tiles.length; i++) {
                var tileLatLon = tiles[i].getLatLon(hexasphere.radius);
                var latDiff = Math.abs(tileLatLon.lat - city.lat);
                var lonDiff = Math.abs(tileLatLon.lon - city.lon);
                var lonDistance = Math.min(lonDiff, 360 - lonDiff);
                var distance = Math.sqrt(latDiff * latDiff + lonDistance * lonDistance * 0.5);
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
    var mapWidth = projectionCanvas.width;
    var mapHeight = projectionCanvas.height;
    console.log("\uD83D\uDCD0 Projection map dimensions: ".concat(mapWidth, "x").concat(mapHeight));
    for (var _a = 0, cities_2 = cities; _a < cities_2.length; _a++) {
        var city = cities_2[_a];
        // Invert the latitude for tile selection
        var invertedLat = -city.lat;
        console.log("\uD83D\uDCCD ".concat(city.name, ": lat=").concat(city.lat, "\u00B0, lon=").concat(city.lon, "\u00B0 -> inverted lat=").concat(invertedLat, "\u00B0"));
        // Find the tile whose center point is closest to the inverted city coordinates
        var closestTileIndex = 0;
        var minDistance = Infinity;
        for (var i = 0; i < tiles.length; i++) {
            var tileLatLon_1 = tiles[i].getLatLon(hexasphere.radius);
            // Calculate distance between inverted city coordinates and tile coordinates
            var latDiff = invertedLat - tileLatLon_1.lat;
            var lonDiff = city.lon - tileLatLon_1.lon;
            var distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
            if (distance < minDistance) {
                minDistance = distance;
                closestTileIndex = i;
            }
        }
        // Get the closest tile's coordinates
        var tileLatLon = tiles[closestTileIndex].getLatLon(hexasphere.radius);
        var isLand = hexasphere.isLandPublic(tileLatLon.lat, tileLatLon.lon);
        // Place the city
        hexasphere.addTileLabel(closestTileIndex, city.name, city.color, 8);
        placedCities.push(city.name);
        console.log("\uD83C\uDFD9\uFE0F Placed ".concat(city.name, " on tile ").concat(closestTileIndex));
        console.log("   Target: ".concat(city.lat.toFixed(2), "\u00B0, ").concat(city.lon.toFixed(2), "\u00B0"));
        console.log("   Inverted lat: ".concat(invertedLat.toFixed(2), "\u00B0"));
        console.log("   Tile: ".concat(tileLatLon.lat.toFixed(2), "\u00B0, ").concat(tileLatLon.lon.toFixed(2), "\u00B0"));
        console.log("   Distance: ".concat(minDistance.toFixed(2), "\u00B0"));
        console.log("   Land: ".concat(isLand ? 'YES' : 'NO'));
    }
    console.log("\u2705 Successfully placed ".concat(placedCities.length, "/").concat(cities.length, " cities: ").concat(placedCities.join(', ')));
    // Test the 2D projection by drawing cities on the projection map
    testProjectionMap();
}
// Test function to draw cities on the 2D projection map
function testProjectionMap() {
    var projectionCanvas = hexasphere.projectionCanvas;
    if (!projectionCanvas) {
        console.log("❌ No projection canvas available for testing");
        return;
    }
    // Make the projection map visible for testing
    var projectionImg = document.getElementById('projection');
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
    var testCanvas = document.createElement('canvas');
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
    var ctx = testCanvas.getContext('2d');
    // Test cities
    var testCities = [
        { name: "New York", lat: 40.7128, lon: -74.0060, color: 'red' },
        { name: "London", lat: 51.5074, lon: -0.1278, color: 'blue' },
        { name: "Tokyo", lat: 35.6762, lon: 139.6503, color: 'yellow' },
        { name: "Sydney", lat: -33.8688, lon: 151.2093, color: 'green' },
        { name: "São Paulo", lat: -23.5505, lon: -46.6333, color: 'orange' }
    ];
    console.log("🗺️ Testing 2D projection coordinates:");
    for (var _i = 0, testCities_1 = testCities; _i < testCities_1.length; _i++) {
        var city = testCities_1[_i];
        // Convert to pixel coordinates using standard equirectangular projection
        // Apply the same scaling factor and offsets as the main function
        var scaleFactor = 2.4; // Increase scale to spread cities more
        var lonOffset = 250; // Shift longitude even more to the right
        var latOffset = -120; // Shift latitude down even more
        var scaledLon = city.lon * scaleFactor + lonOffset;
        var scaledLat = city.lat * scaleFactor + latOffset;
        var pixelX = Math.floor(projectionCanvas.width * (scaledLon + 180) / 360);
        var pixelY = Math.floor(projectionCanvas.height * (90 - scaledLat) / 180);
        // Scale coordinates to fit the display size
        var displayX = (pixelX / projectionCanvas.width) * 400;
        var displayY = (pixelY / projectionCanvas.height) * 200;
        console.log("\uD83D\uDCCD ".concat(city.name, ": lat=").concat(city.lat, "\u00B0, lon=").concat(city.lon, "\u00B0 -> pixel (").concat(pixelX, ", ").concat(pixelY, ") -> display (").concat(displayX.toFixed(1), ", ").concat(displayY.toFixed(1), ")"));
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
function latLonToCartesian(lat, lon, radius) {
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
    var phi = (lat + 90) * Math.PI / 180; // Convert latitude to phi (0 at south pole, π at north pole)
    var theta = lon * Math.PI / 180; // Convert longitude to theta (-π to π)
    var adjustedTheta = theta - Math.PI / 2;
    return {
        x: radius * Math.sin(phi) * Math.cos(adjustedTheta),
        y: radius * Math.cos(phi), // Y is up (north pole)
        z: radius * Math.sin(phi) * Math.sin(adjustedTheta)
    };
}
// Calculate spherical distance between two 3D points on a sphere
function calculateSphericalDistance(point1, point2) {
    // Normalize vectors to unit sphere
    var normalize = function (p) {
        var length = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
        return { x: p.x / length, y: p.y / length, z: p.z / length };
    };
    var p1 = normalize(point1);
    var p2 = normalize(point2);
    // Calculate dot product
    var dotProduct = p1.x * p2.x + p1.y * p2.y + p1.z * p2.z;
    // Clamp to avoid numerical errors
    var clampedDot = Math.max(-1, Math.min(1, dotProduct));
    // Calculate angle between vectors (spherical distance)
    return Math.acos(clampedDot);
}
document.addEventListener('mousedown', onMouseDown);
document.addEventListener('mouseup', onMouseUp);
document.addEventListener('mousemove', onMouseMove);
// Handle window resize
window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
// Animation state
var isAnimating = false;
// Animation loop
function animate() {
    requestAnimationFrame(animate);
    // Only rotate if animation is enabled
    if (isAnimating) {
        scene.rotation.y += 0.002;
    }
    // Update tile visibility based on camera position
    hexasphere.updateTileVisibility(camera);
    renderer.render(scene, camera);
}
// Add renderer to page
document.body.appendChild(renderer.domElement);
// Control event handlers
var radiusSlider = document.getElementById('radiusSlider');
var subdivisionsSlider = document.getElementById('subdivisionsSlider');
var tileSizeSlider = document.getElementById('tileSizeSlider');
var regenerateButton = document.getElementById('regenerateBtn');
var animationToggleButton = document.getElementById('animationToggleBtn');
var radiusValue = document.getElementById('radiusValue');
var subdivisionsValue = document.getElementById('subdivisionsValue');
var tileSizeValue = document.getElementById('tileSizeValue');
var tileCount = document.getElementById('tileCount');
// Update display values
radiusSlider.addEventListener('input', function () {
    radiusValue.textContent = radiusSlider.value;
});
subdivisionsSlider.addEventListener('input', function () {
    subdivisionsValue.textContent = subdivisionsSlider.value;
});
tileSizeSlider.addEventListener('input', function () {
    tileSizeValue.textContent = tileSizeSlider.value;
});
// Regenerate button
regenerateButton.addEventListener('click', function () {
    var radius = parseFloat(radiusSlider.value);
    var subdivisions = parseInt(subdivisionsSlider.value);
    var tileSize = parseFloat(tileSizeSlider.value);
    regenerateButton.textContent = 'Generating...';
    regenerateButton.disabled = true;
    // Small delay to allow UI update
    setTimeout(function () {
        hexasphere.regenerate(radius, subdivisions, tileSize);
        tileCount.textContent = hexasphere.getTiles().length.toString();
        regenerateButton.textContent = 'Regenerate Hexasphere';
        regenerateButton.disabled = false;
        // Re-add cities after regeneration
        setTimeout(function () {
            addSampleCities();
            // Update tile visibility after regeneration
            hexasphere.updateTileVisibility(camera);
        }, 500);
    }, 100);
});
// Animation toggle button
animationToggleButton.addEventListener('click', function () {
    isAnimating = !isAnimating;
    if (isAnimating) {
        animationToggleButton.textContent = '⏸️ Pause Animation';
        animationToggleButton.style.background = 'linear-gradient(45deg, #ff6b6b, #ee5a24)';
    }
    else {
        animationToggleButton.textContent = '▶️ Start Animation';
        animationToggleButton.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
    }
});
// Zoom controls
document.addEventListener('wheel', function (event) {
    camera.position.z += event.deltaY * 0.1;
    camera.position.z = Math.max(20, Math.min(200, camera.position.z));
    // Update tile visibility when zooming
    hexasphere.updateTileVisibility(camera);
});
// Update tile count when hexasphere is ready
setTimeout(function () {
    tileCount.textContent = hexasphere.getTiles().length.toString();
}, 1000);
// Start animation
animate();
console.log('🎉 Corrected Hexasphere with controls initialized!');
