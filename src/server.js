require('dotenv').config();

const express = require("express");
const path = require("path");
const morgan = require("morgan");
const scrapper = require("./scrapper");

const app = express();
app.use(morgan());

app.use('/data', express.static(path.join(__dirname, 'data')));

app.get('/crawl', (req, res) => {
    scrapper();
    res.send(null);
});

app.listen(process.env.PORT);

console.log(`Running on ${process.env.PORT || '8080'}`);