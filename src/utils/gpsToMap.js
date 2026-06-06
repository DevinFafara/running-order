const IMG_W = 1376;
const IMG_H = 768;

// GCPs: pixel coords (px, py) on the 1376×768 map image ↔ WGS84 (lat, lng)
const GCPs = [
    { px: 220,  py: 411, lat: 47.09838592678802,  lng: -1.2654953502100839 },
    { px: 1163, py: 601, lat: 47.09899466285551,  lng: -1.2711859991406294 },
    { px: 518,  py: 132, lat: 47.09545529495340,  lng: -1.2661178882208430 },
    { px: 761,  py: 244, lat: 47.09644183415583,  lng: -1.2682548789783852 },
    { px: 963,  py: 481, lat: 47.09821056781993,  lng: -1.2700067763282155 },
    { px: 118,  py: 339, lat: 47.09785549398738,  lng: -1.2645868583674342 },
    { px: 537,  py: 373, lat: 47.09774937418118,  lng: -1.2672285843697455 },
    { px: 716,  py: 337, lat: 47.09725500229239,  lng: -1.2681156543366430 },
    { px: 335,  py: 229, lat: 47.09661793685496,  lng: -1.2653472421265313 },
    { px: 526,  py: 301, lat: 47.09712560946964,  lng: -1.2668776688205787 },
];

// Center inputs to avoid ill-conditioned matrix (lat ≈ 47, variations ≈ 0.003)
const meanLat = GCPs.reduce((s, p) => s + p.lat, 0) / GCPs.length;
const meanLng = GCPs.reduce((s, p) => s + p.lng, 0) / GCPs.length;

function matMul(A, B) {
    const m = A.length, k = B.length, n = B[0].length;
    const C = Array.from({ length: m }, () => Array(n).fill(0));
    for (let i = 0; i < m; i++)
        for (let j = 0; j < n; j++)
            for (let p = 0; p < k; p++)
                C[i][j] += A[i][p] * B[p][j];
    return C;
}

function matT(A) {
    return A[0].map((_, j) => A.map(row => row[j]));
}

function inv3(M) {
    const [[a, b, c], [d, e, f], [g, h, i]] = M;
    const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    const inv = 1 / det;
    return [
        [(e * i - f * h) * inv, (c * h - b * i) * inv, (b * f - c * e) * inv],
        [(f * g - d * i) * inv, (a * i - c * g) * inv, (c * d - a * f) * inv],
        [(d * h - e * g) * inv, (b * g - a * h) * inv, (a * e - b * d) * inv],
    ];
}

function fitAffine(gcps, key) {
    const A = gcps.map(p => [p.lat - meanLat, p.lng - meanLng, 1]);
    const b = gcps.map(p => [p[key]]);
    const AT = matT(A);
    return matMul(inv3(matMul(AT, A)), matMul(AT, b)).map(r => r[0]);
}

// Pre-compute affine coefficients once at module load
const [ax, bx, cx] = fitAffine(GCPs, 'px');
const [ay, by, cy] = fitAffine(GCPs, 'py');

export function gpsToMapPosition(lat, lng) {
    const latC = lat - meanLat;
    const lngC = lng - meanLng;
    const px = Math.max(0, Math.min(IMG_W, ax * latC + bx * lngC + cx));
    const py = Math.max(0, Math.min(IMG_H, ay * latC + by * lngC + cy));
    return {
        x: `${(px / IMG_W * 100).toFixed(1)}%`,
        y: `${(py / IMG_H * 100).toFixed(1)}%`,
    };
}
