const admin = require("firebase-admin");
const config = require("../configurations/config");
const  {Storage}  = require("@google-cloud/storage");
const storage = new Storage();

if(!config.IS_LOCAL) admin.initializeApp({
  credential: admin.credential.cert(config.SERVICE_ACCOUNT),
  storageBucket: config.STORAGE_BUCKET,
});
const bucket = config.IS_LOCAL ? storage.bucket('geocoding-citymaas.appspot.com'): admin.storage().bucket('geocoding-citymaas.appspot.com');
 
module.exports = { bucket };
