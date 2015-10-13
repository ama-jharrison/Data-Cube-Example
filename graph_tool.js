var x,y,xAxis,yAxis,reverse=false,log=false,sqrt=false,scale = 10;
tasks;
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
  console.log("what")
  var tmp_tasks = sessionStorage.getItem('task_list') || "";
  tasks = tmp_tasks.split(',');
}

var select = d3.select("#taskform").append("select").on("change",change()),options = select.selectAll('option').data(tasks);

function change()
{}
var script = document.createElement('script');
script.src = 'http://code.jquery.com/jquery-1.11.0.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);

var files,accum;

function startWorkers()
{
  var w = new Worker("ret_list.js");
  w.onmessage = function(e)
  {
    set_files(e.data)
  }
  w.postMessage("4");

}

function set_files(ind)
{
  files = ind;
  load_csv();
}

function load_csv()
{
}



d3.select("#nRadius").on("input", function() {
  update(+this.value);
});
update(5)
function update(nRadius) {

  // adjust the text on the range slider
  d3.select("#nRadius-value").text(nRadius);
  d3.select("#nRadius").property("value", nRadius);
  scale = Math.pow(nRadius,3);
  redraw();
}

d3.selectAll(".order_button").on("change", function() {
  reverse = this.checked
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


function redraw(start_date,end_date, raw_data,type,source)
{
  tasks = get_task_list_from_storage();
  d3.select("svg").remove();

start_date = start_date || "2000-1";
end_date = end_date || "2015-12";
raw_data = raw_data || data;

type = type || "test";
source = source || null;

if(type == "test") {
  j = new JSONHelper(raw_data)
  if(!reverse)
    data = j.extract_from_range(start_date,end_date).reverse();
  else
    data = j.extract_from_range(start_date,end_date);

  dat = [];
  for(i in data)
    dat[i] = {date: data[i]["year"]+"-"+data[i]["month"],pixel: data[i]["pixels"]};
}

var margin = {top: 100, right: 100, bottom: 100, left: 100},
    width = dat.length*30,
    height = 800 - margin.top - margin.bottom;
/*
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
console.log(log,sqrt)
xAxis = d3.svg.axis()
  .scale(x)
  .orient("bottom");

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
      .attr("transform", "rotate(-90)" );

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("y", -10)
      .attr("dy", ".1em")
      .style("text-anchor", "end")
      .text("Pixels");

  svg.selectAll(".bar")
      .data(dat)
    .enter().append("rect")
      .attr("fill","url(#gradient)")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d.date); })
      .attr("width", x.rangeBand()-2)
      .attr("y", function(d) { return y(d.pixel); })
      .attr("height", function(d) { return (height-y(d.pixel));} );

  svg.selectAll("g").append("text")
    .data(dat)
    .attr("x", function(d) { return height-y(d.pixel)+5; })
    .attr("y", function(d,i) {  return x.rangeBand();})
    .attr("dy", ".35em")
    .text(function(d) { return d.pixel; })
    .attr("transform", "rotate(-90)" )
    //.attr("opacity","0")
    //.on("mouseover",function() { d3.select(this).attr("opacity","1")})
    //.on("mouseout",function() { d3.select(this).attr("opacity","0")});

*/
    var width = 960,
        height = 500,
        radius = Math.min(width, height) / 2;

    var color = d3.scale.ordinal()
        .range(dat.map(function(d){ return d.date; }));

    var arc = d3.svg.arc()
        .outerRadius(radius - 10)
        .innerRadius(0);

    var pie = d3.layout.pie()
        .sort(null)
        .value(function(d) { return d.pixel; });

    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
      .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

        var g = svg.selectAll(".arc")
      .data(pie(dat))
    .enter().append("g")
      .attr("class", "arc");

  g.append("path")
      .attr("d", arc)
      .style("fill", function(d) { return color(d.date); });

  g.append("text")
      .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
      .attr("dy", ".35em")
      .style("text-anchor", "middle")
      .text(function(d) { return d.age; });

}
