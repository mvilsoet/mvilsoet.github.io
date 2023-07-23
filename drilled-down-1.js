let data; // Global variable to store the original data

async function init(roomType="both") {
  const urlParams = new URLSearchParams(window.location.search);
  const neighbourhoodGroup = urlParams.get('neighbourhood_group');

  let rawData = await d3.csv("./NYC-Airbnb-2023.csv");

  let filteredData = rawData.filter(d => d.neighbourhood_group === neighbourhoodGroup);

  filteredData = filteredData.filter(function(d) {
    return +d["minimum_nights"] < 8;
  });

  if (roomType !== "both") {
    filteredData = filteredData.filter(function(d) {
      return d.room_type === roomType;
    });
  }

  // Count the occurrences of each neighbourhood and calculate total price
  var counts = {};
  var totalPrices = {};
  filteredData.forEach(function(d) {
    var neighbourhood = d.neighbourhood;
    counts[neighbourhood] = (counts[neighbourhood] || 0) + 1;
    totalPrices[neighbourhood] = (totalPrices[neighbourhood] || 0) + parseFloat(d.price);
  });

  // 1) Convert the counts object into an array of objects
  // 2) Replace the neighbourhood value for those with less than 1000 entries
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
  var data = filteredData;
  var tooltip = d3.select("#tooltip");
  var total = d3.sum(filteredData, function(d) { return d.count; });

  var svg = d3.select("svg");
  svg.selectAll("*").remove(); // Clear the previous graph

  var margin = {top: 150, right: 150, bottom: 150, left: 70}; 
  var width = +svg.attr("width") - margin.left - margin.right;
  var height = +svg.attr("height") - margin.top - margin.bottom;
  var radius = Math.min(width, height) / 2;
  
  var priceExtent = d3.extent(filteredData, function(d) { return d.averagePrice; });

  var color = d3.scaleSequential()
    .domain(priceExtent)  
    .interpolator(d3.interpolateRgb("green", "red"));  

  // Legend
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

  priceExtent[0] = Math.round(priceExtent[0]);
  priceExtent[1] = Math.round(priceExtent[1]);

  const annotations = [{
    note: {
      title: "$" + priceExtent[0] + " to $" + priceExtent[1] + "",
      label: "average per-night cost"    
    },
    x: width + 20,  
    y: 20,  
    dy: 40,
    dx: 0
  }];  
  
  svg.append("g")
    .attr("class", "annotation-group")
    .call(d3.annotation().annotations(annotations));  
  // Legend

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

  arcs.append("path")
    .attr("d", arc)
    .attr("fill", function(d) { return color(d.data.averagePrice); })
    .on("mouseover", function(d) {
      tooltip.style("opacity", 1);
      tooltip.html("<strong>" + d.data.key + "</strong><br><strong>Average nightly price:</strong> $" 
                   + d.data.averagePrice.toFixed(2) + "<br><strong>Percentage of total listings:</strong> " 
                   + (d.data.count / total * 100).toFixed(2) + "%");
    })
    .on("mousemove", function(d) {
      tooltip.style("left", (d3.event.pageX + 10) + "px")
             .style("top", (d3.event.pageY - 10) + "px");
    })
    .on("mouseout", function(d) {
      tooltip.style("opacity", 0);
    });

  arcs.append("text")
    .attr("transform", function(d) {
      var c = labelArc.centroid(d);
      return "translate(" + c[0] + "," + c[1] + ") rotate(" + computeTextRotation(d) + ")";
    })
    .attr("dx", function(d) { return computeTextDx(d); }) 
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

// Find the data for Laurelton
var laureltonData = arcData.find(function(d) { return d.data.key === "Laurelton"; });

if (laureltonData) {  // Ensure laureltonData is defined
  const laureltonAnnotation = {
    note: {
      title: "Laurel-TONS of money",
      label: "Average annual household income here is $115,722.",
    },
    x: labelArc.centroid(laureltonData)[0] + width / 2 + margin.left,
    y: labelArc.centroid(laureltonData)[1] + height / 2 + margin.top, 
    dy: -80,
    dx: -5
  };
  annotations.push(laureltonAnnotation);
}

// Add the annotations to the SVG
svg.append("g")
  .attr("class", "annotation-group")
  .call(d3.annotation().annotations(annotations));

}

// Add listener for dropdown menu selection change event
d3.select("#room-type-select").on("change", function() {
  var selectedRoomType = d3.select(this).node().value;

  init(selectedRoomType);
});

init();
