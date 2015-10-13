onmessage = function(e)
{
  console.log("ok");
  xget = new XMLHttpRequest();
  var raw;
  xget.onreadystatechange = function() {
      if (xget.readyState == 4) {
          postMessage(xget.responseText)
      }
  }
  xget.open('GET', e.data);
  xget.send(null);
}
