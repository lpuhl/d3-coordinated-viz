window.onload = setMap();

function setMap() {

  //map frame dimensions
  var width = 960,
      height = 540;

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

  Promise.all([d3.csv("data/Mpls_Results_Processed.csv"),
              d3.json("data/Mpls_Precincts_final.topojson"),
              d3.json("data/Mpls_Bdry.topojson"),
              d3.json("data/Metro_Munis.topojson")])
      .then(function(data) {
        console.log('data', data);
        var mplsPrecincts;
        var mplsBdry;
        var allMunis;

        mplsPrecincts = topojson.feature(data[1], data[1].objects.Mpls_Precincts_final).features;

        mplsBdry = topojson.feature(data[2], data[2].objects.Mpls_Bdry);

        allMunis = topojson.feature(data[3], data[3].objects.Metro_Munis);
        // console.log(data); //check if all data was loaded
        //any code that depends on 'data' goes here
        // for (i = 0; i < data.length; i++) {
        //   console.log(data[i]["objects"]);
        //   if (data[i]["objects"] == "Mpls_Bdry") {
        //       mplsBdry = topojson.feature(data[i], data[i].objects.Mpls_Bdry)
        //   }
        //   if (data[i]["objects"] == "Mpls_Precincts_final") {
        //     console.log('got here');
        //       mplsPrecincts = topojson.feature(data[i], data[i].objects.Mpls_Precincts_final).features
        //   }
          // if (Array.isArray(data[i]) == false) {
          //   mplsPrecincts = topojson.feature(data[i], data[i].objects.Mpls_Precincts_final).features;
          // }
        // }
        console.log('mplsBdry', mplsBdry);
        console.log('Metro_Munis', allMunis);

      // https://github.com/veltman/d3-stateplane
      var projection = d3.geoConicConformal()
        .parallels([45 + 37 / 60, 47 + 3 / 60])
        .rotate([94 + 15 / 60, 0])
        .fitSize([width, height], mplsBdry);

    // //create UTM zone projection centered on MN
    // var projection = d3.geoTransverseMercator()
    //     .center([-93, 0])
    //     .rotate([-93, 0, 0])
    //     .scale(2500)
    //     .translate([width / 2, height / 2]);

    var path = d3.geoPath()
      .projection(projection);

    //add neighboring cities to map
    var munis = map.append("path")
        .datum(allMunis)
        .attr("class", "munis")
        .attr("d", path);

    //add Minneapolis precincts to map
    var precincts = map.selectAll(".precincts")
        .data(mplsPrecincts)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "precincts " + d.properties.PCTCODE;
        })
        .attr("d", path);

    // // create graticule generator
    // var graticule = d3.geoGraticule()
    //     .step([0.1, 0.1]); //place graticule lines every 5 degrees of longitude and latitude
    //
    // //create graticule lines
    // var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
    //     .data(graticule.lines()) //bind graticule lines to each element to be created
    //     .enter() //create an element for each datum
    //     .append("path") //append each element to the svg as a path element
    //     .attr("class", "gratLines") //assign class for styling
    //     .attr("d", path); //project graticule lines


  });
}
