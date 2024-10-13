const turf = require("@turf/turf");
const stringSimilarity = require("string-similarity");
const logger = require("../services/logging.service");
const geocodeDb = require("../db/geocoding.db");
const stringUtilities = require("../utilities/string.utility");
const min_rating = 0.75;
const cos_lat_0 = Math.cos((41.0 * Math.PI) / 180); //41 is to be the latitude of the zone
const earth_ray = 6373000;
const geocode = geocodeDb.getGeocoding(); //the main object of the server



async function addAddress(address) {
  geocodeDb
    .addAddress(address, () => {})
    .catch((error) => {
      logger.error("Could not save address to db, error: " + error);
    });
  address.source = undefined;
}
async function reverseGeocodeRequest(id, _longitude, _latitude, _ray) {
  const data = {
    longitude: _longitude,
    latitude: _latitude,
    ray: _ray,
  };
  let bestPoint = findClosestPoint(_longitude, _latitude, _ray);
  if (bestPoint) return { status: 200, response: JSON.stringify(bestPoint) };

  logger.info(id + "no address within " + _ray + "m, call external provider");
  return { redirect: true, data: data };
}
async function geocodeRequest(id, _street, _city, _number, _poi) {
  const elementKey = _poi ? _poi : getBestStreetKey(_street, _city);
  const bestCityKey = getBestCityKey(elementKey, _city);
  const data = {
    element: elementKey,
    city: bestCityKey,
    number: _number,
    poi: _poi,
  };
  const elementObject = getBestElement(elementKey, bestCityKey, !_poi);
  if (Array.isArray(elementObject))
    if (elementObject.length >= 2) {
      const error = "Many addresses found, provide the accurate address";
      logger.error(id + error + ' ' + elementObject);
      return { status: 400, response: JSON.stringify(error + ': ' + elementObject), data: data };
    } else {
      return { status: 200, response: JSON.stringify(elementObject) };
    }
  if (!elementObject || !elementObject[bestCityKey]?.place.latitude)
    return { redirect: true, data: data };
  const bestCity = getBestCity(
    elementObject,
    bestCityKey,
    undefined,
    undefined
  );
  if (!bestCity) {
    if (!bestCityKey) {
      const error = "too many cities having the same element, provide the city";
      logger.error(id + error);
      return { status: 400, response: error };
    }
    logger.info(
      id + "no match of city in the database, call external provider"
    );
    return { redirect: true, data: data };
  }
  data.city = bestCity;
  const address = getBestAddress(elementObject, bestCity, _number);
  if (address) return { status: 200, response: JSON.stringify(address) };
  logger.info(
    id + "no match of number in the database, call external provider"
  );
  return { redirect: true, data: data };
}
const getBestElement = (elementKey) => {
  if (!elementKey) return undefined;
  if (Array.isArray(elementKey)) return elementKey;
  return geocode.street_dictionary[elementKey]
    ? geocode.street_dictionary[elementKey]
    : geocode.poi_dictionary[elementKey];
};
const getBestCap = (coordinates) => {
  if (!coordinates || !Array.isArray(coordinates)) return undefined;
  let debugCounter = 0;
  let matchingZone = geocode.cap_dictionary.romeZone.features.find((zone) => {
    debugCounter += 1;
    return turf.booleanPointInPolygon(coordinates, zone.geometry);
  });
  console.log(debugCounter);
  if (!matchingZone)
    matchingZone = geocode.cap_dictionary.ZoneWithoutRomeCap.features.find(
      (zone) => turf.booleanPointInPolygon(coordinates, zone.geometry)
    );
  return matchingZone?.properties.CAP;
};

const getBestStreetKey = (street, city) => {
  if (geocode.street_dictionary[street]) return street;
  const streets = stringUtilities.findOverlappingWords(
    street,
    Object.keys(geocode.street_dictionary)
    );
    let streets2 = streets;
    if (city) {
      streets2 = [];
      streets.forEach((key_street) => {
        const street_obj = geocode.street_dictionary[key_street];
        if (
          street_obj[city] ||
          stringUtilities.findOverlappingWords(
            city,
            Object.keys(geocode.city_dictionary)
            ).length > 0
            )
            streets2.push(key_street);
          });
  }
  if (streets2.length == 0) {
    const matches = stringSimilarity.findBestMatch(
      street,
      Object.keys(geocode.street_dictionary)
      );
      return matches.bestMatch.rating >= min_rating
      ? matches.bestMatch.target
      : street;
    }
    const numStreets = streets.length;

    if (numStreets === 1 || numStreets > 5) {
        return streets[0];
    }
    
    if (streets2.length === 1) {
        return streets2[0];
    }
    
    if (numStreets > 0) {
        return streets;
    }
  };
  const getBestCityKey = (street_obj, city) => {
    if (!city) return undefined;
    if (street_obj[city]) return street_obj[city];
    if (typeof street_obj !== "string") {
    const matches = stringSimilarity.findBestMatch(
      city,
      Object.keys(street_obj)
      );
      if (matches.bestMatch.rating >= min_rating) return matches.bestMatch.target;
    }
    const matches = stringSimilarity.findBestMatch(
      city,
      Object.keys(geocode.city_dictionary)
      );
      if (matches.bestMatch.rating >= min_rating) return matches.bestMatch.target;
      return city;
   
 };

const getBestCity = (streetObject, city, longitude, latitude) => {
  if (city && city != "") return city;
  if (Object.keys(streetObject).length == 1)
  return Object.keys(streetObject)[0];
return findClosestCityViaCoordinates(longitude, latitude);
};
const getBestAddress = (bestStreet, bestCity, _number) => {
  if (!bestStreet[bestCity]) return undefined;
  if (!bestStreet[bestCity]?.number_dictionary) return bestStreet[bestCity];
  if (!_number) return bestStreet[bestCity].place;
  if (bestStreet[bestCity].number_dictionary[_number]) {
    return getAddressFromNumberDict(
      bestStreet[bestCity].number_dictionary,
      _number
      );
    }
    if (
      Object.keys(bestStreet[bestCity]?.number_dictionary).includes(_number) ===
      false
      )
      return undefined;
      return bestStreet[bestCity].place;
    };
    const getAddressFromNumberDict = (number_dictionary, number) => {
      const address_index = number
      ? number_dictionary[number]
      : Object.values(number_dictionary)[0];
      return geocode.addresses[address_index];
    };
    const findClosestCityViaCoordinates = (longitude, latitude) => {
      if (!longitude || !latitude) return undefined;
  let bestCity = undefined;
  let bestDistance = Infinity;
  for (const [key, value] of Object.entries(geocode.city_dictionary)) {
    const distance =
    ((earth_ray * Math.PI) / 180) *
    Math.sqrt(
      (cos_lat_0 * (value.longitude - longitude)) ** 2 +
      (value.latitude - latitude) ** 2
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        bestCity = key;
      }
    }
    return bestCity;
  };
  const findClosestPoint = (longitude, latitude, ray) => {
    let dataObj = geocode.pindex
    .within(
      longitude * cos_lat_0,
      latitude,
      ((ray / earth_ray) * 180) / Math.PI
      )
      .map((id) => geocode.addresses[id]);
      if (dataObj.length > 0) {
        let bestPoint = undefined;
        let minDist2 = Infinity;
        dataObj.forEach((p) => {
          const dist2 =
          (p.longitude - longitude) *
          cos_lat_0 *
          ((p.longitude - longitude) * cos_lat_0) +
          (p.latitude - latitude) * (p.latitude - latitude);
          if (minDist2 > dist2) {
            minDist2 = dist2;
            bestPoint = p;
          }
        });
        if (bestPoint) return bestPoint;
        return undefined;
      }
};

module.exports = {
  addAddress: addAddress,
  reverseGeocodeRequest: reverseGeocodeRequest,
  geocodeRequest: geocodeRequest,
  getBestCap: getBestCap,
};