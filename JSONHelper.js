// JSON parser for the DataCube GraphTool
// Kevin Chen kevin.y.chen@ama-inc.com 9/13/2014-05

// This class takes in a JSON pixel data as an array
// and offers extraction, sorting, and inspection functions
// Multilevel JSON is not supported though the code should be
// extensible for future use

// Constructor and initialization

// usage: data = new JSONHelper(json_as_array)
function JSONHelper(data,source_type)
{
  source_type = source_type || "JSON"
  if(source_type == "JSON")
    this.initJSONHelper(data);
  this.data = data
}

// extracts keys for each JSON entry into this.parameters
JSONHelper.prototype.initJSONHelper = function(data)
{
  this.parameters = [];
  first_entry = data[0];
  for( key in first_entry)
    this.parameters.push(key);
}

// inserts data into a series of arrays in a hash table
// this allows inspection of individual series
JSONHelper.prototype.processDataToSeries = function()
{
  var series = {}
  for( k in this.parameters)
    series[this.parameters[k]]=[];

  for(i in data)
    for( j in this.parameters)
      series[this.parameters[j]].push(this.data[i][this.parameters[j]]);

    return series;
}

//-----------------------------------------------------------------------------

// Accessors

// return key values for each entry as an array
JSONHelper.prototype.params = function()
{
  return this.parameters;
}

// return data as a hash table of arrays
JSONHelper.prototype.yield_data = function()
{
    return this.data
}

//-----------------------------------------------------------------------------

// Sorting

// generic comparator, add an entry for each new param
JSONHelper.prototype.compare_by_date = function(a,b)
{
  var param1 = "year";
  var param2 = "month";
  if(a[param1] > b[param1])
    return 1
  if(a[param1] < b[param1])
    return -1;
  if(a[param1] == b[param1])
  {
    if(a[param2] > b[param2])
    {
      return 1;
    }
    if(a[param2] < b[param2])
    {
      return -1;
    }
    if(a[param2] == b[param2])
    {
      return 0;
    }
  }

}

JSONHelper.prototype.in_date_range = function(a,b,c)
{
  a = a.split('-');
  b = b.split('-');

  if(a[0] == b[0])
    return (c["month"] >= a[1] && c["month"] <= b[1])

  if(c["year"] > a[0] && c["year"] < b[0])
    return true;
  if(c["year"] == a[0])
    return (c["month"] >= a[1]);
  if(c["year"] == b[0])
    return (c["month"] <= b[1]);
}



JSONHelper.prototype.sort_by = function(param,order,data)
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
JSONHelper.prototype.extract_from_range = function(start,end,sort_param,result_param)
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


//-----------------------------------------------------------------------------

// printing

JSONHelper.prototype.list_entries = function(param)
{
  param = param || "date";

  for(i in this.data)
    console.log(this.data[i]["year"],this.data[i]["month"],this.data[i]["pixels"])
}
