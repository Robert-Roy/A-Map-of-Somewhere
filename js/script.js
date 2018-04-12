/* 
 * All rights reserved. Copyright Robert Roy 2017.
 */
//
//TODO Show that we are loading
//TODO Generate map based on url
//IF no URL, generate map based on user's location

var viewmodelLoading = {
    ellipsesText: ko.observable('...')
};
ko.applyBindings(viewmodelLoading);

function showLoading(observableEllipses) {
    // Accepts a KO observable input and increments it every half-second from "."
    // to ".." to "..."
    switch(observableEllipses()){
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
    var showLoadingWithParameter = function(){
        showLoading(observableEllipses);
    };
    setTimeout(showLoadingWithParameter, 500);
}

var loadWorker = new Worker(showLoading(viewmodelLoading.ellipsesText));




//loadWorker.terminate();
