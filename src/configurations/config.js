require('dotenv').config();

let config = {};
config.PORT = +process.env.PORT || 5000;
config.IP_ADDRESS = process.env.IP_ADDRESS || "0.0.0.0";
// process.env.DB_CONNECTION_STRING ||
config.DB_CONNECTION_STRING =  "../../reference/indirizzi.csv";
config.SHAPE_ROME = process.env.SHAPE_ROME || "../db/shapes_rome.json";
config.SHAPE_NOT_ROME = process.env.SHAPE_NOT_ROME || "../db/shapes_not_rome.json";
config.CAP_SHAPE_FILE = process.env.CAP_SHAPE_FILE || "shapes_rome.json";
config.INPUT_TYPE = process.env.INPUT_TYPE || "default";
config.GOOGLE_KEY = process.env.GOOGLE_KEY;
config.GOOGLE_LANG = process.env.GOOGLE_LANG || "it";
config.FORCE_CITY = process.env.FORCE_CITY ? process.env.FORCE_CITY  === "true" : true;
config.LOGGER_NAME = process.env.LOGGER_NAME || "gocoding-service";
config.LOG_DAY_RETENTION = process.env.LOG_DAY_RETENTION || "14d";
config.LOG_DATE_PATTERN = process.env.LOG_DATE_PATTERN || "YYYY-MM-DD";
config.IS_LOCAL=process.env.IS_LOCAL ? process.env.IS_LOCAL  === "true" : true;
config.USE_FILE=config.IS_LOCAL;
config.USE_CLOUD= !config.IS_LOCAL;
config.STORAGE_FILE_NAME= process.env.STORAGE_FILE_NAME;
config.STORAGE_CAP_SHAPE=process.env.STORAGE_CAP_SHAPE;
config.STORAGE_NOT_ROME_CAP_SHAPE=process.env.STORAGE_NOT_ROME_CAP_SHAPE;
config.STORAGE_BUCKET = process.env.STORAGE_BUCKET;
config.SERVICE_ACCOUNT={
    type: process.env.TYPE,
    project_id:process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: "",
    client_email:process.env.CLIENT_EMAIL,
    client_id:process.env.CLIENT_ID,
    auth_uri:process.env.AUTH_URI,
    token_uri:process.env.TOKEN_URI,
    auth_provider_x509_cert_url:process.env.AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url:process.env.CLIENT_X509_CERT_URL,
    universe_domain:process.env.UNIVERSE_DOMAIN
};
config.SERVICE_ACCOUNT =  PRIVATE_KEY;

module.exports = config;


