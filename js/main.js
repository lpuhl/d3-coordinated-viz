//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var attrArray;
var expressed;

//chart frame dimensions
var chartWidth = window.innerWidth * 0.425,
    chartHeight = 473,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//create a scale to size bars proportionally to frame
var yScale = d3.scaleLinear()
    .range([463, 0])
    .domain([0, 100]);

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

  Promise.all([d3.csv("data/MSP_PercentagesByWard_Top5.csv"),
              d3.json("data/MSP_Wards.topojson"),
              d3.json("data/MSP_Bdry.topojson"),
              d3.json("data/Metro_Munis.topojson")])
      .then(function(data) {
        // console.log('data', data);

      var csvData = data[0];
      var mplsPrecincts = topojson.feature(data[1], data[1].objects.MSP_Wards).features;
      var mspBdry = topojson.feature(data[2], data[2].objects.MSP_Bdry);
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
        .fitSize([width, height], mspBdry);

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
      createDropdown(csvData);

  }); // end of Promise.all().then()
} //end of setMap()

function joinData (mplsPrecincts, csvData) {
    for (var i=0; i < csvData.length; i++) {
    var csvPrecinct = csvData[i]; //the current precinct
    var csvKey = csvPrecinct.WardName; //the CSV primary key
    //loop through geojson wards to find correct precinct
    for (var j=0; j < mplsPrecincts.length; j++) {
      var geojsonProps = mplsPrecincts[j].properties; //the current precinct geojson properties
      var geojsonKey = geojsonProps.WardName; //the geojson primary key
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
  //add Minneapolis wards to map
  var wards = map.selectAll(".wards")
      .data(mplsPrecincts)
      .enter()
      .append("path")
      .attr("class", function(d){
          // console.log("wards " + d.properties.WardName.replace(/ /g,"_"));
          return "wards " + d.properties.WardName.replace(/ /g,"_");
      })
      .attr("d", path)
      .style("fill", function(d){
        // console.log(choropleth(d.properties, colorScale));
        return choropleth(d.properties, colorScale);
      })
      .on("mouseover", function(d){
          d3.select(this).raise(); // Bring selected ward to the front
          highlight(d.properties);
      })
      .on("mouseout", function(d){
          dehighlight(d.properties);
      })
      .on("mousemove", moveLabel);

  var desc = wards.append("desc")
      .text('{"stroke": "#000", "stroke-width": "0.5px"}');


};

//Example 1.4 line 11...function to create color scale generator
function makeColorScale(data){
  https://colorbrewer2.org/?type=sequential&scheme=Purples&n=5
  var colorClasses = [
      '#f2f0f7',
      '#cbc9e2',
      '#9e9ac8',
      '#756bb1',
      '#54278f'
    ];
      // "#D4B9DA",
      // "#C994C7",
      // "#DF65B0",
      // "#DD1C77",
      // "#980043"

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

    //set bars for each precinct
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bars " + d.WardName.replace(/ /g,"_");
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);

    var desc = bars.append("desc")
    .text('{"stroke": "none", "stroke-width": "0px"}');


    // //annotate bars with attribute value text
    // var numbers = chart.selectAll(".numbers")
    //     .data(csvData)
    //     .enter()
    //     .append("text")
    //     .sort(function(a, b){
    //         return a[expressed]-b[expressed]
    //     })
    //     .attr("class", function(d){
    //         return "numbers " + d.WardName;
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
        .attr("class", "chartTitle");

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

    updateChart(bars, csvData.length, colorScale);
};

//function to create a dropdown menu for attribute selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
          changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Candidate");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};

//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var wards = d3.selectAll(".wards")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });

        //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bars")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);

    updateChart(bars, csvData.length, colorScale);
};

//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });

    var chartTitle = d3.select(".chartTitle")
      .text(expressed + "\'s vote share by ward");
    console.log('chartTitle', chartTitle);
};

//function to highlight enumeration units and bars
function highlight(props){
  // console.log(props);
   //change stroke
  var selected = d3.selectAll("." + props.WardName.replace(/ /g,"_"))
     .style("stroke", "yellow")
     .style("stroke-width", "2");
  // console.log('selected', selected);
  setLabel(props);
};

//function to reset the element style on mouseout
function dehighlight(props){
   var selected = d3.selectAll("." + props.WardName.replace(/ /g,"_"))
       .style("stroke", function(){
           return getStyle(this, "stroke")
       })
       .style("stroke-width", function(){
           return getStyle(this, "stroke-width")
       });

   function getStyle(element, styleName){
       var styleText = d3.select(element)
           .select("desc")
           .text();

       var styleObject = JSON.parse(styleText);
       console.log('styleObject', styleObject);
       return styleObject[styleName];
   };

  //below Example 2.4 line 21...remove info label
  d3.select(".infolabel")
      .remove();
};

//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "%</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", "p" + props.WardName + "_label")
        .html(labelAttribute);

    var precinctName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.WardName);
};

//function to move info label with mouse
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1;

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};

})(); //last line of main.js
