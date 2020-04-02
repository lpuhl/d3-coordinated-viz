//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var attrArray;
var expressed;

window.onload = setMap();

function setMap() {

  //map frame dimensions
  var width = window.innerWidth * 0.5,
      height = 460;

  //create new svg container for the map
  var map = d3.select("body")
      .append("svg")
      .attr("class", "map")
      .attr("width", width)
      .attr("height", height);

    // const files = ["data/Mpls_Precincts_final.topojson", "data/Mpls_Results_Processed.csv", "data/Mpls_Bdry.topojson"]
    //
    // const promises = [];

  // files.forEach(function(url, index) {
  //   // console.log('url', url);
  //   // console.log('index', index);
  //     promises.push(index ? d3.csv(url) : d3.json(url))
  // });

  Promise.all([d3.csv("data/Mpls_Results_Processed_D.csv"),
              d3.json("data/Mpls_Precincts_final.topojson"),
              d3.json("data/Mpls_Bdry.topojson"),
              d3.json("data/Metro_Munis.topojson")])
      .then(function(data) {
        // console.log('data', data);

      var csvData = data[0];
      var mplsPrecincts = topojson.feature(data[1], data[1].objects.Mpls_Precincts_final).features;
      var mplsBdry = topojson.feature(data[2], data[2].objects.Mpls_Bdry);
      var allMunis = topojson.feature(data[3], data[3].objects.Metro_Munis);

      // use Object.keys to get an array of the attribute values from the CSV
      attrArray = Object.keys(csvData[0]);

      // Remove "Precinct" from attrArray using shift()
      attrArray.shift();

      expressed = attrArray[0];

      mplsPrecincts = joinData(mplsPrecincts, csvData);

      console.log(attrArray);
      console.log('Metro_Munis', allMunis);
      console.log('mplsPrecincts', mplsPrecincts);

      // https://github.com/veltman/d3-stateplane
      var projection = d3.geoConicConformal()
        .parallels([45 + 37 / 60, 47 + 3 / 60])
        .rotate([94 + 15 / 60, 0])
        .fitSize([width, height], mplsBdry);

      var path = d3.geoPath()
        .projection(projection);

      //add neighboring cities to map
      var munis = map.append("path")
          .datum(allMunis)
          .attr("class", "munis")
          .attr("d", path);

      var colorScale = makeColorScale(csvData);

      setEnumerationUnits(mplsPrecincts, map, path, colorScale);
      //add coordinated visualization to the map
      setChart(csvData, colorScale);

  }); // end of Promise.all().then()
} //end of setMap()

function joinData (mplsPrecincts, csvData) {
    for (var i=0; i < csvData.length; i++) {
    var csvPrecinct = csvData[i]; //the current precinct
    var csvKey = csvPrecinct.Precinct; //the CSV primary key
    //loop through geojson precincts to find correct precinct
    for (var j=0; j < mplsPrecincts.length; j++) {
      var geojsonProps = mplsPrecincts[j].properties; //the current precinct geojson properties
      var geojsonKey = geojsonProps.PCTCODE; //the geojson primary key
      //where primary keys match, transfer csv data to geojson properties object
      if (geojsonKey == csvKey) {
        //assign all attributes and values
        attrArray.forEach(function(attr){
          var val = parseFloat(csvPrecinct[attr]); //get csv attribute value
          geojsonProps[attr] = val; //assign attribute and value to geojson properties
        });
      }
    }
  }
  return mplsPrecincts;
}

function setEnumerationUnits(mplsPrecincts, map, path, colorScale){
  //add Minneapolis precincts to map
  var precincts = map.selectAll(".precincts")
      .data(mplsPrecincts)
      .enter()
      .append("path")
      .attr("class", function(d){
          return "precincts " + d.properties.PCTCODE;
      })
      .attr("d", path)
      .style("fill", function(d){
        // console.log(choropleth(d.properties, colorScale));
        return choropleth(d.properties, colorScale);
      });
};

//Example 1.4 line 11...function to create color scale generator
function makeColorScale(data){
  var colorClasses = [
      "#D4B9DA",
      "#C994C7",
      "#DF65B0",
      "#DD1C77",
      "#980043"
  ];

  //create color scale generator
  var colorScale = d3.scaleThreshold()
      .range(colorClasses);

  //build array of all values of the expressed attribute
  var domainArray = [];
  for (var i=0; i < data.length; i++){
      var val = parseFloat(data[i][expressed]);
      domainArray.push(val);
  };

  //cluster data using ckmeans clustering algorithm to create natural breaks
  var clusters = ss.ckmeans(domainArray, 5);
  console.log('clusters', clusters);
  //reset domain array to cluster minimums
  domainArray = clusters.map(function(d){
      return d3.min(d);
  });
  //remove first value from domain array to create class breakpoints
  domainArray.shift();

  //assign array of last 4 cluster minimums as domain
  colorScale.domain(domainArray);

  return colorScale;
};

//function to test for data value and return color
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    console.log('val', val);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)){
        // console.log('GOT HERE');
        return colorScale(val);
    } else {
        return "#CCC";
    };
};

//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);


    //create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 100]);

    //set bars for each precinct
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bars " + d.Precinct;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        .attr("height", function(d){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //Example 2.5 line 23...end of bars block
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });

    // //annotate bars with attribute value text
    // var numbers = chart.selectAll(".numbers")
    //     .data(csvData)
    //     .enter()
    //     .append("text")
    //     .sort(function(a, b){
    //         return a[expressed]-b[expressed]
    //     })
    //     .attr("class", function(d){
    //         return "numbers " + d.Precinct;
    //     })
    //     .attr("text-anchor", "middle")
    //     .attr("x", function(d, i){
    //         var fraction = chartWidth / csvData.length;
    //         return i * fraction + (fraction - 1) / 2;
    //     })
    //     .attr("y", function(d){
    //         return chartHeight - yScale(parseFloat(d[expressed])) + 15;
    //     })
    //     .text(function(d){
    //         return d[expressed];
    //     });

    //below Example 2.8...create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Votes for " + expressed + " in each precinct");

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

        //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

};

})(); //last line of main.js
