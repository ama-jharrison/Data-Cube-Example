var x,y,xAxis,yAxis,reverse=false,log=false,sqrt=false,scale = 10,foo="",foo_formatted=false;
all_tasks = null;
bar = false;
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

function format_foo()
{
  if(foo_formatted)
    return;

  foo = foo.split(/\s/);
  bar = {};
  //foo = foo[0].split(' ');
  for(i in foo)
    {
      foo[i] = foo[i].replace(/,/,'-');
    }

  foo.splice(foo.length-1,1);

  for(i = 0; i < foo.length; i++)
  {
    foo[i] = foo[i].split(',')
    bar[foo[i][0]] = parseInt(bar[foo[i][0]]) || 0;
    bar[foo[i][0]] = parseInt(bar[foo[i][0]]) + parseInt(foo[i][1]);
  }
  foo = [];
console.log(bar.length);
  for(i in Object.keys(bar))
  {
    foo[i] = { date: Object.keys(bar)[i], pixel: bar[Object.keys(bar)[i]]};
  }
  foo_formatted = true;
  bar = true;
  redraw();
}


function sort_by(param,order,data)
{
  param = param || "date";
  order = order || 1;
  data = data || this.data;

  if(param == "date" && order == 0)
    data.sort(this.compare_by_date);
  if(param == "date" && order == 1)
    data.sort(this.compare_by_date).reverse();

    return data;
}

//-----------------------------------------------------------------------------

// similar to slice, extracts data based on range and param specified in comments
// will need to add validations later
function extract_from_range(start,end,sort_param,result_param)
{

  sort_param = sort_param || "date";
  result_param = result_param || "all";

  var accum = [];

  pool = this.data = this.sort_by()

  for( i in data)
  {
    if( sort_param == "date")
    {
      if(this.in_date_range(start,end,data[i]))
        accum.push(data[i]);
      }
  }

  return accum = this.sort_by(sort_param,0,accum);

}

function get_task_list_from_storage(){
  var tmp_tasks = sessionStorage.getItem('task_list') || "";
  return tmp_tasks.split(',');
}

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
get_data();
}

var script = document.createElement('script');
script.src = 'http://code.jquery.com/jquery-1.11.0.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);

var files,accum;

function get_preview_id(id)
{
    if(id.length > 0)
    $.ajax({
	type: "get",
	url: "http://bigdata-node2.ama-inc.com:5000/mosaic/"+id+"/png/view/submit",
	datatype: "text",
	success: function(data)
	{
		console.log(data.request);
		x = JSON.parse(data);
		console.log(x);
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
		if(parsed["request"] != "WAIT")
		{
			set_preview_source(parsed.alterntaive);
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
  $.ajax({
    type: "GET",
    url: url_source,
    datatype:"image/jpg",
    success: function (data) {
	console.log("");
        $('#mosaic_graph').attr('src', 'http://bigdata-node2.ama-inc.com:5000//tilestore/tile_cache/459326662f91c5fd1776558b3659a754_marked.png');
      }
 });
}



function get_data()
{
  id = document.getElementById("task_id").value
  if(id.length > 0)
{
  var w = new Worker("ret_list.js");
  foo_formatted = false;
  w.onmessage = function(e)
  {
    set_files(e.data)
  }
  w.postMessage(id);

}
}

function updateData()
{
  if( foo.length != 0)
  format_foo();

  get_preview_id(id);

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
      foo = foo+e.data;
    }
    console.log(ind[i])
    w.postMessage("http://bigdata-node2.ama-inc.com:5000"+ind[i]);
  }

}



update(1)

function update(nRadius) {

  // adjust the text on the range slider
  d3.select("#nRadius-value").text(nRadius);
  d3.select("#nRadius").property("value", nRadius);
  scale = Math.pow(nRadius,3);
  redraw();
}

d3.select("#nRadius").on("input", function() {
  update(+this.value);
});

d3.selectAll(".order_button").on("change", function() {
  reverse = this.checked
  console.log(this.checked);
  redraw();
})

d3.selectAll(".log_button").on("change", function() {
  if(sqrt == false && log == true)
  {
    log = this.checked
    redraw();
  }
  else if(sqrt == true && log == false)
  {
    log = this.checked
    sqrt = false;
    d3.selectAll(".sqrt_button")
        .property("checked",false);
    redraw();
  }
  else if(sqrt == false && log == false)
  {
    log = this.checked
    redraw();
  }
})

d3.selectAll(".sqrt_button").on("change", function() {
  if(log == false && sqrt == true)
  {
    sqrt = this.checked
    redraw();
  }
  else if(log == true && sqrt == false)
  {
    sqrt = this.checked
    log = false;
    d3.selectAll(".log_button")
        .property("checked",false);
    redraw();
  }
  else if(log == false && sqrt == false)
  {
    sqrt = this.checked
    redraw();
  }
})
pop_tasks();

function redraw()
{

  d3.select("svg").remove();

  if(!bar) {
start_date = "2000-1";
end_date =  "2015-12";
raw_data = data;

type = "test";
source = null;

if(type == "test") {
  j = new JSONHelper(raw_data)
  if(!reverse)
    data = j.extract_from_range(start_date,end_date);
  else
    data = j.extract_from_range(start_date,end_date).reverse();

  dat = [];
  for(i in data)
    dat[i] = {date: data[i]["year"]+"-"+data[i]["month"],pixel: data[i]["pixels"]};
  }
}
else {
  if(!reverse)
    dat = foo;
  else
	{
    dat = foo.slice().reverse();

}
}


var margin = {top: 100, right: 100, bottom: 100, left: 100},
    width = 800,
    height = 800 - margin.top - margin.bottom;

 x = d3.scale.ordinal()
  .domain(dat.map(function(d){ return d.date; }))
  .rangeBands([0,width]);

if (log)
{
 y = d3.scale.log()
  .domain([1,d3.max(dat, function(d) { return d.pixel;})])
  .range([height,1]);
}
else if(sqrt) {
  y = d3.scale.sqrt()
   .domain([0,d3.max(dat, function(d) { return d.pixel;})/scale])
   .range([height,0]);
}
else {
  y = d3.scale.linear()
   .domain([0,d3.max(dat, function(d) { return d.pixel;})/scale])
   .range([height,0]);
}

if(dat.length > 18)
{
xAxis = d3.svg.axis()
  .scale(x)
  .tickValues(x.domain().filter(function(d, i) { return !(i % Math.floor((dat.length/6)) ); }))
  .orient("bottom");
}
else
{
xAxis = d3.svg.axis()
  .scale(x)
  .orient("bottom");
}

yAxis = d3.svg.axis()
  .scale(y)
  .orient("left")


var svg = d3.select("#chart").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var gradient = svg
    .data(dat)
    .append("linearGradient")
    .attr("y1", height*1.5)
    .attr("y2", 0)
    .attr("x1", "0")
    .attr("x2", "0")
    .attr("id", "gradient")
    .attr("gradientUnits", "userSpaceOnUse")

gradient
    .append("stop")
    .attr("offset", "0")
    .attr("stop-color", "white")

gradient
    .append("stop")
    .attr("offset", "0.5")
    .attr("stop-color", "#2DCC30")

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", "-.2em")
      .attr("transform", "rotate(-90)" )


  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .selectAll("text")
      .attr("transform", "rotate(50)translate(0,20)");


  svg.selectAll(".bar")
      .data(dat)
    .enter().append("rect")
      .attr("fill","url(#gradient)")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d.date); })
      .attr("width", x.rangeBand()-2)
      .attr("y", function(d) { return y(d.pixel); })
      .attr("height", function(d) { return (height-y(d.pixel));} );

}
