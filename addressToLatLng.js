const Fuse = require('fuse.js');
const geocoder = require('./geocode');

const areas = require('./areas');
const areaLocalities = {};
const unkownAreas = {};

let searchOptions = {
    shouldSort: true,
    threshold: 0.2,
    includeScore: true,
    maxPatternLength: 32,
    minMatchCharLength: 1
};

function search(list, item) {
    let fuse = new Fuse(list, searchOptions);
    let results = fuse.search(item);
    let topResults = results.filter((r)=> r < 0.2);
    return topResults[0] || null;
}

function tokenize(address) {
    var splits = address.toLowerCase().split(/\W+|\d+/);
    return splits.filter(w => w.length > 1);
}

function localitySearch(localities) {
    let mainLocality = search(localities, locality);
    if (mainLocality) {
        return mainLocality.latLng;
    }

    return null;
}

function addressLatLng(address) {
    let addressTokens = tokenize(address);
    let addessParts = addressTokens.slice(0, addressTokens.length - 1);
    let mainArea = addessParts[addessParts.length - 1];
    let existingArea = search(areas, mainArea);

    if (existingArea && addessParts >= 2) {
        let locality = addessParts[addessParts.length - 2];
        let mainLocality = localitySearch(areaLocalities[existingArea.name].localities, locality);
        if (mainLocality) {
            return mainLocality.latLng;
        } else  {
            geocoder(address).then((results) => {

            });
        }
    } else if (existingArea && addessParts <= 1) {
        return existingArea.latLng;
    } else {
        let unknownArea = search(unkownAreas, mainArea);

        if (unknownArea && addessParts >= 2) {
            let locality = addessParts[addessParts.length - 2];
            let mainLocality = localitySearch(areaLocalities[unknownArea.name].localities, locality);
        } else {
            geocoder(address).then((results) => {

            });
        }
    }
}

module.exports = function* (addresses) {
    for (let i=0; i<addresses.length; i++) {
        yield addressLatLng(addresses[i]);
    }
}
