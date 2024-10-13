const config = require("../configurations/config");
const logger = require("../services/logging.service");
const axios = require("axios");
const baseUrl = "https://maps.googleapis.com/maps/api/geocode/json?";
const additionalOptions = `&language=${config.GOOGLE_LANG}&key=${config.GOOGLE_KEY}`;
const sourceName = "EXT1";
const stringUtilities = require("../utilities/string.utility");

async function getResponseReverseGeocode(data) {
  const url = `${baseUrl}latlng=${data.latitude},${data.longitude}${additionalOptions}`;
  try {
    const response = await axios.get(url);
    const jres = response.data;
    if (jres.status == "OK") {
      let currRes = jres.results[0];
      let address = formattedAddressToAddress(currRes.formatted_address);
      if (!address.street) return undefined;
      const a = {
        street: address.street,
        city: address.city,
        number: address.number,
        longitude: currRes.geometry.location.lng,
        latitude: currRes.geometry.location.lat,
        source: sourceName,
        cap: address.cap,
      };
      return a;
    }
  } catch (error) {
    logger.error(error);
  }
  return undefined;
}

async function getResponseGeocode(data) {
  const element = Array.isArray(data.element) ? data.element[0] : data.element;
  const url = `${baseUrl}address=${stringUtilities
    .cleanString(element)
    .replace(/[^\w\s]/gi, "")
    .toUpperCase()} ,${data.number ? " " + data.number : ""},${
    data.city ? " " + data.city.toUpperCase() : ""
  },${additionalOptions}`;
  try {
    const response = await axios.get(url);
    const jres = response.data;
    if (jres.status == "OK") {
      if (!data.city && jres.results.length > 1) {
        return undefined;
      }
      const bestMatch = getBestAddress(jres, data.city, element, data.number);
      if (bestMatch) {
        return bestMatch;
      }
    }
    return undefined;
  } catch (error) {
    logger.error(error);
    return undefined;
  }
}

function getBestAddress(jres, city, element, data) {
  const resFinder =
    jres.results.length >= 2 ? jres.results.slice(0, 1) : jres.results;
  for (i = 0; i < resFinder.length; i++) {
    let currRes = resFinder[i];
    let address = formattedAddressToAddress(currRes.formatted_address);
    if (!address.street || address.city == "italia") {
      return undefined;
    } else if (address.city) {
      let filteredString;
      for (const pattern of patterns) {
        if (element.startsWith(pattern)) {
          filteredString = undefined;
          break;
        } else {
          filteredString = address.poi;
        }
      }
      const a = {
        street: address.street,
        city: address.city,
        number: address.number ? address.number : data,
        longitude: currRes.geometry.location.lng,
        latitude: currRes.geometry.location.lat,
        source: sourceName,
        poi: filteredString,
        cap: address.cap,
      };
      return a;
    } else {
      const a = {
        street: address,
        longitude: currRes.geometry.location.lng,
        latitude: currRes.geometry.location.lat,
      };
      return a;
    }
  }
  return undefined;
}

const patterns = [
  "via",
  "viale",
  "piazza",
  "corso",
  "piazzale",
  "vicolo",
  "traversa",
  "circonvallazione",
  "vialetto",
];

function formattedAddressToAddress(formatted_address) {
  const capRegex = /\b\d{5}\b /; // Matches a sequence of 5 digits
  const provinceRegex = / \b[A-Z]{2}\b/; // Matches a word of two capital letters
  const numberRegex =
  /^(\d{1,4}(?:[/-]\d+|[/-]?[a-zA-Zâ°]+)?(?:\sINT\s\d+)?(?:\/INT\s\d+)?)\s*([a-zA-Zâ°]+\s+[a-zA-Zâ°]+)?$/;
  let currAddress = formatted_address.split(", ");
  const number = currAddress[1].match(numberRegex) ? currAddress[1] : 0;
  let cap = formatted_address.match(capRegex);
  const numericFiveDigitNumber = cap ? parseInt(cap[0], 10) : "";
  const formattedFiveDigitNumber = numericFiveDigitNumber
    ? String(numericFiveDigitNumber).padStart(5, "0")
    : "";
  if (currAddress.length > 3 && currAddress.length < 5 && number !== undefined) {
    return {
      street: currAddress[0].replace(numberRegex, "").toLowerCase().trim(),
      number: Array.isArray(number) ? number[0] : number,
      city: currAddress[2]
        .replace(capRegex, "")
        .replace(provinceRegex, "")
        .toLowerCase()
        .trim()
        ? currAddress[2]
            .replace(capRegex, "")
            .replace(provinceRegex, "")
            .toLowerCase()
            .trim()
        : currAddress[1]
            .replace(capRegex, "")
            .replace(provinceRegex, "")
            .toLowerCase()
            .trim(),
      cap: formattedFiveDigitNumber ? formattedFiveDigitNumber : "",
      poi: currAddress[0].replace(numberRegex, "").toLowerCase().trim(),
    };
  }
  if (currAddress.length == 2) {
    return {
      city: currAddress[0]
        .replace(capRegex, "")
        .replace(provinceRegex, "")
        .toLowerCase()
        .trim(),
    };
  }
  if (currAddress.length === 5) {
    return {
      street: currAddress[0].replace(numberRegex, "").toLowerCase().trim(),
      number: currAddress[2] ? currAddress[2] : "",
      city: currAddress[3]
        .replace(capRegex, "")
        .replace(provinceRegex, "")
        .toLowerCase()
        .trim()
        ? currAddress[3]
            .replace(capRegex, "")
            .replace(provinceRegex, "")
            .toLowerCase()
            .trim()
        : currAddress[1]
            .replace(capRegex, "")
            .replace(provinceRegex, "")
            .toLowerCase()
            .trim(),
      cap: formattedFiveDigitNumber ? formattedFiveDigitNumber : "",
      poi: currAddress[0].replace(numberRegex, "").toLowerCase().trim(),
    };
  } else {
    return {
      street: currAddress.length == 3 ? currAddress[0] : currAddress[1],
      city:
        currAddress.length > 5
          ? currAddress[4]
              .replace(capRegex, "")
              .replace(provinceRegex, "")
              .toLowerCase()
              .trim()
          : currAddress[1]
              .replace(capRegex, "")
              .replace(provinceRegex, "")
              .toLowerCase()
              .trim(),
      cap: formattedFiveDigitNumber,
      poi:
        currAddress.length == 3
          ? currAddress[0].toLowerCase()
          : currAddress[1].toLowerCase(),
    };
  }
}

module.exports = {
  getResponseReverseGeocode: getResponseReverseGeocode,
  getResponseGeocode: getResponseGeocode,
};
