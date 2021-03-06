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
    minMatchCharLength: 1,
    keys: ['name']
};

function search(list, item) {
    let fuse = new Fuse(list, searchOptions);
    let results = fuse.search(item);
    let topResults = results.filter((r) => r.score < 0.2);

    if (topResults[0]) return topResults[0].item; 
    return null;
}

function tokenize(address) {
    var splits = address.toLowerCase().split(/\W+|\d+/);
    return splits.filter(w => w.length > 1);
}

function localitySearch(localities, locality) {
    let mainLocality = search(localities, locality);
    if (mainLocality) {
        return mainLocality.latLng;
    }

    return null;
}

function addressLatLng(address) {
    let commonWordsInAddess = /block|along|street|beside|behind|cresent|close|road|estate/;
    let cleanAddress = address.toLowerCase().replace(commonWordsInAddess, "");
    let addressTokens = tokenize(cleanAddress);
    let addessParts = addressTokens.slice(0, addressTokens.length - 1);
    let mainArea = addessParts[addessParts.length - 1];
    let existingArea = search(areas, mainArea);

    if (existingArea && addessParts.length >= 2) {
        let locality = addessParts[addessParts.length - 2];
        let extistingLocality = areaLocalities[existingArea.name];

        if (extistingLocality && extistingLocality.localities) {
            let localities = extistingLocality.localities
            let mainLocality = localitySearch(localities, locality);

            if (mainLocality) {
                return Promise.resolve(mainLocality);
            } else  {
                return geocoder(`${locality}, ${existingArea.name}, Lagos, Nigeria`)
                    .then(([ { address_components, geometry: {location: {lat, lng}} } ]) => {
                        areaLocalities[existingArea.name].localities.push({ name: locality, latLng: { lat, lng } })
                        return { lat, lng };
                    }).catch(function (err) {
                        throw err;
                    });
            }
        }

        return geocoder(`${locality}, ${existingArea.name}, Lagos, Nigeria`)
            .then(([ { address_components, geometry: {location: {lat, lng}} } ]) => {
                areaLocalities[existingArea.name] = { latLng: {}, localities: [] };
                areaLocalities[existingArea.name].latLng = { lat, lng };
                areaLocalities[existingArea.name].localities.push({ name: locality, latLng: { lat, lng } })
                return { lat, lng };
            }).catch(function (err) {
                throw err;
            });
    } else if (existingArea && addessParts.length <= 1) {
        return Promise.resolve(existingArea.latLng);
    } else {
        let unknownArea = search(unkownAreas, mainArea);

        if (unknownArea && addessParts >= 2) {
            let locality = addessParts[addessParts.length - 2];
            let extistingLocality = areaLocalities[unknownArea.name];

            if (extistingLocality && extistingLocality.localities) {
                let mainLocality = localitySearch(extistingLocality.localities, locality);

                if (mainLocality) {
                    return Promise.resolve(mainLocality.latLng);
                } else  {
                    return geocoder(`${locality}, ${unknownArea.name}, Lagos, Nigeria`)
                    .then(([ { address_components, geometry: {location: {lat, lng}} } ]) => {
                        areaLocalities[unknownArea.name].localities.push({ name: locality, latLng: { lat, lng } })
                        return { lat, lng };
                    }).catch(function (err) {
                        throw err;
                    });
                }
            }

            return geocoder(`${locality}, ${unknownArea.name}, Lagos, Nigeria`)
                .then(([ { address_components, geometry: {location: {lat, lng}} } ]) => {
                    areaLocalities[unknownArea.name] = { localities: [] };
                    areaLocalities[unknownArea.name].localities.push({ name: locality, latLng: { lat, lng } })
                    return { lat, lng };
                }).catch(function (err) {
                    throw err;
                });
        } else {
            return geocoder(`${mainArea}, Lagos, Nigeria`).then(([ { address_components, geometry: {location: {lat, lng}} } ]) => {
                unkownAreas[mainArea] = {
                    name: mainArea,
                    latLng: {
                        lat,
                        lng
                    }
                }

                areaLocalities[mainArea] = {
                    name: mainArea,
                    localities: []
                }
                
                return { lat, lng };
            }).catch(function (err) {
                throw err;
            });
        }
    }
}

module.exports = {
    areaLocalities,
    unkownAreas,
    Generator: function* (addresses) {
        for (let i=0; i<addresses.length; i++) {
            yield addressLatLng(addresses[i]);
        }
    }
}
