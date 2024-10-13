const stringUtilities = require("../utilities/string.utility");
const config = require("../configurations/config");
const path = require("path");
const fs = require("fs");
const bucket = require("../services/firebase.service");
const Papa = require("papaparse"); //parse the csv and get the json
const KDBush = require("kdbush"); //make a geographic index
const cos_lat_0 = Math.cos((41.0 * Math.PI) / 180); //41 is to be the latitude of the zone
const address_file_path = path.join(__dirname, config.DB_CONNECTION_STRING);
const cap_path = path.join(__dirname, config.CAP_SHAPE_FILE);
const shapes_rome = path.join(__dirname, config.SHAPE_ROME);
const shapes_not_rome = path.join(__dirname, config.SHAPE_NOT_ROME);
const cap = require("./cap.db");
const logger = require("../services/logging.service");

let geocode;

async function ImportAddressesList(address_file_path) {
  if (config.IS_LOCAL === false) {
    const downloadFile = async () => {
      const options = {
        destination: address_file_path,
      };
      // Downloads the file
      await bucket.bucket.file(config.STORAGE_FILE_NAME).download(options);
      logger.info(`downloaded to ${address_file_path}`);
    };
    await downloadFile();
  }
  return fs.readFileSync(address_file_path, "utf8");
}

async function initialize(address_file_type) {
  const romeZone = await cap.importRomeCap(shapes_rome);
  const ZoneWithoutRomeCap = await cap.importZoneWithoutRomeCap(
    shapes_not_rome
  );
  const addressesList = config.IS_LOCAL
    ? await ImportAddressesList(address_file_path)
    : await cap.ImportAddressesList(address_file_path);

  let json_array;
  if (address_file_type === "default") {
    if (config.IS_LOCAL) {
      const pjson = Papa.parse(addressesList, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
      });
      json_array = pjson.data;
    } else {
      json_array = addressesList;
    }
  } else if (address_file_type === "taxi_requests") {
    const pjson = Papa.parse(addressesList, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
    });
    json_array = get_addresses_from_requests(pjson.data);
  } else if (address_file_type === "open_data") {
    const json = JSON.parse(addressesList);
    json_array = get_adresses_from_opendata(json);
  }

  setGeocoding(romeZone, ZoneWithoutRomeCap, json_array);
}

function getGeocoding() {
  return geocode;
}

function setGeocoding(romeZone, ZoneWithoutRomeCap, json_array) {
  geocode = {};
  geocode.addresses = [];
  geocode.new_addresses = [];
  geocode.street_dictionary = {};
  geocode.city_dictionary = {};
  geocode.pois = [];
  geocode.poi_dictionary = {};
  geocode.description = [];
  geocode.description_dictionary = {};
  geocode.cap_dictionary = { romeZone, ZoneWithoutRomeCap };

  geocode.addElementToDictionary = (a) => {
    if (
      geocode.street_dictionary[a.street] &&
      geocode.street_dictionary[a.street][a.city] &&
      geocode.street_dictionary[a.street][a.city].number_dictionary[a.number] &&
      geocode.street_dictionary[a.street][a.city].number_dictionary[a.number]
    ) {
      return false;
    }
    if (a.poi) {
      if (!geocode.poi_dictionary[a.poi]) geocode.poi_dictionary[a.poi] = {};
      geocode.poi_dictionary[a.poi][a.city] = {
        place: {
          street: a.street,
          city: a.city,
          number: a.number,
          description: a.description,
          longitude: a.longitude,
          latitude: a.latitude,
          poi: a.poi,
          cap: a.cap,
        },
        number_dictionary: {},
      };
      if (a.longitude && a.latitude) geocode.addresses.push(a);
    }
    if (a.street) {
      if (!geocode.street) geocode.street = {};
      if (geocode.street_dictionary) geocode.addresses.push(a);
      if (a.longitude && a.latitude) geocode.addresses.push(a);
    }

    //longitude and latitude with 5 decimal placel is around 1m precision
    if (!geocode.street_dictionary[a.street])
      geocode.street_dictionary[a.street] = {};
    const street_obj = geocode.street_dictionary[a.street];

    if (!street_obj[a.city])
      street_obj[a.city] = {
        place: {
          street: a.street,
          city: a.city,
          longitude: a.longitude,
          latitude: a.latitude,
          description: a.description,
          cap: a.cap,
          poi: a.poi,
        },
        number_dictionary: { number: a.number },
        poi_dictionary: {},
      };
    else {
      //TODO once we  clean csv we can maybe get rid of this
      street_obj[a.city].place.cap = a.cap;
    }

    if (a.longitude && a.latitude) {
      if (!geocode.city_dictionary[a.city])
        geocode.city_dictionary[a.city] = {
          longitude: 0,
          latitude: 0,
          num: 0,
        };
      geocode.city_dictionary[a.city].longitude += a.longitude;
      geocode.city_dictionary[a.city].latitude += a.latitude;
      geocode.city_dictionary[a.city].num += 1;

      geocode.addresses.push(a);
      if (a.number) {
        const address_index = geocode.addresses.length - 1;
        const city_obj = street_obj[a.city];
        if (!city_obj.number_dictionary[a.number]) {
          city_obj.number_dictionary[a.number] = address_index;

          const n = Object.keys(city_obj.number_dictionary).length;
          city_obj.place.longitude =
            (city_obj.place.longitude * (n - 1) + a.longitude) / n;
          city_obj.place.latitude =
            (city_obj.place.latitude * (n - 1) + a.latitude) / n;

          city_obj.place.longitude = Number(
            city_obj.place.longitude.toFixed(6)
          );
          city_obj.place.latitude = Number(city_obj.place.latitude.toFixed(6));
        }
      }
    }

    return true;
  };

  geocode.updatePindex = () => {
    geocode.pindex = new KDBush(
      geocode.addresses,
      (a) => a.longitude * cos_lat_0,
      (a) => a.latitude
    );
  };

  json_array.forEach((row) => {
    if (!row.street) return;
    const a = {
      street: stringUtilities.cleanString(row.street),
      city: stringUtilities.cleanString(row.city),
      number: row.number ? stringUtilities.cleanString(row.number) : "",
      longitude: row.longitude
        ? Number(Number(row.longitude).toFixed(6))
        : undefined,
      latitude: row.latitude
        ? Number(Number(row.latitude).toFixed(6))
        : undefined,
      poi: stringUtilities.cleanString(row.poi),
      description: stringUtilities.cleanString(row.description),
      cap: stringUtilities.cleanString(row.cap),
    };
    geocode.addElementToDictionary(a);
  });

  Object.values(geocode.city_dictionary).forEach((city) => {
    city.longitude = city.longitude / city.num;
    city.latitude = city.latitude / city.num;
  });
  geocode.updatePindex();

  return geocode;
}

async function addAddress(a, callBack) {
  const added = geocode.addElementToDictionary(a);

  if (added) {
    geocode.updatePindex();
    UpdateAddressesList(address_file_path, a, callBack);
  }
}

function UpdateAddressesList(address_file_path, a, callBack) {
  let wdata = "\r\n";
  wdata += (a.street ? a.street : "") + ";";
  wdata += (a.number ? a.number : "") + ";";
  wdata += (a.city ? a.city : "") + ";";
  wdata += (a.longitude ? a.longitude : "") + ";";
  wdata += (a.latitude ? a.latitude : "") + ";";
  wdata += (a.source ? a.source : "") + ";";
  wdata += (a.poi ? a.poi : "") + ";";
  wdata += (a.cap ? a.cap : "") + ";";

  if (config.IS_LOCAL === true) {
    return fs.appendFile(address_file_path, wdata, callBack);
  } else {
    fs.appendFile(address_file_path, wdata, callBack);
    const data = address_file_path;
    const dataPath = config.STORAGE_FILE_NAME;
    bucket.bucket
      .upload(Buffer.from(data), { destination: dataPath })
      .then(() => {
        logger.info("Data uploaded successfully!");
      })
      .catch((error) => {
        logger.error("Error uploading data:", error);
      });
  }
}

module.exports = {
  initialize: initialize,
  getGeocoding: getGeocoding,
  addAddress: addAddress,
  cap_path: cap_path,
};

const get_addresses_from_requests = (requests) => {
  const address_dictionary = {};
  geocode.states = {};
  requests.forEach((r) => {
    let orig;
    if (r.RIDE_TEXT_ORIGIN) {
      orig = get_address_from_google(r.RIDE_TEXT_ORIGIN, r.lon_req, r.lat_req);
    } else {
      orig = get_address_from_google(r.REQ_TEXT_ORIGIN, r.lon_req, r.lat_req);
    }
    if (orig && !address_dictionary[orig.key])
      address_dictionary[orig.key] = orig;

    let dest;
    if (r.RIDE_TEXT_DESTINATION) {
      dest = get_address_from_google(
        r.RIDE_TEXT_DESTINATION,
        r.lon_req_dest,
        r.lat_req_dest
      );
    } else {
      dest = get_address_from_google(
        r.REQ_TEXT_DESTINATION,
        r.lon_req_dest,
        r.lat_req_dest
      );
    }
    if (dest && !address_dictionary[dest.key])
      address_dictionary[dest.key] = dest;

    if (!geocode.states[r.STATE_DESCRIPTION])
      geocode.states[r.STATE_DESCRIPTION] = 0;
    geocode.states[r.STATE_DESCRIPTION] =
      geocode.states[r.STATE_DESCRIPTION] + 1;
  });
  return Object.values(address_dictionary);
};

const get_addresses_from_opendata = (addresses) => {
  const address_dictionary = {};
  addresses.forEach((a) => {
    const address = {
      street: stringUtilities.cleanString(a.DENOMINAZI),
      number: stringUtilities.cleanString(a.NCIVSUB),
      city: stringUtilities.cleanString(a.LOC_NOME),
      cap: stringUtilities.cleanString(a.CAP),
      longitude: Number(a.DO_X),
      latitude: Number(a.DO_Y),
    };
    address.key =
      address.street + " , " + address.number + " , " + address.city;
    if (!address_dictionary[address.key])
      address_dictionary[address.key] = address;
  });
  return Object.values(address_dictionary);
};
