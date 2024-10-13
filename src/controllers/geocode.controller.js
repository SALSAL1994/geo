const logger = require("../services/logging.service");
const config = require("../configurations/config");
const stringUtilities = require("../utilities/string.utility");
const geocodingService = require("../services/geocoding.service");
const externalProvider = require("../services/google.service");
var regex = /^(\d{1,4})(?:[_\/-].*)?/;

function geocoding(req, res, next) {
  let match = null;
  if (req.query.number) match = req.query.number.match(regex);

  if (
    req.query.city &&
    (req.query.city.toLowerCase() === "rome" ||
      req.query.city.toUpperCase() === "ROME")
  ) {
    req.query.city = "roma";
  }
  if (/^v\.?\s/i.test(req.query.street)) {
    var updatedQuery = req.query.street.replace(/^v\.?\s/i, "via ");
  } else if (/^v\.?le\s/i.test(req.query.street)) {
    var updatedQuery = req.query.street.replace(/^v\.?le\s/i, "viale ");
  } else {
    var updatedQuery = req.query.street;
  }

  const _street = stringUtilities.cleanString(updatedQuery);
  const _number = stringUtilities.cleanString(
    match ? match[1] : req.query.number
  );
  const _city = stringUtilities.cleanString(req.query.city);
  const _poi = stringUtilities.cleanString(req.query.poi);
  const id = req.rid + ": ";
  if ((_street && _poi) || (!_street && !_poi)) {
    const error = "Provide either street or POI";
    logger.info(id + error);
    return res.status(404).send(error);
  }

  if (config.FORCE_CITY && !_city) {
    const error = "City must be provided!";
    logger.info(id + error);
    return res.status(400).send(error);
  }
  if (_poi && _number) {
    const error = "POI search does not accept number";
    logger.info(id + error);
    return res.status(400).send(error);
  }
  logger.info(
    id +
      "start processing request, data " +
      JSON.stringify({
        street: _street,
        city: _city,
        number: _number,
        poi: _poi,
      })
  );
  geocodingService
    .geocodeRequest(id, _street, _city, _number, _poi)
    .then((result) => {
      if (
        (!result.redirect && result.status == 200) ||
        (result.status == 400 && result.data.element)
      ) {
        const response = JSON.parse(result.response);
        const dataArray = Array.isArray(response) ? response : [response];
        for (const data of dataArray) {
          if (!data.cap) {
            const coords = [data.longitude, data.latitude];
            const cap = geocodingService.getBestCap(coords);
            if (cap) {
              data.cap = `${cap}`;
              geocodingService
                .addAddress(data)
                .then(() => {
                  logger.info(id + "saved updated cap to db");
                })
                .catch((error) => {
                  logger.error(
                    id + "could not save updated cap to db, error: " + error
                  );
                });
            } else {
              logger.info(id + "CAP not found");
            }
          }
        }
        return res
          .status(result.status)
          .send(Array.isArray(response) ? dataArray : dataArray[0]);
      } else {
        logger.info(id + "no match in the database, call external provider");
        externalProvider
          .getResponseGeocode(result.data)
          .then((result) => {
            if (!result || (!result.street && result.poi)) {
              const error = `Address not found, please provide the correct ${
                _poi ? "POI" : "street"
              }`;
              logger.info(id + error);
              return res.status(404).send(error);
            }
            geocodingService
              .addAddress(result)
              .then(() => {
                logger.info(id + "saved to db");
              })
              .catch((error) => {
                logger.error(
                  id + "could not save address to db, error: " + error
                );
              });
            return res.status(200).send(JSON.stringify(result).toLowerCase());
          })
          .catch((err) => {
            const error =
              "could not get response from external provider, reason: " +
              (err.status
                ? err.status +
                  (err.error_message ? ", " + err.error_message : "")
                : err);
            logger.error(id + error);
            return res.status(500).send(error);
          });
      }
    })
    .catch((err) => {
      logger.error(id + err.message + ", " + err.stack);
      return res
        .status(500)
        .send("Internal server error, could not process this request");
    });
}

module.exports = {
  geocoding: geocoding,
};
