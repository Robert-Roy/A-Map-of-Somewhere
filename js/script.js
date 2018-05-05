/* 
 * All rights reserved. Copyright Robert Roy 2017.
 */


//////////////////
//////////////////
// LOADING SECTION
//////////////////
//////////////////

// A knockout script to update ellipses from "." to ".." to "...", then back to "."
// repeatedly so the user knows the page hasn't frozen.

var viewmodelLoading = {
    ellipsesText: ko.observable('...'),
    active: false
};
viewmodelLoading.startLoading = function () {
    // Binds ellipsesText observable to document and begins loading display
    this.active = true;
    ko.applyBindings(viewmodelLoading);
    this.incrementEllipses(this.ellipsesText);
};
viewmodelLoading.stopLoading = function () {
    // stops incrementing of ellipses by stopping the recursion loop
    this.active = false;
}
viewmodelLoading.incrementEllipses = function (observableEllipses) {
    // Accepts a KO observable input and increments it every half-second from "."
    // to ".." to "..."

    // this will stop recursion if loading is no longer active.
    if (!this.active) {
        return;
    }
    that = this;
    switch (observableEllipses()) {
        case "...":
            observableEllipses(".");
            break;
        case ".":
            observableEllipses("..");
            break;
        case "..":
            observableEllipses("...");
            break;
        default:
            console.log("Error in showLoading().");
            break;
    }
    //recurse
    var incrementEllipsesWithParameter = function () {
        that.incrementEllipses(observableEllipses);
    };
    setTimeout(incrementEllipsesWithParameter, 500);
};

//////////////////
//////////////////
// MAP SECTION
//////////////////
//////////////////
//This currently functions quite well, but I would like to add the below improvements:
//TODO Generate map based on url
//IF no URL, generate map based on user's location

var viewmodelMap = {
    map: null, //google map object
    mapsAPIActive: false,
    pendingGeolocation: false,
    geolocationError: false,
    successFunction: function () {}, // function called when a map is drawn
    failureFunction: function () {}, // function called when an error or timeout occurs that prevents map drawing
    timeoutAfterMS: 10000, // how long to wait for geolcation in milliseconds
    startTime: null // needed to record timeout on geolocation. Is given a value later.
}
viewmodelMap.create = function () {
    // If asked to create itself without latitude and longitude set, it will attempt to use
    // geolocation to do so. If latitude and longitude are set, it will use those
    // 
    // so I can recurse with a timeout while keeping "this" intact.
    if (this.startTime === null) {
        console.log("setting new startTime");
        this.startTime = new Date().getTime();
    }
    var that = this;
    var recurse = function () {
        that.create();
    }

    // verify that google maps api is active
    if (!this.mapsAPIActive) {
        //wait for google maps API to be active before proceeding
        console.log("Maps not active... Waiting.");
        setTimeout(recurse, 100);
        return;
    }

    // check if a valid latitude and longitude have been established
    if (validLatLng(this.latitude, this.longitude)) {
        // Draw the map
        console.log("trying to draw map");
        this.pendingGeolocation = false;
        this.drawMap();
        this.successFunction();
        return;
    }
    // Check if we are currently waiting on geolocation
    if (!this.pendingGeolocation) {
        // if not, start getting location
        console.log("trying to get location");
        // Note that we are now waiting for geolocation
        this.pendingGeolocation = true;
        // Start trying to get user location
        this.getUserLocation();
        // Recurse to wait for geolocation or time-out
        setTimeout(recurse, 100);
        return;
    }
    if (this.geolocationError) {
        // if for some reason an error was encountered, stop looping.
        return;
    }
    // Check if we have waited too long (timeoutAfterMS milliseconds). Throw error if we have.
    console.log("Waiting for user location. " + (this.startTime + this.timeoutAfterMS - new Date().getTime()) + "ms remaining");
    if (this.startTime + this.timeoutAfterMS < new Date().getTime()) {
        console.log("It took too long to get the user's location.");
        this.errorGettingUserLocation();
        return;
    }
    // wait 1/10th of a second and check again
    setTimeout(recurse, 100);
    return;
}
viewmodelMap.getUserLocation = function () {
    var that = this;
    // function to call if getcurrent position is successful
    var callSetLocation = function (position) {
        var latitude = position.coords.latitude;
        var longitude = position.coords.longitude;
        that.setLocation(latitude, longitude);
    }
    // function to call if getcurrent position is not successful
    var callError = function () {
        that.errorGettingUserLocation();
    }
    // if navigator supports geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(callSetLocation, callError);
    } else {
        //browser doesn't support geolocation
        viewmodelMap.errorGettingUserLocation();
    }

}
viewmodelMap.errorGettingUserLocation = function () {
    console.log("Unable to geolocate user.");
    this.geolocationError = true;
    this.failureFunction();
}
viewmodelMap.setLocation = function (latitude, longitude) {
    this.latitude = latitude;
    this.longitude = longitude;
}
viewmodelMap.drawMap = function () {
    // google maps api drawing script
    this.map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: this.latitude,
            lng: this.longitude
        },
        zoom: 13,
        mapTypeControl: false
    });

}

//////////////////
//////////////////
// PLACES SECTION
//////////////////
//////////////////
//TODO: Yelp star polling


var modelPlace = [];
var viewmodelPlacesList = [];

function activateMaps() {
    //callback from google maps activation
    viewmodelMap.mapsAPIActive = true;
}
function validLatLng(latitude, longitude) {
    // verify that lat long are numbers
    if (typeof latitude === "number" && typeof longitude === "number") {
        // verify that numbers are within the bounds of latitude and longitude
        if (latitude >= -90 && latitude <= 90 && longitude <= 180 && longitude >= -180) {
            //is valid
            return true;
        }
    }
    return false;
}
function searchMap() {
    // center of the map
    var mapLocation = new google.maps.LatLng(viewmodelMap.latitude, viewmodelMap.longitude);
    var searchQuery = {
        location: mapLocation,
        radius: 6000, //meters, max 50,000
        type: ['restaurant']
    }
    // search for nearby places, call handlePlacesSearch with results
    service = new google.maps.places.PlacesService(viewmodelMap.map);
    service.nearbySearch(searchQuery, handlePlacesSearch);
}
function handlePlacesSearch(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        for (var i = 0; i < results.length; i++) {
            modelPlace.push(results[i]);
            modelPlace[i].marker = createMarker(modelPlace[i]);
            addInfoWindow(modelPlace[i]);
        }
        sortPlaces();
        getFoursquareCategories();
        updatePlacesList();
        for (var i = 0; i < modelPlace.length; i++) {
            addWindowOpeningClickListenerToElement(modelPlace[i].infoWindow, modelPlace[i].marker, viewmodelPlacesList[i]);
            addWindowOpeningClickListenerToMarker(modelPlace[i].infoWindow, modelPlace[i].marker);
        }

    } else {
        // TODO: Something went wrong with the search, handle it.
    }
}
function getFoursquareCategories() {
    for (i = 0; i < modelPlace.length; i++) {
        var thisPlace = modelPlace[i];
        console.log(thisPlace.name);
        console.log(functionWithParameters);
        var functionWithParameters = function () {
            console.log(thisPlace.name);
            //getFoursquareCategoriesForPlace(thisPlace);
        };
        // only two requests per second allowed. This solves the issue by slowly gathering data.
        setTimeout(functionWithParameters, 10);
        functionWithParameters = null;
        //i = 80;
    }
}
function getFoursquareCategoriesForPlace(place) {
    var formattedName = place.name.split(" ").join("_");
    var queryString = "https://api.foursquare.com/v2/venues/search?" +
            "ll=" + place.geometry.location.lat() + "," + place.geometry.location.lng() +
            "&v=20161016" +
            "&intent=match" +
            "&name=" + formattedName +
            "&categoryId = 4d4b7105d754a06374d81259" +
            "&radius = 25" +
            "&client_id=0SMJ3QFXL5JXI2IXI00LFUZR5D0PFMG1VZ1UTCOO1EQOBNKJ" +
            "&client_secret=VMAB4B2CVE12CQIKZWEFQYYTDCMTCIULHQEI0RGEZMHS2X4P";
    var request = $.ajax({
        method: "GET",
        dataType: "json",
        url: queryString
    });
    request.done(function (response) {
        handleFoursquareResponse(response, place);
    });
}
function getCategoryFromResponse(response) {
    var categories = response.response.venues[0].categories;
    var category = "unknown";
    for (var i = 0; i < categories.length; i++) {
        if (categories[i].primary) {
            category = categories[i].name;
        }
    }
    return category;
}
function appendFoursquareCategory(category, place) {
    var divCategory = "<div class='category'>" +
            category + "<br>" +
            "<img src='images/foursquare.png' alt='Foursquare logo'/>" +
            "</div>"
    var newContent = place.infoWindow.content + divCategory;
    place.infoWindow.setContent(newContent);
}
function handleFoursquareResponse(response, place) {
    if (!response) {
        // response is undefined, stop trying
        return false;
    } else if (response.meta.code !== 200) {
        // response code is not a success
        return false;
    }
    var category = getCategoryFromResponse(response);
    appendFoursquareCategory(category, place)
}
function createMarker(place) {
    // adds a marker to a map with a place object from google maps api
    var marker = new google.maps.Marker({
        map: viewmodelMap.map,
        position: place.geometry.location,
        animation: google.maps.Animation.DROP
    });
    return marker;
}
function addInfoWindow(place) {
    //infowindow = panel visible in google maps over a location
    var infowindow = new google.maps.InfoWindow();
    var infowindowContent = "";
    // add location name
    infowindowContent = infowindowContent + '<h5>' + place.name + "</h5>";
    // add whether location is open or closed
    if (place.opening_hours) { //sometimes opening hours are undefined.
        if (place.opening_hours.open_now) {
            infowindowContent = infowindowContent + "<p>Open Now</p>";
        } else {
            infowindowContent = infowindowContent + "<p>Currently Closed</p>";
        }
    }
    // add address
    infowindowContent = infowindowContent + "<p>" + place.vicinity + "</p>";
    // confirm text in infowindow
    infowindow.setContent(infowindowContent);
    // save infowindow for easy access
    place.infoWindow = infowindow;
}

//TODO: improve comments below this point




function addWindowOpeningClickListenerToElement(infoWindow, marker, clickableObject) {
    var onEventFunction = function (event) {
        infoWindow.open(viewmodelMap.map, marker);
        event.preventDefault();
    }
    clickableObject.addEventListener('click', onEventFunction, false);
    clickableObject.addEventListener('touchstart', onEventFunction, false);
}
function addWindowOpeningClickListenerToMarker(infoWindow, marker) {
    var onEventFunction = function (event) {
        infoWindow.open(viewmodelMap.map, marker);
        event.preventDefault();
    }
    google.maps.event.addListener(marker, 'click', onEventFunction);
}

function sortPlaces() {
    modelPlace.sort(function (a, b) {
        return a.name.localeCompare(b.name);
    });
}
function updatePlacesList() {
    // find locationlist div in DOM, then add all places (modelPlace[i]) to
    // the list as divs. Save div element identities to viewmodelPlacesList[i].
    var locationList = document.getElementById("location-list");
    for (var i = 0; i < modelPlace.length; i++) {
        var newLocationListItem = document.createElement("div");
        newLocationListItem.innerHTML = modelPlace[i].name;
        viewmodelPlacesList.push(newLocationListItem);
        locationList.appendChild(newLocationListItem);
        var hrElement = document.createElement("hr");
        hrElement.className = "no-margin";
        locationList.appendChild(hrElement);
    }
}

//////////////////
//////////////////
// Active Section
//////////////////
//////////////////


function handleMapFailure() {
    viewmodelLoading.stopLoading();
    divLoadingText = document.getElementById("loading-text");
    divLoadingText.innerHTML = "<h1>An error occurred while attempting to geolocate you.<br>Please <a href=index.html>try again</a>.</h1>";
}
function handleMapSuccess() {
    // remove loading text and set map to forefront
    viewmodelLoading.stopLoading();
    divLoadingText = document.getElementById("loading-text");
    divLoadingText.outerHTML = "";
    divMap = document.getElementById("map-column");
    divMap.classList.remove("no-display");
    divLeftColumn = document.getElementById("hidden-column-left");
    divLeftColumn.classList.remove("no-display");
    // draw locations on map
    setTimeout(searchMap, 2000);
}

viewmodelLoading.startLoading();
viewmodelMap.successFunction = handleMapSuccess;
viewmodelMap.failureFunction = handleMapFailure;
viewmodelMap.create();



$(".hidden-column-left-hamburger").on('click touch', function () {
    $(this).parent().toggleClass("inactive");
});