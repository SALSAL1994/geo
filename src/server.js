const Express = require("express");
const config = require("./configurations/config");
const geocodeDb = require("./db/geocoding.db");
const cors = require("cors"); // Import the cors middleware
function normalizePort(val) {
  let port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

geocodeDb.initialize(config.INPUT_TYPE).then(() => {
 //the main object of the server
 const ruid = require("express-ruid");
 const logger = require("./services/logging.service");
 const geocodeController = require("./controllers/geocode.controller");
 const reverseGeocodeController = require("./controllers/reverseGeocode.controller");
 
 const app = Express();
 app.use(ruid());
 app.use(cors({
  origin: "*", 
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization,CorsPolicy",
}));
 app.get("/reverse", reverseGeocodeController.reverseGeocoding);
 app.get("/geocode", geocodeController.geocoding);
 
 // Listen to the App Engine-specified port, or 8080 otherwise
 const port = normalizePort(config.PORT || "5000");
 app.listen(port, config.IP_ADDRESS,() => {
   logger.info(`Server listening on port ${port}...`);
 }); 
});

