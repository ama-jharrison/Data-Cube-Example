// global arrays containing visualisaiton specific data
var aggregate_data = [],years=[];
// global variables used for offsets and what not
var year_min;

var raw = "";

pop_tasks();

//------------------------------------------------------------------------------
//helpers

function unique(value, index, self) {
    return self.indexOf(value) === index;
}

//------------------------------------------------------------------------------
//DOM ELEMENT JANK AND stuff
function pop_tasks()
{
  // Get dropdown element from DOM
  var dropdown = document.getElementById("task_id");

  var myArray = get_task_list_from_storage()
  // Loop through the array
  for(var i = 0; i < dropdown.length; i++)
  {
    dropdown.options[i]=null;
  }
  dropdown.selectedOptions[0] = dropdown.selectedOptions[0] || new Option(-999,-999);
  for (var i = 0; i < myArray.length; ++i) {
    // Append the element to the end of Array list
    if(dropdown.selectedOptions[0] == null || dropdown.selectedOptions[0].value != myArray[i])
      dropdown[dropdown.length] = new Option(myArray[i], myArray[i]);
  }
  update_task();
}

function update_task()
{
  id = 3;

  update_data();
  make_stacked_graph(chart_data_aggregate());
  get_preview_id(id);

}
get_data(3);

//------------------------------------------------------------------------------
//asset retrieval from server getData -> setFiles -> updateData

function add_task_to_storage(task){
  var task_list;
  var tmp_tasks = sessionStorage.getItem('task_list');
  if(!tmp_tasks){
    task_list = [];

  } else {
    task_list = tmp_tasks.split(',');
  }
  task_list.push(task);
  sessionStorage.setItem('task_list',task_list.join(','));
}

function get_task_list_from_storage(){
  var tmp_tasks = sessionStorage.getItem('task_list') || "";
  return tmp_tasks.split(',');
}

function get_preview_id(id)
{
  $.ajax({
	type: "get",
	url: "http://bigdata-node2.ama-inc.com:5000/mosaic/"+id+"/png/view/submit",
	datatype: "text",
	success: function(data)
	{
		x = JSON.parse(data);
		get_preview_url(x.request)
	}
	});

}

function get_preview_url(id)
{
	timeOutId = 0;
	console.log(id);
	$.ajax({
	type: "get",
	url: "http://bigdata-node2.ama-inc.com:5000/mosaic/"+id.toString()+"/view",
	datatype: "text",
	success: function(data)
	{
		parsed = JSON.parse(data)
    console.log(parsed)
		if(parsed["request"] != "WAIT")
		{
			set_preview_source(parsed.alternative);
			clearTimeout(timeOutId);
		}
		else {
			timeOutId = setTimeout(get_preview_url,2000,id);
			}
	}
	});
}

function set_preview_source(url_source)
{
  console.log(url_source)
  $.ajax({
    type: "GET",
    url: "http://bigdata-node2.ama-inc.com:5000"+url_source,
    datatype:"image/jpg",
    success: function (data) {
        $('#mosaic_preview').attr('src', "http://bigdata-node2.ama-inc.com:5000/"+url_source)
        .attr('style','float: right; width: 250px; height: 250px; padding: 15px;');
      }
 });
}



function get_data(id)
{
  var w = new Worker("ret_list.js");

  w.onmessage = function(e)
  {
    console.log(e.data)
    set_files(e.data)
  }
  w.postMessage(id);

}

function update_data()
{
  raw = raw.split("\n")
  raw = raw.map( function(m) { return m.slice().split(',')});
  raw.pop();
}

function set_files(ind)
{
  foo = "";
  files = ind;
  console.log(ind)
  for(i in ind)
  {
    w = new Worker('ret_csv.js')
    w.onmessage = function(e)
    {
      raw = raw+e.data;
    }
    console.log(ind[i])
    w.postMessage("http://bigdata-node2.ama-inc.com:5000"+ind[i]);
  }

}

//------------------------------------------------------------------------------
// data parsing for production

function tile_data()
{

}

function chart_data_aggregate(data_type)
{
  data_type = data_type || "used";
  final_set = [];
  year_month_good = {};

  // ignore tile information
  var working_set = raw.map( function(i) { return i.slice(2,7)} );

  // get some information we need for chart parameters
  working_set = working_set.map( function(i) { return {year: i[0], month: i[1], remaining: i[2], used: i[3], total: i[4]}});
  year_min = Math.min.apply(null,_.pluck(working_set,"year").map(function(i) { return parseInt(i);}));
  years = _.pluck(working_set,"year").map(function(i) { return parseInt(i);}).filter( unique );
  year_count = years.length;

  // stuff to initialize our hash table
  temp = Array.apply(null, Array(year_count)).map(Number.prototype.valueOf,0);

  for(i = 1; i < 13; i++)
    year_month_good[i] = temp.slice()

  working_set.forEach( function(d)
  {

    var key = d.month

    if(data_type == "remaining")
      year_month_good[key][parseInt(d.year)-year_min] = year_month_good[key][parseInt(d.year)-year_min] + parseInt(d.remaining);
    else if(data_type == "used")
      year_month_good[key][parseInt(d.year)-year_min] = year_month_good[key][parseInt(d.year)-year_min] + parseInt(d.used);
    else if(data_type == "total")
      year_month_good[key][parseInt(d.year)-year_min] = year_month_good[key][parseInt(d.year)-year_min] + parseInt(d.total);

  });

  $.each(year_month_good, function(k,v) {
      v = v.map( function(i,j) {return {x: j,y: i}; } );
      final_set.push(v);
  });

  return final_set;

}

// not complete
function chart_data_tiled(lat,long)
{
  data_type = data_type || "used";
  final_set = [];
  year_month_good = {};

  var working_set = raw.map( function(i) { return i.slice(2,7)} );

  working_set = working_set.map( function(i) { return {year: i[0], month: i[1], remaining: i[2], used: i[3], total: i[4]}});
  year_min = Math.min.apply(null,_.pluck(working_set,"year").map(function(i) { return parseInt(i);}));
  years = _.pluck(working_set,"year").map(function(i) { return parseInt(i);}).filter( unique );
  year_count = years.length;

  temp = Array.apply(null, Array(year_count)).map(Number.prototype.valueOf,0);

  for(i = 1; i < 13; i++)
    year_month_good[i] = temp.slice()

  working_set.forEach( function(d)
  {

    var key = d.month

    if(data_type == "remaining")
      year_month_good[key][parseInt(d.year)-year_min] = year_month_good[key][parseInt(d.year)-year_min] + parseInt(d.remaining);
    else if(data_type == "used")
      year_month_good[key][parseInt(d.year)-year_min] = year_month_good[key][parseInt(d.year)-year_min] + parseInt(d.used);
    else if(data_type == "total")
      year_month_good[key][parseInt(d.year)-year_min] = year_month_good[key][parseInt(d.year)-year_min] + parseInt(d.total);

  });

  $.each(year_month_good, function(k,v) {
      v = v.map( function(i,j) {return {x: j,y: i}; } );
      final_set.push(v);
  });

  return final_set;
}

//------------------------------------------------------------------------------
//local ingestion (not uses old format which omits new data)
function ingest_csv_local() {
var data2 = d3.csv("aggr_tile_timestamp.csv", function(error, dataset) {
  result = [], total = [];

  dataset.forEach(function(d)
  {
    d.Pixels = +d.Pixels;
    d.Month = +d.Month;
    total.push(d);
  });


  year_month_good = {};
  month_template = Array.apply(null, Array(16)).map(Number.prototype.valueOf,0);

  total.forEach( function(d)
  {
    if($.inArray(d.Year,years) == -1)
      years.push(d.Year);

    if ( year_month_good[d.Month] == null)
    {
      year_month_good[d.Month] = month_template.slice();
      year_month_good[d.Month][d.Year-2000] = year_month_good[d.Month][d.Year-2000] + parseInt(d.Pixels);
    }
    else {
      year_month_good[d.Month][d.Year-2000] = year_month_good[d.Month][d.Year-2000] + parseInt(d.Pixels);
    }

  });

  $.each(year_month_good, function(k,v) {
      v = v.map( function(i,j) {return {x: j,y: i}; } );
      result.push(v);
  });

  aggregate_data = result.map(function(arr) { return arr.slice()});
  aggregate_data.forEach(function(i) {i.reverse();});
  aggregate_data = aggregate_data.reverse();

});
}

//------------------------------------------------------------------------------
//d3 visualisation functions

function make_stacked_graph(data)
{

    n = 12, // number of layers
    m =  data[0].length, // number of samples per layer
    stack = d3.layout.stack(),
    layers = stack(data),
    yGroupMax = d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y; }); }),
    yStackMax = d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y0 + d.y; }); });

var margin = {top: 40, right: 10, bottom: 20, left: 10},
    width = 300 - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;

var x = d3.scale.ordinal()
    .domain(d3.range(m).map(function(d) { return years[d];}))
    .rangeRoundBands([0, width], .08);

var y = d3.scale.linear()
    .domain([0, yStackMax])
    .range([height, 0]);

var color = d3.scale.linear()
    .domain([0, n - 1])
    .range(["steelblue", "green"])
    .interpolate(d3.interpolateHcl);

var xAxis = d3.svg.axis()
    .scale(x)
    .tickValues(x.domain().filter(function(d, i) { if(years.length > 9) return !(i % Math.floor((3)) ); else return i}))
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

var svg = d3.select("#sidechart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var layer = svg.selectAll(".layer")
    .data(layers)
  .enter().append("g")
    .attr("class", "layer")
    .style("fill", function(d, i) { return color(i); });

var rect = layer.selectAll("rect")
    .data(function(d) { return d; })
  .enter().append("rect")
    .attr("x", function(d) { return x(d.x+year_min); })
    .attr("y", height)
    .attr("width", x.rangeBand())
    .attr("height", 0);

rect.transition()
    .delay(function(d, i) { return i * 10; })
    .attr("y", function(d) { return y(d.y0 + d.y); })
    .attr("height", function(d) { return y(d.y0) - y(d.y0 + d.y); });

svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

d3.selectAll("input").on("change", change);

var timeout = setTimeout(function() {
  d3.select("input[value=\"grouped\"]").property("checked", true).each(change);
}, 2000);

function change() {
  clearTimeout(timeout);
  if (this.value === "grouped") transitionGrouped();
  else transitionStacked();
}

function transitionGrouped() {
  y.domain([0, yGroupMax]);

  rect.transition()
      .duration(500)
      .delay(function(d, i) { return i * 10; })
      .attr("x", function(d, i, j) { return x(d.x+year_min) + x.rangeBand() / n * j; })
      .attr("width", x.rangeBand() / n)
    .transition()
      .attr("y", function(d) { return y(d.y); })
      .attr("height", function(d) { return height - y(d.y); });
}

function transitionStacked() {
  y.domain([0, yStackMax]);

  rect.transition()
      .duration(500)
      .delay(function(d, i) { return i * 10; })
      .attr("y", function(d) { return y(d.y0 + d.y); })
      .attr("height", function(d) { return y(d.y0) - y(d.y0 + d.y); })
    .transition()
      .attr("x", function(d) { return x(d.x+year_min); })
      .attr("width", x.rangeBand());
}

svg.append("text")
        .attr("x", (width / 2))
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("text-decoration", "underline")
        .text("Pixel Usage vs Source Date");
}

//------------------------------------------------------------------------------
// set data and what not

function init_vis()
{
  make_stacked_graph(chart_data_aggregate());
}

// callback synchronization (gross, I know)
/*
$.ajax({
   url:get_data(),
   success:function(){
   init_vis();
}
});
*/
