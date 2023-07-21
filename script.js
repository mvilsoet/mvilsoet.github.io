let data; // Global variable to store the original data

async function init() {
  // Load data from NYC-Airbnb-2023.csv
  data = await d3.csv("./NYC-Airbnb-2023.csv");
  updateGraph(data, false); // Initial graph with all data
}

function updateGraph(filteredData, isDrillDown) {
  // Variable to hold the property we are counting
  var countProp = isDrillDown ? "neighbourhood" : "neighbourhood_group";
  
  // Count the occurrences of each unique countProp
  var counts = {};
  filteredData.forEach(function(d) {
    var prop = d[countProp];
    counts[prop] = (counts[prop] || 0) + 1;
  });

  // Convert the counts object into an array of objects
  var data = Object.keys(counts).map(function(key) {
    return { key: key, count: counts[key] };
  });

  var svg = d3.select("svg");
  svg.selectAll("*").remove(); // Clear the previous graph

  var margin = {top: 150, right: 150, bottom: 150, left: 150}; // Define margins
  var width = +svg.attr("width") - margin.left - margin.right;
  var height = +svg.attr("height") - margin.top - margin.bottom;
  var radius = Math.min(width, height) / 2;
  var color = d3.scaleOrdinal(d3.schemeCategory10);

  var arc = d3.arc()
    .outerRadius(radius - 10)
    .innerRadius(0);

  var labelArc = d3.arc() // Arc for labels
    .outerRadius(radius + 10)
    .innerRadius(radius + 10);

  var pie = d3.pie()
    .sort(null)
    .value(function(d) { return d.count; });

  var g = svg.append("g")
    .attr("transform", "translate(" + (width / 2 + margin.left) + "," + (height / 2 + margin.top) + ")"); // Adjust transform

  var arcData = pie(data);

  var arcs = g.selectAll(".arc")
    .data(arcData)
    .enter().append("g")
    .attr("class", "arc");

    arcs.append("path")
    .attr("d", arc)
    .attr("fill", function(d) { return color(d.data.key); })
    .on("click", function(d) {
      if (!isDrillDown) {
        var clickedGroup = d.data.key;
        window.location.href = "drilled-down-1.html?neighbourhood_group=" + encodeURIComponent(clickedGroup);
      }
    });
  
  arcs.append("text")
    .attr("transform", function(d) {
      var c = labelArc.centroid(d);
      return "translate(" + c[0] + "," + c[1] + ") rotate(" + computeTextRotation(d) + ")";
    })
    .attr("dx", function(d) { return computeTextDx(d); }) // Adjust dx based on angle
    .attr("dy", "0.35em")
    .attr("text-anchor", function(d) { return computeTextAnchor(d); }) // Adjust text-anchor based on angle
    .text(function(d) { return d.data.key; });
  
  function computeTextRotation(d) {
    var angle = (d.startAngle + d.endAngle) / Math.PI * 90;  // Compute angle in degrees
    return (angle < 180) ? angle - 90 : angle + 90;  // Offset angle by 90 degrees
  }
  
  function computeTextDx(d) {
    var angle = (d.startAngle + d.endAngle) / Math.PI * 90;  // Compute angle in degrees
    return (angle < 180) ? "-1.2em" : "1.2em";  // Move text to left for left half of pie
  }
  
  function computeTextAnchor(d) {
    var angle = (d.startAngle + d.endAngle) / Math.PI * 90;  // Compute angle in degrees
    return (angle < 180) ? "start" : "end";  // Right-justify text for left half of pie
  }

  // arcs.append("line") // Line from pie slice to label
  //   .attr("stroke", "black")
  //   .attr("x1", function(d) { return arc.centroid(d)[0]; })
  //   .attr("y1", function(d) { return arc.centroid(d)[1]; })
  //   .attr("x2", function(d) { return labelArc.centroid(d)[0]; })
  //   .attr("y2", function(d) { return labelArc.centroid(d)[1]; });
}

init();
