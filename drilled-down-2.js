let data; // Global variable to store the original data
let total; // Global variable to store total count

async function init() {
  // Get the 'neighbourhood_group' from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const neighbourhoodGroup = urlParams.get('neighbourhood_group');

  // Load data from NYC-Airbnb-2023.csv
  let rawData = await d3.csv("./NYC-Airbnb-2023.csv");

  // Filter the data based on the 'neighbourhood_group'
  let filteredData = rawData.filter(d => d.neighbourhood_group === neighbourhoodGroup);

  // Count the occurrences of each neighbourhood and calculate total price
  var counts = {};
  var totalPrices = {};
  filteredData.forEach(function(d) {
    var neighbourhood = d.neighbourhood;
    counts[neighbourhood] = (counts[neighbourhood] || 0) + 1;
    totalPrices[neighbourhood] = (totalPrices[neighbourhood] || 0) + parseFloat(d.price);
  });

  total = Object.values(counts).reduce((a, b) => a + b, 0); // Calculate total count

  // Convert the counts object into an array of objects
  // Replace the neighbourhood value for those with less than 1000 entries
// Group the neighbourhoods with less than 1000 entries into "Other"
  for (let key in counts) {
    if (counts[key] < 50) {
      counts["Other"] = (counts["Other"] || 0) + counts[key];
      totalPrices["Other"] = (totalPrices["Other"] || 0) + totalPrices[key];
      delete counts[key];
      delete totalPrices[key];
    }
  }

  // Create the data array
  var data = Object.keys(counts).map(function(key) {
    var averagePrice = totalPrices[key] / counts[key];
    return { key: key, count: counts[key], averagePrice: averagePrice };
  });

  updateGraph(data);
}


function updateGraph(filteredData) {
  // Variable to hold the property we are counting
  var data = filteredData;

  var svg = d3.select("svg");
  svg.selectAll("*").remove(); // Clear the previous graph

  var margin = {top: 150, right: 150, bottom: 150, left: 70}; // Define margins
  var width = +svg.attr("width") - margin.left - margin.right;
  var height = +svg.attr("height") - margin.top - margin.bottom;
  var radius = Math.min(width, height) / 2;
  // Get the minimum and maximum average prices
  var priceExtent = d3.extent(filteredData, function(d) { return d.averagePrice; });

  var color = d3.scaleSequential()
    .domain(priceExtent)  // Set the domain of the color scale to the minimum and maximum average prices
    .interpolator(d3.interpolateRgb("green", "red"));  // Interpolate between green and red

  // legend
  var defs = svg.append("defs");

  var linearGradient = defs.append("linearGradient")
    .attr("id", "linear-gradient");

  linearGradient.selectAll("stop") 
    .data(color.ticks().map((t, i, n) => ({offset: `${100*i/n.length}%`, color: color(t)})))
    .enter().append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);

  svg.append("g")
    .attr("transform", `translate(${width}, 0)`)  // Position the legend to the right
    .append("rect")
    // .attr('transform', 'rotate(90)')
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
    x: width + 20,  // Position the annotation to the right of the legend
    y: 20,  // Position the annotation above the legend
    dy: 40,
    dx: 0
  }];  
  
  svg.append("g")
    .attr("class", "annotation-group")
    .call(d3.annotation().annotations(annotations));  
  // legend

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
              + (d.data.count / total * 100).toFixed(2) + "%")
        .style("left", (d3.event.pageX + 10) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {  // Hide tooltip on mouseout
      tooltip.style("opacity", 0);
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
}

init();
