import * as express from "express";
import * as path from "path";

const port: string | number = process.env.port || 1337;

const app = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.listen(port);

console.info(`App listening on port ${port}.`);

app.use(express.static("public"));

app.get( "/Debug", ( _req, res ) => {
    console.log("I'm debugging on the server.");
    res.sendFile(path.resolve(__dirname, "..", "..", "public", "js", "KatApp.js" ) );
});