const config = require("../configurations/config");
const bucket = require("../services/firebase.service");
const logger = require("../services/logging.service");
const fs = require("fs");
const Papa = require("papaparse");

async function readJSONFileFromStorage(filePath, bytesToRead) {
  try {
    // Create a readable stream to read a portion of the file
    const fileStream = bucket.bucket.file(filePath).createReadStream({
      start: 0,
      end: bytesToRead - 1,
    });
    let buffer = Buffer.from("");

    fileStream.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
    });

    await new Promise((resolve, reject) => {
      fileStream.on("end", resolve);
      fileStream.on("error", reject);
    });

    const fileContent = buffer.toString("utf8");
    const jsonData = JSON.parse(fileContent);

    return jsonData;
  } catch (err) {
    logger.error("Error reading JSON file from storage:", err);
    throw err;
  }
}

async function readCsvFileFormStorage(filePath, bytesToRead) {
  try {
    const fileStream = bucket.bucket.file(filePath).createReadStream({
      start: 0,
      end: bytesToRead - 1,
    });
    let buffer = Buffer.from("");

    fileStream.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
    });

    await new Promise((resolve, reject) => {
      fileStream.on("end", resolve);
      fileStream.on("error", reject);
    });

    const csvString = buffer.toString("utf8");
    const pjson = Papa.parse(csvString, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
    });
    json_array = pjson.data;
    console.log(json_array[json_array.length-1])

    return json_array;
  } catch (err) {
    logger.error("Error reading JSON file from storage:", err);
    throw err;
  }
}

async function importRomeCap(shapes_rome) {
  let dataParsed = null;

  if (!config.IS_LOCAL) {
    try {
      const jsonData = await readJSONFileFromStorage(config.STORAGE_CAP_SHAPE);
      return jsonData;
    } catch (err) {
      logger.error("Error reading or downloading the file:", err);
    }
  } else {
    const data = fs.readFileSync(shapes_rome, "utf8");
    try {
      dataParsed = JSON.parse(data);
    } catch (err) {
      logger.error("Error parsing the GeoJSON data:", err);
    }

    return dataParsed;
  }
}

async function importZoneWithoutRomeCap(shapes_not_rome) {
   let dataParsed = null;

   if (!config.IS_LOCAL) {
     try {
  
       const jsonData = await readJSONFileFromStorage(config.STORAGE_NOT_ROME_CAP_SHAPE);

       // Use jsonData as needed

       // If necessary, you can download the full file
       const options = {
         destination: shapes_not_rome,
       };
       await bucket.bucket.file(config.STORAGE_NOT_ROME_CAP_SHAPE).download(options);
       logger.info(`Downloaded to ${shapes_not_rome}`);
     } catch (err) {
       logger.error("Error reading or downloading the file:", err);
     }
   }
  

   const data = fs.readFileSync(shapes_not_rome, "utf8");
   try {
     dataParsed = JSON.parse(data);
   } catch (err) {
     logger.error("Error parsing the GeoJSON data:", err);
   }

   return dataParsed;
}

async function ImportAddressesList(address_file_path) {
  let dataParsed = null;
  if (config.IS_LOCAL === false) {
    try {
      const jsonData = await readCsvFileFormStorage(config.STORAGE_FILE_NAME);

      return jsonData;
    } catch (err) {
      logger.error("Error reading or downloading the file:", err);
    }
  } else {
    try {
      const options = {
        destination: address_file_path,
      };
      await bucket.bucket.file(config.STORAGE_FILE_NAME).download(options);
      logger.info(`Downloaded to ${address_file_path}`);
    } catch (err) {
      logger.error("Error reading or downloading the file:", err);
    }

    const data = fs.readFileSync(address_file_path, "utf8");
    try {
      dataParsed = JSON.parse(data);
    } catch (err) {
      logger.error("Error parsing the GeoJSON data:", err);
    }
    return dataParsed;
  }
}

module.exports = {
  importRomeCap: importRomeCap,
  importZoneWithoutRomeCap: importZoneWithoutRomeCap,
  ImportAddressesList: ImportAddressesList,
};
