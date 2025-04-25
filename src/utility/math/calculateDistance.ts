export const calculateDistance = (
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
): number => {
  const EARTH_RADIUS_KM = 6371;

  const startLatRad = startLat * (Math.PI / 180);
  const startLngRad = startLng * (Math.PI / 180);
  const endLatRad = endLat * (Math.PI / 180);
  const endLngRad = endLng * (Math.PI / 180);

  const dLat = endLatRad - startLatRad;
  const dLng = endLngRad - startLngRad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(startLatRad) *
      Math.cos(endLatRad) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return distance;
};

/**
 * @param user
 * @returns
 */
export const calculateBearing = (user: any): number | null => {
  const fromLng = user?.from?.coordinates[0];
  const fromLat = user?.from?.coordinates[1];
  const toLng = user?.to?.coordinates[0];
  const toLat = user?.to?.coordinates[1];

  // Convert to radians
  const fromLatRad = fromLat * (Math.PI / 180);
  const toLatRad = toLat * (Math.PI / 180);
  const lngDiffRad = (toLng - fromLng) * (Math.PI / 180);

  const y = Math.sin(lngDiffRad) * Math.cos(toLatRad);
  const x =
    Math.cos(fromLatRad) * Math.sin(toLatRad) -
    Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(lngDiffRad);
  let bearingRad = Math.atan2(y, x);
  let bearingDeg = bearingRad * (180 / Math.PI);

  bearingDeg = (bearingDeg + 360) % 360;

  return parseFloat(bearingDeg.toFixed(1));
};

/**
 * @param distanceKm - Distance in kilometers
 * @returns Classification of route type
 */
export const classifyRouteType = (distanceKm: number | null): string => {
  if (distanceKm === null) return 'unknown';

  if (distanceKm < 1) return 'very_short';
  if (distanceKm < 5) return 'short';
  if (distanceKm < 20) return 'medium';
  if (distanceKm < 100) return 'long';
  return 'very_long';
};
