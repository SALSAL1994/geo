const logger = require("../services/logging.service");
const externalProvider = require("../services/google.service");
const geocodingService = require("../services/geocoding.service");

const min_ray_m = 100;

async function reverseGeocoding(req, res, next) {
  const _longitude = Number(req.query.longitude);
  const _latitude = Number(req.query.latitude);
  const _ray = req.query.ray ? Number(req.query.ray) : min_ray_m;

  const id = req.rid + ": ";
  if (!_longitude || !_latitude) {
    const error = "longitude and latitude must be provided!";
    logger.debug(id + error);
    return res.status(400).send(error);
  }

  logger.debug(
    id +
      "start processing request, data " +
      JSON.stringify({
        longitude: _longitude,
        _latitude: _latitude,
        _ray: _ray,
      })
  );

  geocodingService
    .reverseGeocodeRequest(id, _longitude, _latitude, _ray)
    .then((result) => {
      if (!result.redirect && result.status == 200) {
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
                  logger.info(id + "saved to db");
                })
                .catch((error) => {
                  logger.error(
                    id + "could not save address to db, error: " + error
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
        logger.debug(id + "no match in the database, call external provider");
        externalProvider
          .getResponseReverseGeocode(result.data)
          .then((result) => {
            if (!result) {
              const error = "coordinates not found";
              logger.debug(id + error);
              return res.status(404).send(error);
            }

            geocodingService.addAddress(result);
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
            return res.status(404).send(error);
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
  reverseGeocoding: reverseGeocoding,
};
