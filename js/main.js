function jsAjax(){
  console.log('got here');
    // Step 1: Create the request
    var ajaxRequest = new XMLHttpRequest();
    console.log('ajaxRequest', ajaxRequest);

    //Step 2: Create an event handler to send received data to a callback function
    ajaxRequest.onreadystatechange = function(){
      console.log(ajaxRequest.readyState);
      console.log('response: ', ajaxRequest.response);
        if (ajaxRequest.readyState === 4){
            callback(ajaxRequest.response);
        };
    };

    //Step 3: Open the server connection
    ajaxRequest.open('GET', 'data/MegaCities.geojson', true);

    console.log('line 19');

    //Step 4: Set the response data type
    ajaxRequest.responseType = "json";

    console.log('line 24');

    //Step 5: Send the request
    ajaxRequest.send();
};

//define callback function
function callback(response){
    //tasks using the data go here
    console.log(response);
};

window.onload = jsAjax();
