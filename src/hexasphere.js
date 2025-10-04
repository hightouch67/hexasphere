"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HexaSphere = void 0;
var THREE = require("three");
// Reuse the working Point, Face, and Tile classes but fix them
var Point = /** @class */ (function () {
    function Point(x, y, z) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        if (z === void 0) { z = 0; }
        this.faces = [];
        this.x = parseFloat(x.toFixed(3));
        this.y = parseFloat(y.toFixed(3));
        this.z = parseFloat(z.toFixed(3));
    }
    Point.prototype.subdivide = function (point, count, checkPoint) {
        var segments = [];
        segments.push(this);
        for (var i = 1; i < count; i++) {
            var np = new Point(this.x * (1 - (i / count)) + point.x * (i / count), this.y * (1 - (i / count)) + point.y * (i / count), this.z * (1 - (i / count)) + point.z * (i / count));
            segments.push(checkPoint(np));
        }
        segments.push(point);
        return segments;
    };
    Point.prototype.segment = function (point, percent) {
        percent = Math.max(0.01, Math.min(1, percent));
        var x = point.x * (1 - percent) + this.x * percent;
        var y = point.y * (1 - percent) + this.y * percent;
        var z = point.z * (1 - percent) + this.z * percent;
        return new Point(x, y, z);
    };
    Point.prototype.project = function (radius) {
        var mag = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2));
        var ratio = radius / mag;
        this.x = this.x * ratio;
        this.y = this.y * ratio;
        this.z = this.z * ratio;
        return this;
    };
    Point.prototype.registerFace = function (face) {
        if (!this.faces.find(function (f) { return f.id === face.id; })) {
            this.faces.push(face);
        }
    };
    Point.prototype.getOrderedFaces = function () {
        var workingArray = this.faces.slice();
        var ret = [];
        var i = 0;
        while (i < this.faces.length && workingArray.length > 0) {
            if (i === 0) {
                ret.push(workingArray[0]);
                workingArray.splice(0, 1);
            }
            else {
                var hit = false;
                for (var j = 0; j < workingArray.length; j++) {
                    if (workingArray[j].isAdjacentTo(ret[i - 1])) {
                        ret.push(workingArray[j]);
                        workingArray.splice(j, 1);
                        hit = true;
                        break;
                    }
                }
                if (!hit)
                    break;
            }
            i++;
        }
        return ret;
    };
    Point.prototype.toString = function () {
        return "".concat(this.x, ",").concat(this.y, ",").concat(this.z);
    };
    return Point;
}());
var Face = /** @class */ (function () {
    function Face(point1, point2, point3, register) {
        if (register === void 0) { register = true; }
        this.id = Face.idCounter++;
        this.points = [point1, point2, point3];
        if (register) {
            point1.registerFace(this);
            point2.registerFace(this);
            point3.registerFace(this);
        }
    }
    Face.prototype.getOtherPoints = function (point1) {
        return this.points.filter(function (point) { return point.toString() !== point1.toString(); });
    };
    Face.prototype.isAdjacentTo = function (face2) {
        if (!(face2 === null || face2 === void 0 ? void 0 : face2.points))
            return false;
        var count = 0;
        for (var _i = 0, _a = this.points; _i < _a.length; _i++) {
            var point1 = _a[_i];
            for (var _b = 0, _c = face2.points; _b < _c.length; _b++) {
                var point2 = _c[_b];
                if (point1.toString() === point2.toString()) {
                    count++;
                }
            }
        }
        return count === 2;
    };
    Face.prototype.getCentroid = function () {
        if (this.centroid)
            return this.centroid;
        var x = (this.points[0].x + this.points[1].x + this.points[2].x) / 3;
        var y = (this.points[0].y + this.points[1].y + this.points[2].y) / 3;
        var z = (this.points[0].z + this.points[1].z + this.points[2].z) / 3;
        this.centroid = new Point(x, y, z);
        return this.centroid;
    };
    Face.idCounter = 0;
    return Face;
}());
var Tile = /** @class */ (function () {
    function Tile(centerPoint, hexSize) {
        if (hexSize === void 0) { hexSize = 1; }
        this.neighbors = [];
        hexSize = Math.max(0.01, Math.min(1.0, hexSize));
        this.centerPoint = centerPoint;
        this.faces = centerPoint.getOrderedFaces();
        this.boundary = [];
        this.neighborIds = [];
        var neighborHash = {};
        // Build boundary using the ORIGINAL working method
        for (var f = 0; f < this.faces.length; f++) {
            this.boundary.push(this.faces[f].getCentroid().segment(this.centerPoint, hexSize));
            // Get neighboring tiles
            var otherPoints = this.faces[f].getOtherPoints(this.centerPoint);
            for (var o = 0; o < Math.min(2, otherPoints.length); o++) {
                neighborHash[otherPoints[o].toString()] = 1;
            }
        }
        this.neighborIds = Object.keys(neighborHash);
        // Fix winding order
        if (this.boundary.length >= 4) {
            // Calculate surface normal
            var U = {
                x: this.boundary[2].x - this.boundary[1].x,
                y: this.boundary[2].y - this.boundary[1].y,
                z: this.boundary[2].z - this.boundary[1].z
            };
            var V = {
                x: this.boundary[3].x - this.boundary[1].x,
                y: this.boundary[3].y - this.boundary[1].y,
                z: this.boundary[3].z - this.boundary[1].z
            };
            var normal = {
                x: U.y * V.z - U.z * V.y,
                y: U.z * V.x - U.x * V.z,
                z: U.x * V.y - U.y * V.x
            };
            // Check if pointing away from origin
            var dotProduct = (this.centerPoint.x * normal.x) + (this.centerPoint.y * normal.y) + (this.centerPoint.z * normal.z);
            if (dotProduct < 0) {
                this.boundary.reverse();
            }
        }
    }
    Tile.prototype.getLatLon = function (radius) {
        var phi = Math.acos(this.centerPoint.y / radius);
        var theta = (Math.atan2(this.centerPoint.x, this.centerPoint.z) + Math.PI + Math.PI / 2) % (Math.PI * 2) - Math.PI;
        return {
            lat: 180 * phi / Math.PI - 90,
            lon: 180 * theta / Math.PI
        };
    };
    Tile.prototype.toString = function () {
        return this.centerPoint.toString();
    };
    return Tile;
}());
var HexaSphere = /** @class */ (function () {
    function HexaSphere(radius, numDivisions, hexSize, scene, viewMode) {
        var _this = this;
        this.tiles = [];
        this.tileLookup = {};
        this.pathLines = [];
        this.tileLabels = [];
        this.tileOriginalPositions = []; // Store original positions for visibility toggling
        this.instanceDummy = new THREE.Object3D();
        this.radius = radius;
        this.scene = scene;
        this.viewMode = viewMode;
        this.loadProjectionMap().then(function () {
            _this.generateHexasphere(radius, numDivisions, hexSize, _this.viewMode);
        });
    }
    HexaSphere.prototype.loadProjectionMap = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) {
                        var img = document.getElementById("projection");
                        if (!img) {
                            resolve();
                            return;
                        }
                        var processImage = function () {
                            _this.projectionCanvas = document.createElement('canvas');
                            var context = _this.projectionCanvas.getContext('2d');
                            _this.projectionCanvas.width = img.naturalWidth || img.width;
                            _this.projectionCanvas.height = img.naturalHeight || img.height;
                            context.drawImage(img, 0, 0);
                            _this.projectionData = context.getImageData(0, 0, _this.projectionCanvas.width, _this.projectionCanvas.height);
                        };
                        if (img.complete && img.naturalWidth > 0) {
                            processImage();
                        }
                        else {
                            img.onload = processImage;
                        }
                        resolve();
                    })];
            });
        });
    };
    HexaSphere.prototype.generateHexasphere = function (radius, numDivisions, hexSize, viewMode) {
        var tao = 1.61803399;
        var corners = [
            new Point(1000, tao * 1000, 0),
            new Point(-1000, tao * 1000, 0),
            new Point(1000, -tao * 1000, 0),
            new Point(-1000, -tao * 1000, 0),
            new Point(0, 1000, tao * 1000),
            new Point(0, -1000, tao * 1000),
            new Point(0, 1000, -tao * 1000),
            new Point(0, -1000, -tao * 1000),
            new Point(tao * 1000, 0, 1000),
            new Point(-tao * 1000, 0, 1000),
            new Point(tao * 1000, 0, -1000),
            new Point(-tao * 1000, 0, -1000)
        ];
        var points = {};
        for (var _i = 0, corners_1 = corners; _i < corners_1.length; _i++) {
            var corner = corners_1[_i];
            points[corner.toString()] = corner;
        }
        var faces = [
            new Face(corners[0], corners[1], corners[4], false),
            new Face(corners[1], corners[9], corners[4], false),
            new Face(corners[4], corners[9], corners[5], false),
            new Face(corners[5], corners[9], corners[3], false),
            new Face(corners[2], corners[3], corners[7], false),
            new Face(corners[3], corners[2], corners[5], false),
            new Face(corners[7], corners[10], corners[2], false),
            new Face(corners[0], corners[8], corners[10], false),
            new Face(corners[0], corners[4], corners[8], false),
            new Face(corners[8], corners[2], corners[10], false),
            new Face(corners[8], corners[4], corners[5], false),
            new Face(corners[8], corners[5], corners[2], false),
            new Face(corners[1], corners[0], corners[6], false),
            new Face(corners[11], corners[1], corners[6], false),
            new Face(corners[3], corners[9], corners[11], false),
            new Face(corners[6], corners[10], corners[7], false),
            new Face(corners[3], corners[11], corners[7], false),
            new Face(corners[11], corners[6], corners[7], false),
            new Face(corners[6], corners[0], corners[10], false),
            new Face(corners[9], corners[1], corners[11], false)
        ];
        var getPointIfExists = function (point) {
            var key = point.toString();
            if (points[key]) {
                return points[key];
            }
            else {
                points[key] = point;
                return point;
            }
        };
        var newFaces = [];
        for (var f = 0; f < faces.length; f++) {
            var prev = [];
            var bottom = [faces[f].points[0]];
            var left = faces[f].points[0].subdivide(faces[f].points[1], numDivisions, getPointIfExists);
            var right = faces[f].points[0].subdivide(faces[f].points[2], numDivisions, getPointIfExists);
            for (var i = 1; i <= numDivisions; i++) {
                prev = bottom.slice();
                bottom.length = 0;
                bottom.push.apply(bottom, left[i].subdivide(right[i], i, getPointIfExists));
                for (var j = 0; j < i; j++) {
                    newFaces.push(new Face(prev[j], bottom[j], bottom[j + 1]));
                    if (j > 0) {
                        newFaces.push(new Face(prev[j - 1], prev[j], bottom[j]));
                    }
                }
            }
        }
        // Project points to sphere
        var newPoints = {};
        for (var p in points) {
            var np = points[p].project(radius);
            newPoints[np.toString()] = np;
        }
        // Create tiles
        this.tiles = [];
        this.tileLookup = {};
        for (var p in newPoints) {
            var newTile = new Tile(newPoints[p], hexSize);
            this.tiles.push(newTile);
            this.tileLookup[newPoints[p].toString()] = newTile;
        }
        // Resolve neighbors
        for (var _a = 0, _b = this.tiles; _a < _b.length; _a++) {
            var tile = _b[_a];
            for (var _c = 0, _d = tile.neighborIds; _c < _d.length; _c++) {
                var neighborId = _d[_c];
                var neighborTile = this.tileLookup[neighborId];
                if (neighborTile && neighborTile !== tile) {
                    tile.neighbors.push(neighborTile);
                }
            }
        }
        // Debug: Log neighbor stats
        console.log("\uD83D\uDD17 Neighbor resolution complete. Tiles: ".concat(this.tiles.length));
        var tilesWithNeighbors = this.tiles.filter(function (t) { return t.neighbors.length > 0; }).length;
        console.log("\uD83D\uDD17 Tiles with neighbors: ".concat(tilesWithNeighbors, "/").concat(this.tiles.length));
        if (this.tiles.length > 0) {
            var avgNeighbors = this.tiles.reduce(function (sum, t) { return sum + t.neighbors.length; }, 0) / this.tiles.length;
            console.log("\uD83D\uDD17 Average neighbors per tile: ".concat(avgNeighbors.toFixed(1)));
        }
        console.log(this.viewMode);
        if (this.viewMode === 'tile' || this.viewMode === 'both') {
            this.createMeshes();
        }
        if (this.viewMode === 'planet' || this.viewMode === 'both') {
            console.log('🌍 Creating planet and atmosphere meshes...');
            this.createPlanetMesh();
            this.createAtmosphereMesh();
        }
    };
    HexaSphere.prototype.isLand = function (lat, lon) {
        if (!this.projectionData || !this.projectionCanvas) {
            return Math.random() > 0.3;
        }
        var x = Math.floor(this.projectionCanvas.width * (lon + 180) / 360);
        var y = Math.floor(this.projectionCanvas.height * (lat + 90) / 180);
        var clampedX = Math.max(0, Math.min(this.projectionCanvas.width - 1, x));
        var clampedY = Math.max(0, Math.min(this.projectionCanvas.height - 1, y));
        var pixelIndex = (clampedY * this.projectionCanvas.width + clampedX) * 4;
        return this.projectionData.data[pixelIndex] === 0;
    };
    // Public method for tile clicking functionality
    HexaSphere.prototype.isLandPublic = function (lat, lon) {
        return this.isLand(lat, lon);
    };
    // Helper method to get basic terrain type from coordinates
    HexaSphere.prototype.getBasicTerrainType = function (lat, lon) {
        if (!this.projectionData || !this.projectionCanvas) {
            return 'ocean';
        }
        var x = Math.floor(this.projectionCanvas.width * (lon + 180) / 360);
        var y = Math.floor(this.projectionCanvas.height * (lat + 90) / 180);
        var clampedX = Math.max(0, Math.min(this.projectionCanvas.width - 1, x));
        var clampedY = Math.max(0, Math.min(this.projectionCanvas.height - 1, y));
        var pixelIndex = (clampedY * this.projectionCanvas.width + clampedX) * 4;
        var r = this.projectionData.data[pixelIndex];
        var b = this.projectionData.data[pixelIndex + 2];
        var isLand = r === 0;
        if (!isLand)
            return 'ocean';
        var climateMarker = b;
        if (climateMarker === 255)
            return 'arctic';
        if (climateMarker === 50)
            return 'desert';
        if (climateMarker === 100)
            return 'mountain';
        if (climateMarker === 180)
            return 'forest';
        if (climateMarker === 200)
            return 'city';
        return 'forest'; // default land type
    };
    // Calculate mountain density in surrounding area
    HexaSphere.prototype.getMountainDensity = function (lat, lon, radius) {
        if (radius === void 0) { radius = 5; }
        var mountainCount = 0;
        var totalSamples = 0;
        // Sample in a grid around the point
        for (var dlat = -radius; dlat <= radius; dlat += 2) {
            for (var dlon = -radius; dlon <= radius; dlon += 2) {
                var sampleLat = lat + dlat;
                var sampleLon = lon + dlon;
                // Keep coordinates in valid range
                if (sampleLat >= -90 && sampleLat <= 90 && sampleLon >= -180 && sampleLon <= 180) {
                    var terrainType = this.getBasicTerrainType(sampleLat, sampleLon);
                    if (terrainType === 'mountain') {
                        mountainCount++;
                    }
                    totalSamples++;
                }
            }
        }
        return totalSamples > 0 ? mountainCount / totalSamples : 0;
    };
    // Public method to get terrain information
    HexaSphere.prototype.getTerrainInfo = function (lat, lon) {
        if (!this.projectionData || !this.projectionCanvas) {
            return { type: 'ocean', elevation: 0, temperature: 15, color: 0x0f2342 };
        }
        var x = Math.floor(this.projectionCanvas.width * (lon + 180) / 360);
        var y = Math.floor(this.projectionCanvas.height * (lat + 90) / 180);
        var clampedX = Math.max(0, Math.min(this.projectionCanvas.width - 1, x));
        var clampedY = Math.max(0, Math.min(this.projectionCanvas.height - 1, y));
        var pixelIndex = (clampedY * this.projectionCanvas.width + clampedX) * 4;
        var r = this.projectionData.data[pixelIndex];
        var g = this.projectionData.data[pixelIndex + 1];
        var b = this.projectionData.data[pixelIndex + 2];
        // Use RGB values to determine terrain types
        var isLand = r === 0;
        if (!isLand) {
            // Ocean depth based on blue intensity
            var depth = Math.min(255 - b, 200);
            var oceanColors = [0x0f2342, 0x1e3a8a, 0x2563eb, 0x3b82f6];
            return {
                type: 'ocean',
                elevation: -depth,
                temperature: Math.max(0, 25 - Math.abs(lat) * 0.3),
                color: oceanColors[Math.min(3, Math.floor(depth / 50))]
            };
        }
        // Land terrain analysis
        var absLat = Math.abs(lat);
        var baseTemp = 35 - absLat * 0.7;
        var elevation = g;
        var climateMarker = b;
        // Determine terrain type based on blue channel markers and climate
        if (climateMarker === 255) {
            // Snow-capped Mountains (white areas)
            return {
                type: 'arctic',
                elevation: elevation,
                temperature: Math.min(baseTemp, -5),
                color: 0xf8fafc
            };
        }
        else if (climateMarker === 240) {
            // Arctic/Tundra (light blue areas)
            return {
                type: 'arctic',
                elevation: elevation,
                temperature: Math.min(baseTemp, 0),
                color: 0xdbeafe
            };
        }
        else if (climateMarker === 50) {
            // Desert (yellow areas) 
            var desertColors = [0xfbbf24, 0xf59e0b, 0xd97706, 0xb45309];
            return {
                type: 'desert',
                elevation: elevation,
                temperature: Math.max(baseTemp, 25),
                color: desertColors[Math.min(3, Math.floor(elevation / 64))]
            };
        }
        else if (climateMarker === 100) {
            // Mountains (brown areas) with density-based elevation variation
            var mountainColors = [0x78716c, 0x57534e, 0x44403c, 0x292524];
            // Calculate mountain density to determine elevation
            // Mountains in the center of mountain regions are higher
            var mountainDensity = this.getMountainDensity(lat, lon, 3);
            // Base elevation from PNG (can be same for all mountains)
            var baseElevation = elevation;
            // Vary elevation based on mountain density (0.0 to 1.0)
            // Higher density = higher elevation (peak of mountain range)
            // Lower density = lower elevation (edges of mountain range)
            var densityMultiplier = 0.3 + (mountainDensity * 0.7); // Range: 0.3 to 1.0
            var variedElevation = baseElevation * densityMultiplier;
            // Add some random variation for natural look
            var randomVariation = 0.9 + (Math.random() * 0.2); // 0.9 to 1.1
            var finalElevation = Math.floor(variedElevation * randomVariation);
            // Debug logging for mountain elevation
            if (Math.random() < 0.005) { // Log 0.5% of mountain tiles
                console.log("Mountain at lat:".concat(lat.toFixed(1), ", lon:").concat(lon.toFixed(1), " - density:").concat(mountainDensity.toFixed(2), ", base:").concat(baseElevation, ", final:").concat(finalElevation));
            }
            return {
                type: 'mountain',
                elevation: finalElevation,
                temperature: baseTemp - finalElevation * 0.1,
                color: mountainColors[Math.min(3, Math.floor(finalElevation / 64))]
            };
        }
        else if (climateMarker === 180) {
            // Jungle (dark green areas)
            var jungleColors = [0x166534, 0x15803d, 0x16a34a, 0x22c55e];
            return {
                type: 'forest',
                elevation: elevation,
                temperature: baseTemp,
                color: jungleColors[Math.min(3, Math.floor(elevation / 64))]
            };
        }
        else if (climateMarker === 200) {
            // Alien crystals
            return {
                type: 'city', // Using city type for alien terrain
                elevation: elevation,
                temperature: baseTemp + 5,
                color: 0xff00ff
            };
        }
        else {
            // Default grassland/forest
            var forestColors = [0x7cfc00, 0x397d02, 0x77ee00, 0x61b329, 0x83f52c];
            return {
                type: 'forest',
                elevation: elevation,
                temperature: baseTemp,
                color: forestColors[Math.min(4, Math.floor(elevation / 51))]
            };
        }
    };
    // A* pathfinding between two tiles
    HexaSphere.prototype.findPath = function (startTile, endTile) {
        var openSet = [startTile];
        var closedSet = new Set();
        var cameFrom = new Map();
        var gScore = new Map();
        var fScore = new Map();
        // Initialize scores
        for (var _i = 0, _a = this.tiles; _i < _a.length; _i++) {
            var tile = _a[_i];
            gScore.set(tile, Infinity);
            fScore.set(tile, Infinity);
        }
        gScore.set(startTile, 0);
        fScore.set(startTile, this.heuristic(startTile, endTile));
        while (openSet.length > 0) {
            // Find tile with lowest fScore
            var current = openSet[0];
            for (var _b = 0, openSet_1 = openSet; _b < openSet_1.length; _b++) {
                var tile = openSet_1[_b];
                if (fScore.get(tile) < fScore.get(current)) {
                    current = tile;
                }
            }
            // If we reached the goal
            if (current === endTile) {
                var path = [];
                var temp = current;
                while (temp) {
                    path.unshift(temp);
                    temp = cameFrom.get(temp);
                }
                return path;
            }
            // Move current from open to closed set
            openSet.splice(openSet.indexOf(current), 1);
            closedSet.add(current);
            // Check all neighbors
            for (var _c = 0, _d = current.neighbors; _c < _d.length; _c++) {
                var neighbor = _d[_c];
                if (closedSet.has(neighbor))
                    continue;
                var tentativeGScore = gScore.get(current) + 1; // Distance between neighbors is 1
                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                }
                else if (tentativeGScore >= gScore.get(neighbor)) {
                    continue;
                }
                cameFrom.set(neighbor, current);
                gScore.set(neighbor, tentativeGScore);
                fScore.set(neighbor, tentativeGScore + this.heuristic(neighbor, endTile));
            }
        }
        return []; // No path found
    };
    // Heuristic function for A* (Euclidean distance between tile centers)
    HexaSphere.prototype.heuristic = function (tileA, tileB) {
        var dx = tileA.centerPoint.x - tileB.centerPoint.x;
        var dy = tileA.centerPoint.y - tileB.centerPoint.y;
        var dz = tileA.centerPoint.z - tileB.centerPoint.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };
    // Add a 3D text label above a tile
    HexaSphere.prototype.addTileLabel = function (tileIndex, text, color, height) {
        if (color === void 0) { color = 0xffffff; }
        if (height === void 0) { height = 5; }
        var tile = this.tiles[tileIndex];
        if (!tile)
            return new THREE.Object3D();
        // Track labels per tile for spacing
        if (!this.tileLabelCounts) {
            this.tileLabelCounts = new Map();
        }
        var labelCount = this.tileLabelCounts.get(tileIndex) || 0;
        this.tileLabelCounts.set(tileIndex, labelCount + 1);
        // Create text sprite
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        context.fillStyle = "#".concat(color.toString(16).padStart(6, '0'));
        context.font = 'Bold 24px Arial';
        context.textAlign = 'center';
        context.fillText(text, 128, 40);
        var texture = new THREE.CanvasTexture(canvas);
        var spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        var sprite = new THREE.Sprite(spriteMaterial);
        // Position above tile with vertical spacing for multiple labels
        var verticalOffset = labelCount * 2; // Space labels 2 units apart vertically
        var position = this.getTilePosition(tileIndex, height + verticalOffset);
        sprite.position.copy(position);
        sprite.scale.set(8, 2, 1);
        // Add connecting line
        var lineGeometry = new THREE.BufferGeometry();
        var tilePos = this.getTilePosition(tileIndex, 0.5);
        lineGeometry.setFromPoints([tilePos, position]);
        var lineMaterial = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7
        });
        var line = new THREE.Line(lineGeometry, lineMaterial);
        // Group sprite and line
        var group = new THREE.Group();
        group.add(sprite);
        group.add(line);
        this.scene.add(group);
        this.tileLabels.push(group);
        return group;
    };
    // Get 3D position above a tile
    HexaSphere.prototype.getTilePosition = function (tileIndex, height) {
        var tile = this.tiles[tileIndex];
        if (!tile)
            return new THREE.Vector3();
        // Normalize center point to sphere surface, then extend outward
        var center = tile.centerPoint;
        var length = Math.sqrt(center.x * center.x + center.y * center.y + center.z * center.z);
        var normalized = new THREE.Vector3(center.x / length, center.y / length, center.z / length);
        return normalized.multiplyScalar(this.radius + height);
    };
    // Create curved line between two tiles following sphere surface with elevated arc
    HexaSphere.prototype.createCurvedLine = function (startTileIndex, endTileIndex, color, segments) {
        if (color === void 0) { color = 0x00ffff; }
        if (segments === void 0) { segments = 20; }
        var startTile = this.tiles[startTileIndex];
        var endTile = this.tiles[endTileIndex];
        if (!startTile || !endTile) {
            return new THREE.Mesh();
        }
        // Get normalized positions on sphere surface
        var startPos = this.getTilePosition(startTileIndex, 0.5);
        var endPos = this.getTilePosition(endTileIndex, 0.5);
        // Calculate distance between points to determine arc height
        var distance = startPos.distanceTo(endPos);
        var maxArcHeight = Math.min(distance * 0.3, this.radius * 0.25); // Dynamic height based on distance
        // Create great circle path with elevated midpoint
        var points = [];
        for (var i = 0; i <= segments; i++) {
            var t = i / segments;
            // Spherical linear interpolation (SLERP)
            var dot = startPos.clone().normalize().dot(endPos.clone().normalize());
            var theta = Math.acos(Math.max(-1, Math.min(1, dot)));
            var interpolated = void 0;
            if (theta < 0.001) {
                // Points are very close, use linear interpolation
                interpolated = startPos.clone().lerp(endPos, t);
            }
            else {
                var sinTheta = Math.sin(theta);
                var a = Math.sin((1 - t) * theta) / sinTheta;
                var b = Math.sin(t * theta) / sinTheta;
                interpolated = startPos.clone().multiplyScalar(a).add(endPos.clone().multiplyScalar(b));
                interpolated.normalize();
            }
            // Add parabolic height curve - highest at midpoint (t=0.5)
            var heightMultiplier = 1 - Math.pow(2 * t - 1, 2); // Parabola: max at t=0.5, min at t=0,1
            var currentHeight = 0.5 + (maxArcHeight * heightMultiplier);
            interpolated.multiplyScalar(this.radius + currentHeight);
            points.push(interpolated);
        }
        // Create tube geometry following the curve
        var curve = new THREE.CatmullRomCurve3(points);
        var tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.08, 6, false);
        var tubeMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9
        });
        var tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
        this.scene.add(tubeMesh);
        this.pathLines.push(tubeMesh);
        return tubeMesh;
    };
    // Clear all path lines
    HexaSphere.prototype.clearPathLines = function () {
        for (var _i = 0, _a = this.pathLines; _i < _a.length; _i++) {
            var line = _a[_i];
            this.scene.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        }
        this.pathLines = [];
    };
    // Clear all tile labels
    HexaSphere.prototype.clearTileLabels = function () {
        for (var _i = 0, _a = this.tileLabels; _i < _a.length; _i++) {
            var label = _a[_i];
            this.scene.remove(label);
            // Dispose of materials and geometries in the group
            label.traverse(function (child) {
                if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(function (mat) { return mat.dispose(); });
                    }
                    else {
                        child.material.dispose();
                    }
                }
                else if (child instanceof THREE.Sprite) {
                    child.material.dispose();
                }
            });
        }
        this.tileLabels = [];
        this.tileLabelCounts = new Map(); // Reset label counts
    };
    HexaSphere.prototype.createMeshes = function () {
        // Dispose any existing instanced mesh
        if (this.tileInstancedMesh) {
            this.scene.remove(this.tileInstancedMesh);
            this.tileInstancedMesh.geometry.dispose();
            this.tileInstancedMesh.material.dispose();
            this.tileInstancedMesh = undefined;
        }
        // If no tiles, nothing to do
        if (!this.tiles || this.tiles.length === 0)
            return;
        // Create a base hex geometry (flat, centered at origin, pointing +Y)
        // We'll instance this many times and orient it to each tile normal.
        var hexSides = 6;
        var baseRadius = 1.0; // unit radius — we will scale each instance later
        var baseVertices = [];
        var baseIndices = [];
        // center vertex
        baseVertices.push(0, 0, 0);
        // ring vertices (flat hex in XZ plane, Y up)
        for (var i = 0; i < hexSides; i++) {
            var ang = (i / hexSides) * Math.PI * 2;
            var x = Math.cos(ang) * baseRadius;
            var z = Math.sin(ang) * baseRadius;
            baseVertices.push(x, 0, z);
        }
        // triangles (fan) - reverse winding for correct orientation after flip
        for (var i = 1; i <= hexSides; i++) {
            var a = 0;
            var b = i === hexSides ? 1 : i + 1;
            var c = i;
            baseIndices.push(a, b, c);
        }
        var baseGeometry = new THREE.BufferGeometry();
        baseGeometry.setAttribute('position', new THREE.Float32BufferAttribute(baseVertices, 3));
        baseGeometry.setIndex(baseIndices);
        baseGeometry.computeVertexNormals();
        // Single material for all instances; use vertex/instance colors
        var material = new THREE.MeshStandardMaterial({
            // We'll tint instance colors, so keep map optional
            // If you want the marble texture applied, you'd need a single texture and proper UVs.
            metalness: 0.1,
            roughness: 0.8,
            flatShading: false,
            // side: THREE.DoubleSide, // Remove double side to allow culling
        });
        // Create instanced mesh
        var count = this.tiles.length;
        var instanced = new THREE.InstancedMesh(baseGeometry, material, count);
        instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        // Initialize original positions array
        this.tileOriginalPositions = new Array(count);
        // Per-instance color attribute support: prefer setColorAt if available,
        // otherwise create instanceColor attribute manually.
        var supportSetColorAt = typeof instanced.setColorAt === 'function';
        if (!supportSetColorAt) {
            // create fallback instanceColor attribute
            var instanceColors = new Float32Array(count * 3);
            instanced.instanceColor = new THREE.InstancedBufferAttribute(instanceColors, 3);
            instanced.instanceColor.setUsage(THREE.DynamicDrawUsage);
        }
        // Helper vector/quaternion
        var up = new THREE.Vector3(0, 1, 0);
        var dummy = this.instanceDummy;
        var quat = new THREE.Quaternion();
        var posVec = new THREE.Vector3();
        // Compute a reasonable scale for instances so their size approximates the tile.boundary size.
        // We'll compute an average "tile radius" from the first tile that has a boundary.
        var averageTileScale = 1;
        for (var t = 0; t < this.tiles.length; t++) {
            var b = this.tiles[t].boundary;
            if (b && b.length > 0) {
                // distance center->first boundary point
                var cp = this.tiles[t].centerPoint;
                var bp = b[0];
                var dx = bp.x - cp.x;
                var dy = bp.y - cp.y;
                var dz = bp.z - cp.z;
                var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                // Project onto tangent plane approximate: use distance minus radial difference
                averageTileScale = dist; // this is a decent heuristic
                break;
            }
        }
        // scale factor since our base hex has radius 1.0
        var globalScaleFactor = averageTileScale || 1;
        // Build instances
        for (var i = 0; i < this.tiles.length; i++) {
            var tile = this.tiles[i];
            // Get terrain info to compute elevation multiplier (keep your logic)
            var latLon = tile.getLatLon(this.radius);
            var terrainInfo = this.getBasicTerrainType ? this.getBasicTerrainType(latLon.lat, latLon.lon) : this.getTerrainInfo(latLon.lat, latLon.lon);
            // We'll use getTerrainInfo (detailed) for elevation and color
            var detailed = this.getTerrainInfo(latLon.lat, latLon.lon);
            // Decide elevation multiplier (same logic you used in createMeshes previously)
            var elevationMultiplier = 0;
            if (detailed.type === 'mountain') {
                elevationMultiplier = 0.08;
            }
            else if (detailed.type === 'arctic' && detailed.elevation > 150) {
                elevationMultiplier = 0.06;
            }
            else if (detailed.type === 'desert') {
                elevationMultiplier = 0.03;
            }
            else if (detailed.type === 'forest') {
                elevationMultiplier = 0.02;
            }
            else if (detailed.type === 'city') {
                elevationMultiplier = 0.12;
            }
            var elevationHeight = (detailed.elevation / 255) * elevationMultiplier * this.radius;
            // Normal from center point
            var cp = tile.centerPoint;
            var length_1 = Math.sqrt(cp.x * cp.x + cp.y * cp.y + cp.z * cp.z);
            var nx = cp.x / length_1;
            var ny = cp.y / length_1;
            var nz = cp.z / length_1;
            var normal = new THREE.Vector3(nx, ny, nz);
            // Position the instance slightly above the sphere surface based on elevation
            posVec.copy(normal).multiplyScalar(this.radius + elevationHeight);
            // Build orientation: rotate base +Y to the normal direction
            quat.setFromUnitVectors(up, normal);
            // Apply to dummy object
            dummy.position.copy(posVec);
            // Original quaternion from normal
            dummy.quaternion.copy(quat);
            // Flip so hex faces outward
            var flipQuat = new THREE.Quaternion();
            flipQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
            dummy.quaternion.multiply(flipQuat);
            // Per-tile scale
            var scale = globalScaleFactor;
            if (tile.boundary && tile.boundary.length > 0) {
                var cp_1 = tile.centerPoint;
                var bp = tile.boundary[0];
                var dx = bp.x - cp_1.x;
                var dy = bp.y - cp_1.y;
                var dz = bp.z - cp_1.z;
                var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                scale = dist * 0.98;
            }
            dummy.scale.set(scale, 1, scale);
            dummy.updateMatrix();
            instanced.setMatrixAt(i, dummy.matrix);
            // Store original position for visibility toggling
            this.tileOriginalPositions[i] = posVec.clone();
            // Set instance color
            var color = new THREE.Color(detailed.color);
            if (supportSetColorAt) {
                instanced.setColorAt(i, color);
            }
            else {
                instanced.instanceColor.setXYZ(i, color.r, color.g, color.b);
            }
            // Store a reference to the instanced mesh for compatibility — do NOT treat this as per-tile unique meshes.
            tile.mesh = instanced; // NOTE: tile.mesh is the same object for every tile now
        }
        // Flag updates
        instanced.instanceMatrix.needsUpdate = true;
        if (!supportSetColorAt) {
            instanced.instanceColor.needsUpdate = true;
        }
        else if (instanced.instanceColor) {
            instanced.instanceColor.needsUpdate = true;
        }
        // Add to scene and keep reference
        this.tileInstancedMesh = instanced;
        this.scene.add(instanced);
        console.log("\u2705 InstancedMesh created with ".concat(count, " tiles."));
    };
    HexaSphere.prototype.createPlanetMesh = function () {
        return __awaiter(this, void 0, void 0, function () {
            var geometry, textureLoader, _a, visualTexture, continentMask, invertDisplacement, material, uvs, i;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        geometry = new THREE.SphereGeometry(this.radius, 256, 256);
                        textureLoader = new THREE.TextureLoader();
                        return [4 /*yield*/, Promise.all([
                                textureLoader.loadAsync("map.png"),
                                textureLoader.loadAsync("equirectangle_projection.png"),
                            ])];
                    case 1:
                        _a = _b.sent(), visualTexture = _a[0], continentMask = _a[1];
                        // --- Planet color map ---
                        visualTexture.wrapS = THREE.RepeatWrapping;
                        visualTexture.wrapT = THREE.RepeatWrapping;
                        visualTexture.colorSpace = THREE.SRGBColorSpace;
                        visualTexture.center.set(0.5, 0);
                        // --- Displacement map ---
                        continentMask.wrapS = THREE.RepeatWrapping;
                        continentMask.wrapT = THREE.RepeatWrapping;
                        continentMask.colorSpace = THREE.LinearSRGBColorSpace;
                        invertDisplacement = function (texture) {
                            var image = texture.image;
                            var canvas = document.createElement("canvas");
                            canvas.width = image.width;
                            canvas.height = image.height;
                            var ctx = canvas.getContext("2d");
                            ctx.drawImage(image, 0, 0);
                            var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            for (var i = 0; i < imgData.data.length; i += 4) {
                                imgData.data[i] = 255 - imgData.data[i]; // R
                                imgData.data[i + 1] = 255 - imgData.data[i + 1]; // G
                                imgData.data[i + 2] = 255 - imgData.data[i + 2]; // B
                            }
                            ctx.putImageData(imgData, 0, 0);
                            texture.image = canvas;
                            texture.needsUpdate = true;
                        };
                        invertDisplacement(continentMask);
                        material = new THREE.MeshStandardMaterial({
                            map: visualTexture,
                            displacementMap: continentMask,
                            displacementScale: this.radius * 0.05,
                        });
                        uvs = geometry.attributes.uv;
                        for (i = 0; i < uvs.count; i++) {
                            uvs.setX(i, (uvs.getX(i) + 0.49) % 1);
                        }
                        uvs.needsUpdate = true;
                        // --- Create planet mesh ---
                        this.planetMesh = new THREE.Mesh(geometry, material);
                        this.planetMesh.renderOrder = 0;
                        this.scene.add(this.planetMesh);
                        return [2 /*return*/];
                }
            });
        });
    };
    HexaSphere.prototype.createAtmosphereMesh = function () {
        var textureLoader = new THREE.TextureLoader();
        var atmosphereTexture = textureLoader.load("clouds.png", function () {
            console.log("☁️ Cloud texture loaded successfully");
        });
        var geometry = new THREE.SphereGeometry(this.radius * 1.10, 64, 64);
        var cloudMaterial = new THREE.MeshStandardMaterial({
            map: atmosphereTexture,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        this.atmosphereMesh = new THREE.Mesh(geometry, cloudMaterial);
        this.atmosphereMesh.renderOrder = 999;
        this.scene.add(this.atmosphereMesh);
    };
    HexaSphere.prototype.getTiles = function () {
        return this.tiles;
    };
    HexaSphere.prototype.getPlanetMesh = function () {
        return this.planetMesh;
    };
    HexaSphere.prototype.getAtmosphereMesh = function () {
        return this.atmosphereMesh;
    };
    // Animate the atmosphere clouds
    HexaSphere.prototype.animateAtmosphere = function (deltaTime) {
        if (this.atmosphereMesh) {
            // Rotate slightly + move texture for smooth effect
            //this.atmosphereMesh.rotation.y += deltaTime * 0.0005;
        }
    };
    HexaSphere.prototype.setTileColor = function (tileIndex, color) {
        // If we have instanced mesh, update its instance color; otherwise fallback to per-tile mesh behavior
        if (this.tileInstancedMesh) {
            var instanced = this.tileInstancedMesh;
            var supportSetColorAt = typeof instanced.setColorAt === 'function';
            var col = new THREE.Color(color);
            if (supportSetColorAt) {
                instanced.setColorAt(tileIndex, col);
            }
            else if (instanced.instanceColor) {
                instanced.instanceColor.setXYZ(tileIndex, col.r, col.g, col.b);
                instanced.instanceColor.needsUpdate = true;
            }
            else {
                // fallback: modify material color (will tint the whole instanced mesh) — not ideal
                instanced.material.color.setHex(color);
            }
            // Mark update
            instanced.instanceColor && instanced.instanceColor.needsUpdate && instanced.instanceColor.needsUpdate;
            instanced.instanceMatrix && instanced.instanceMatrix.needsUpdate && instanced.instanceMatrix.needsUpdate;
            return;
        }
        // Fallback: original per-tile mesh handling (in case instancing is not used)
        if (tileIndex >= 0 && tileIndex < this.tiles.length && this.tiles[tileIndex].mesh) {
            this.tiles[tileIndex].mesh.material.color.setHex(color);
        }
    };
    // Optional getter so external code can directly access the instanced mesh (if needed)
    HexaSphere.prototype.getTileInstancedMesh = function () {
        return this.tileInstancedMesh;
    };
    // Update tile visibility based on camera position - hide tiles on the back of the planet
    HexaSphere.prototype.updateTileVisibility = function (camera) {
        if (!this.tileInstancedMesh || !this.tiles)
            return;
        // Ensure scene matrix is up to date
        this.scene.updateMatrixWorld();
        var instanced = this.tileInstancedMesh;
        // Get camera position in world space
        var cameraPosition = camera.position.clone();
        // Apply inverse of scene transformation to get camera position in sphere's local space
        var inverseSceneMatrix = new THREE.Matrix4().copy(this.scene.matrixWorld).invert();
        cameraPosition.applyMatrix4(inverseSceneMatrix);
        var sphereCenter = new THREE.Vector3(0, 0, 0); // Sphere is at origin in local space
        // Get camera direction (normalized vector from camera to sphere center in local space)
        var cameraToCenter = sphereCenter.clone().sub(cameraPosition).normalize();
        for (var i = 0; i < this.tiles.length; i++) {
            var tile = this.tiles[i];
            var tilePos = new THREE.Vector3(tile.centerPoint.x, tile.centerPoint.y, tile.centerPoint.z);
            // Vector from camera to tile in local space
            var cameraToTile = tilePos.clone().sub(cameraPosition);
            // Dot product: if positive, tile is on the front side of the sphere
            var dotProduct = cameraToTile.dot(cameraToCenter);
            // Get current matrix
            var matrix = new THREE.Matrix4();
            instanced.getMatrixAt(i, matrix);
            // Extract current scale from matrix
            var currentScale = new THREE.Vector3();
            var position = new THREE.Vector3();
            var quaternion = new THREE.Quaternion();
            matrix.decompose(position, quaternion, currentScale);
            // Calculate target position and scale
            var targetPosition = this.tileOriginalPositions[i] ? this.tileOriginalPositions[i].clone() : position.clone();
            var targetScale = currentScale.clone();
            if (dotProduct > 0) {
                // Tile is on the front - show it at its original position
                var originalScale = this.calculateTileScale(tile);
                targetScale.set(originalScale, 1, originalScale);
            }
            else {
                // Tile is on the back - hide it by moving far away
                targetPosition.set(10000, 10000, 10000); // Move far away
                targetScale.set(0.01, 0.01, 0.01); // Small scale to avoid issues
            }
            // Only update if position or scale changed
            if (!position.equals(targetPosition) || !currentScale.equals(targetScale)) {
                // Update the matrix with new position and scale
                var newMatrix = new THREE.Matrix4();
                newMatrix.compose(targetPosition, quaternion, targetScale);
                instanced.setMatrixAt(i, newMatrix);
            }
        }
        instanced.instanceMatrix.needsUpdate = true;
    };
    // Helper method to calculate the original scale for a tile
    HexaSphere.prototype.calculateTileScale = function (tile) {
        if (tile.boundary && tile.boundary.length > 0) {
            var cp = tile.centerPoint;
            var bp = tile.boundary[0];
            var dx = bp.x - cp.x;
            var dy = bp.y - cp.y;
            var dz = bp.z - cp.z;
            var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            return dist * 0.98;
        }
        return 1; // fallback
    };
    // Clear existing tiles and regenerate
    HexaSphere.prototype.regenerate = function (radius, numDivisions, hexSize) {
        // Clear existing meshes
        if (this.tileInstancedMesh) {
            this.scene.remove(this.tileInstancedMesh);
            this.tileInstancedMesh.geometry.dispose();
            this.tileInstancedMesh.material.dispose();
            this.tileInstancedMesh = undefined;
        }
        // Clear original positions
        this.tileOriginalPositions = [];
        // Clear 3D elements
        this.clearPathLines();
        this.clearTileLabels();
        // Clear planet and atmosphere meshes
        if (this.planetMesh) {
            this.scene.remove(this.planetMesh);
            this.planetMesh.geometry.dispose();
            this.planetMesh.material.dispose();
            this.planetMesh = undefined;
        }
        if (this.atmosphereMesh) {
            this.scene.remove(this.atmosphereMesh);
            this.atmosphereMesh.geometry.dispose();
            this.atmosphereMesh.material.dispose();
            this.atmosphereMesh = undefined;
        }
        // Reset
        this.tiles = [];
        this.tileLookup = {};
        Face.idCounter = 0;
        // Update radius for new generation
        this.radius = radius;
        // Regenerate
        this.generateHexasphere(radius, numDivisions, hexSize, this.viewMode);
    };
    return HexaSphere;
}());
exports.HexaSphere = HexaSphere;
