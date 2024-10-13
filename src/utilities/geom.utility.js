module.exports.findClosestPoint = function(pointArray) {
    let bestPoint = undefined;
    let minDist2 = Infinity;
    pointArray.forEach(p => {
        const dist2 = ((p.longitude - longitude) * cos_lat_0) * ((p.longitude - longitude) * cos_lat_0) + (p.latitude - latitude) * (p.latitude - latitude)
        if (minDist2 > dist2) {
            minDist2 = dist2;
            bestPoint = p;
        };
    });
    if (bestPoint) return bestPoint;
    return undefined;
}

