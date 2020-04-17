import * as express from "express";
import * as path from "path";

const port: string | number = process.env.port || 1337;

const app = express();

app.listen(port);
console.info(`App listening on port ${port}.`);

app.use(express.static("public"));

app.get( "/Debug", ( _req, res ) => {
    console.log("I'm debugging on the server.");
    res.sendFile(path.resolve(__dirname, "..", "..", "public", "js", "KatApp.js" ) );
});