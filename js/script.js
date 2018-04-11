/* 
 * All rights reserved. Copyright Robert Roy 2017.
 */
//
//TODO Show that we are loading
//TODO Generate map based on url
//IF no URL, generate map based on user's location

var myViewModel = {
    ellipsesText: ko.observable('')
};
ko.applyBindings(myViewModel);

function showLoading(currentEllipses) {
    var defaultEllipses = 3;
    var oldEllipses;
    if(currentEllipses){
        oldEllipses = currentEllipses;
    }else{
        oldEllipses = defaultEllipses;
    }
    var newEllipses = oldEllipses % 3;
    newEllipses++;
    var ellipsesString = "..."
    switch(newEllipses){
        case 1:
            ellipsesString = ".";
            break;
        case 2:
            ellipsesString = "..";
            break;
        case 3:
            ellipsesString = "...";
            break;
        default:
            console.log("Error in showLoading().");
            break;
    }
    var showLoadingWithParameter = function(){
        showLoading(newEllipses);
    };
    myViewModel.ellipsesText(ellipsesString);
    console.log(myViewModel.ellipsesText);
    setTimeout(showLoadingWithParameter, 500);
}

var loadWorker = new Worker(showLoading.call(loadWorker));

loadWorker.onmessage = function (e) {
    console.log(this);
}

//loadWorker.terminate();
