onmessage = function(e)
{
  xget = new XMLHttpRequest();
  var raw;

xget.onreadystatechange = function() {
  if (xget.readyState == 4)
  {
    if(xget.status == 200)
    {
      postMessage(xget.response)
    }
  }
}
 

  xget.open('GET', 'http://bigdata-node2.ama-inc.com:5000//tilestore/tile_cache/459326662f91c5fd1776558b3659a754.png',false);
  xget.setRequestHeader('Access-Control-Allow-Origin', '*');
  xget.setRequestHeader('Access-Control-Allow-Methods', 'GET');
  xget.send(null);
}
