import * as express from "express";
import * as path from "path";

const port: string | number = process.env.port || 8887;

const app = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.listen(port);

console.info(`App listening on port ${port}.`);

app.use(express.static("public"));

/* Trouble debugging sourceMap, I tried to do this, but only way it seemed I could put
   breakpoints into KatAppProvider.js was to modify the sourceMappingURL declaration in the
   generated file to sourceMappingURL=js/KatAppProvider.js.map.  If it didn't have the js/
   folder, Chrome said it couldn't find the file.

app.get( "/KatAppProvider.js.map", ( _req, res ) => {
  const mapFile = path.resolve(__dirname, "..", "..", "public", "js", "KatAppProvider.js.map" );
  console.log("Serving: " + mapFile);
  res.sendFile(mapFile );
});
*/

app.get( "/Debug", ( _req, res ) => {
    console.log("I'm debugging on the server.");
    res.sendFile(path.resolve(__dirname, "..", "..", "public", "js", "KatApp.js" ) );
});