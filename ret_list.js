onmessage = function(e)
{
  console.log("ok");
  xget = new XMLHttpRequest();
  var raw;
  xget.onreadystatechange = function() {
      if (xget.readyState == 4) {
          raw = JSON.parse(xget.responseText);
          raw = raw["files"].split(",");
          postMessage(raw)
      }
  }
  xget.open('GET', 'http://bigdata-node2.ama-inc.com:5000/get_stats/'+e.data);
  xget.send(null);
}
