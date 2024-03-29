let data; // Global variable to store the original data

async function init(roomType="both") {
  data = await d3.csv("./NYC-Airbnb-2023.csv");

  // Filter the data to include only rows with minimum_nights less than 8
  data = data.filter(function(d) {
    return +d["minimum_nights"] < 8;  // Convert to number using unary plus operator
  });

  if (roomType !== "both") {
    data = data.filter(function(d) {
      return d.room_type === roomType;
    });
  }
  data = data.filter(function(d) {
    return d["neighbourhood_group"] != 'Staten Island';  //fck staten island, messin up my data yo
  });

  // Count the occurrences of each unique countProp and compute total price
  var counts = {}, totalPrices = {};
  data.forEach(function(d) {
    var prop = d["neighbourhood_group"];
    counts[prop] = (counts[prop] || 0) + 1;
    totalPrices[prop] = (totalPrices[prop] || 0) + +d["price"];
  });

  var totalCount = d3.sum(Object.values(counts));

  // Convert the counts object into an array of objects and compute average price and percentage
  var data = Object.keys(counts).map(function(key) {
    var count = counts[key];
    return { key: key, count: count, averagePrice: totalPrices[key] / count, percentage: (count / totalCount) * 100 };
  });

  updateGraph(data); // Initial graph with all data
}

function updateGraph(data) {

  var svg = d3.select("svg");
  svg.selectAll("*").remove(); // Clear the previous graph

  var margin = {top: 150, right: 150, bottom: 150, left: 150};
  var width = +svg.attr("width") - margin.left - margin.right;
  var height = +svg.attr("height") - margin.top - margin.bottom;
  var radius = Math.min(width, height) / 2;
  // Get the minimum and maximum avg prices
  var priceExtent = d3.extent(data, function(d) { return d.averagePrice; });

  var color = d3.scaleSequential()
    .domain(priceExtent) 
    .interpolator(d3.interpolateRgb("darkgreen", "maroon"));

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
    .attr("transform", "translate(" + (width / 2 + margin.left) + "," + (height / 2 + margin.top) + ")"); 

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
              + d.data.percentage.toFixed(2) + "%<br><i>Click to drill down</i>")
        .style("left", (d3.event.pageX + 15) + "px") 
        .style("top", (d3.event.pageY - 28) + "px");
    })    
    .on("mouseout", function(d) {  // Hide tooltip on mouseout
      tooltip.style("opacity", 0);
    })
    .on("click", function(d) {
      var clickedGroup = d.data.key;
      window.location.href = "drilled-down-1.html?neighbourhood_group=" + encodeURIComponent(clickedGroup);
    });

  arcs.append("text")
    .attr("transform", function(d) {
      var c = labelArc.centroid(d);
      return "translate(" + c[0] + "," + c[1] + ") rotate(" + computeTextRotation(d) + ")";
    })
    .attr("dx", function(d) { return computeTextDx(d); }) // Adjust dx based on angle
    .attr("dy", "0.35em")
    .attr("text-anchor", function(d) { return computeTextAnchor(d); }) 
    .text(function(d) { return d.data.key; });
  
  function computeTextRotation(d) {
    var angle = (d.startAngle + d.endAngle) / Math.PI * 90;  
    return (angle < 180) ? angle - 90 : angle + 90;  
  }
  
  function computeTextDx(d) {
    var angle = (d.startAngle + d.endAngle) / Math.PI * 90;  
    return (angle < 180) ? "-1.2em" : "1.2em";  
  }
  
  function computeTextAnchor(d) {
    var angle = (d.startAngle + d.endAngle) / Math.PI * 90;
    return (angle < 180) ? "start" : "end";  
  }

  // Legend
  var defs = svg.append("defs");

  var linearGradient = defs.append("linearGradient")
    .attr("id", "linear-gradient");

  linearGradient.selectAll("stop") 
    .data(color.ticks().map((t, i, n) => ({offset: `${100*i/n.length}%`, color: color(t)})))
    .enter().append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);

    // Append a group for the legend
  var legend = svg.append("g")
    .attr("transform", `translate(${width}, 0)`); 

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
    x: width,
    y: 0,  
    dy: 40,
    dx: 0
  }];

  // Add the annotation to the SVG
  svg.append("g")
    .attr("class", "annotation-group")
    // .attr("transform", "translate(0," + (margin.top / 2) + ")")
    .call(d3.annotation().annotations(annotations));

    // Find the data for Queens
  var queensData = arcData.find(function(d) { return d.data.key === "Queens"; });

  if (queensData) {  // Ensure queensData is defined
    const queensAnnotation = {
      note: {
        title: "Beat the average!",
        label: "The avg Airbnb price in NYC 2023 is $167.",
      },
      x: labelArc.centroid(queensData)[0] + width / 2 + margin.left, 
      y: labelArc.centroid(queensData)[1] + height / 2 + margin.top, 
      dy: 50,
      dx: -20
    };
    annotations.push(queensAnnotation);
  }

  // Add the annotations to the SVG
  svg.append("g")
    .attr("class", "annotation-group")
    .call(d3.annotation().annotations(annotations));

  // Legend

}

// Add listener for dropdown menu selection change event
d3.select("#room-type-select").on("change", function() {
  var selectedRoomType = d3.select(this).node().value;

  init(selectedRoomType);
});

init();
