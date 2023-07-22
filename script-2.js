let data; // Global variable to store the original data
let total; // Global variable to store total count

async function init() {
  // Load data from NYC-Airbnb-2023.csv
  data = await d3.csv("./NYC-Airbnb-2023.csv");

  // Filter the data to include only rows with minimum_nights greater than 30
  data = data.filter(function(d) {
    return +d["minimum_nights"] > 30;  // Convert to number using unary plus operator
  });

  // Count the occurrences of each unique countProp and compute total price
  var counts = {}, totalPrices = {};
  data.forEach(function(d) {
    var prop = d["neighbourhood_group"];
    counts[prop] = (counts[prop] || 0) + 1;
    totalPrices[prop] = (totalPrices[prop] || 0) + +d["price"];  // Convert to number using unary plus operator
  });

  total = Object.values(counts).reduce((a, b) => a + b, 0); // Calculate total count

  // Convert the counts object into an array of objects and compute average price
  var data = Object.keys(counts).map(function(key) {
    return { key: key, count: counts[key], averagePrice: totalPrices[key] / counts[key] };
  });

  updateGraph(data); // Initial graph with all data
}

function updateGraph(data) {
  var svg = d3.select("svg");
  svg.selectAll("*").remove(); // Clear the previous graph

  var margin = {top: 150, right: 150, bottom: 150, left: 150}; // Define margins
  var width = +svg.attr("width") - margin.left - margin.right;
  var height = +svg.attr("height") - margin.top - margin.bottom;
  var radius = Math.min(width, height) / 2;
  // Get the minimum and maximum avg prices
  var priceExtent = d3.extent(data, function(d) { return d.averagePrice; });

  var color = d3.scaleSequential()
    .domain(priceExtent)  // Set the domain of the color scale to the minimum and maximum average prices
    .interpolator(d3.interpolateRgb("darkgreen", "maroon"));  // Interpolate between maroon and dark green

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

  var tooltip = d3.select("#tooltip");

  arcs.append("path")
    .attr("d", arc)
    .attr("fill", function(d) { return color(d.data.averagePrice); })  // Set color based on average price
    .on("mouseover", function(d) {  // Show tooltip on mouseover
      tooltip.style("opacity", 1)
        .html("<strong>" + d.data.key + "</strong><br><strong>Average nightly price:</strong> $" 
              + d.data.averagePrice.toFixed(2) + "<br><strong>Percentage of total listings:</strong> " 
              + (d.data.count / total * 100).toFixed(2) + "%<br><i>Click to drill down</i>")
        .style("left", (d3.event.pageX + 10) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {  // Hide tooltip on mouseout
      tooltip.style("opacity", 0);
    })
    .on("click", function(d) {
      var clickedGroup = d.data.key;
      window.location.href = "drilled-down-2.html?neighbourhood_group=" + encodeURIComponent(clickedGroup);
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

  // legend
  // Define the gradient for the legend
  var defs = svg.append("defs");

  var linearGradient = defs.append("linearGradient")
    .attr("id", "linear-gradient");

  // Create the stops of the linear gradient
  linearGradient.selectAll("stop") 
    .data(color.ticks().map((t, i, n) => ({offset: `${100*i/n.length}%`, color: color(t)})))
    .enter().append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);

    // Append a group for the legend
  var legend = svg.append("g")
    .attr("transform", `translate(${width}, 0)`);  // Position the legend in the top right

  // Append a rectangle for the legend color guide
  legend.append("rect")
    .attr("width", height)
    .attr("height", 20)
    .style("fill", "url(#linear-gradient)");
  // Define the annotation
  priceExtent[0] = Math.round(priceExtent[0]);
  priceExtent[1] = Math.round(priceExtent[1]);

  const annotations = [{
    note: {
      title: "$" + priceExtent[0] + " to $" + priceExtent[1] + "",
      label: "average per-night cost"
    },
    x: width,  // Position the annotation to the top right of the legend
    y: 0,  
    dy: 40,
    dx: 0
  }];

  // Add the annotation to the SVG
  svg.append("g")
    .attr("class", "annotation-group")
    // .attr("transform", "translate(0," + (margin.top / 2) + ")")  // Adjust transform
    .call(d3.annotation().annotations(annotations));

  // legend

}

init();
