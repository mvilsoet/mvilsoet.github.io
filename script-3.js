let data;
const averageHotelPrices = { 2014: 171.00, 2015: 174.60, 2016: 170.21, 2017: 153.73, 2018: 132.23, 2019: 114.93, 2020: 90.92, 2021: 139.84, 2022: 148.83, 2023: 212.00, };
const averageRentNYC = { 2014: 3700, 2015: 3805, 2016: 4215, 2017: 4330, 2018: 4432, 2019: 4636, 2020: 4360, 2021: 4000, 2022: 3657, 2023: 3657,};
// data gathered from various sources, including: rentcafe, statista, airbnb, us beaureau of labor statistics


function parseData() {
  // Get room type selection
  var selectedRoomType = d3.select("#room-type-select").node().value;

  // Load data
  d3.csv("NYC-Airbnb-2023.csv").then(function(data) {
    var parseTime = d3.timeParse("%Y-%m-%d");

    // First filter: Ensure that neither last_review nor price are missing and the year is not before 2014
    data = data.filter(function(d) {
      return d.last_review && d.price && parseTime(d.last_review).getFullYear() >= 2014;
    });
    console.log("Selected room type: " + selectedRoomType);

    // Second filter: Exclude certain room types based on selection
    if (selectedRoomType !== "both") {
      data = data.filter(function(d) {
        return d.room_type === selectedRoomType;
      });
    }
    // console.log(data.slice(0,10));  
    data.forEach(function(d) {
      d.last_review = parseTime(d.last_review);
      d.price = +d.price;
    });

    // Group by year and compute average price
    var nestedData = d3.nest()
      .key(function(d) { return d.last_review.getFullYear(); })
      .rollup(function(v) { return {
        averagePrice: d3.mean(v, function(d) { return d.price; }),
        count: v.length
      }; })
      .entries(data);

    nestedData = nestedData.map(function(d) {
      return {
        key: d.key,
        value: d.value.averagePrice,
        count: d.value.count
      };
    });

    // Sort the data by year (key) (lol)
    nestedData.sort(function(a, b) {
      return a.key - b.key;
    });

    createGraph(nestedData, selectedRoomType);
  });
}


function createGraph(data, selectedRoomType) {
  d3.select("svg").remove();

  var margin = {top: 50, right: 20, bottom: 70, left: 50},
      width = 700 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;
  
  var svg = d3.select("#graph").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var xScale = d3.scaleTime()
    .domain(d3.extent(data, function(d) { return new Date(+d.key, 0, 1); }))
    .range([0, width]);

  var yScale = d3.scaleLinear()
    .domain([80, d3.max(data, function(d) { return d.value; })])
    .range([height, 0]);
  
  var line = d3.line()
    .x(function(d) { return xScale(new Date(+d.key, 0, 1)); })  
    .y(function(d) { return yScale(d.value); });

  svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", 4)
    .attr("d", line);

  // Create x-axis
  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%Y")));

  // Create y-axis
  svg.append("g")
    .call(d3.axisLeft(yScale));
  // Draw line for average rent
  svg.append("path")
    .datum(Object.entries(averageRentNYC))
    .attr("fill", "none")
    .attr("stroke", "green")
    .attr("stroke-width", .5)
    .attr("d", d3.line()
      .x(function(d) { return xScale(new Date(+d[0], 0, 1)); })
      .y(function(d) { return yScale(d[1]/30); })  // convert monthly rent to daily
    );

  // Draw line for average hotel price
  svg.append("path")
    .datum(Object.entries(averageHotelPrices))
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-width", .5)
    .attr("d", d3.line()
      .x(function(d) { return xScale(new Date(+d[0], 0, 1)); })
      .y(function(d) { return yScale(d[1]); })
    );

  // Get tooltip div
  var tooltip = d3.select("#tooltip");
  var color;
  if (selectedRoomType === "Private room") {
    color = d3.scaleThreshold()
      .domain([125, 170])
      .range(["green", "orange", "red"]);
  } else {
    color = d3.scaleThreshold()
      .domain([140, 170])
      .range(["green", "orange", "red"]);
  }
  console.log(color);

  // Append circles
  svg.selectAll(".dot")
    .data(data)
    .enter().append("circle")
    .attr("class", "dot")
    .attr("cx", function(d) { return xScale(new Date(+d.key, 0, 1)); })
    .attr("cy", function(d) { return yScale(d.value); })
    .attr("r", 5)
    .attr("fill", function(d) { return color(d.value); })
    .on("mouseover", function(d) {
      tooltip.style("opacity", 1);
      tooltip.html("Year: " + d.key + "<br/>" +
                   "Average Price: $" + d.value.toFixed(2) + "<br/>" +
                   "Number of Data Points: " + d.count)
        .style("left", (width / 3) + "px")
        .style("top", "175px");
    })
    .on("mouseout", function(d) {
      tooltip.style("opacity", 0);
    });
    
  // Add a label for the y-axis
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x",0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Price ($), >$80");
  // Add a label for the x-axis
  svg.append("text")             
    .attr("transform",
          "translate(" + (width/2) + " ," + 
                        (height + margin.top + 10) + ")")
    .style("text-anchor", "middle")
    .text("Year");
  // Create an annotations array
  var annotations = 
  [
    {
    note: {
      label: "Resurgence of tourism (profit) post-pandemic.",
      title: "Scalpers!"
    },
    x: xScale(new Date(2022, 0, 1)), // x position
    y: yScale(data.find(d => d.key == '2022').value), // y position
    dy: 10,
    dx: -50
  },
  {
      note: {
        label: "Prices are recovering in 2023!",
        title: "Looking up..."
      },
      x: xScale(new Date(2023, 0, 1)), // x position
      y: yScale(data.find(d => d.key == '2023').value), // y position
      dy: 0,
      dx: -90
    }
  ];

  // Create annotation
  var makeAnnotations = d3.annotation()
    .annotations(annotations);

  svg.append("g")
    .attr("class", "annotation-group")
    .call(makeAnnotations);

}
// Listen for changes to the dropdown selection
d3.select("#room-type-select").on("change", function() {
  // Call the parseData function every time the selection changes
  parseData();
});

parseData();
