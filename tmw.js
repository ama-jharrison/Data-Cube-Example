//task manager web worker

"use strict";

var url = "http://bigdata-node2.ama-inc.com:5000/";

function get_data(){
  var requester = new XMLHttpRequest();
  requester.open("GET",url+"status",false);
  requester.send();
  var responseText = requester.responseText;
  console.log(responseText);
  var response = JSON.parse(responseText);
  var ihtml = create_table(response);
  return ihtml;

}

function cancel_task(id){
  var requester = new XMLHttpRequest();
  requester.open("GET",url+"cancel/"+id,false);
  requester.send();
  var responseText = requester.responseText;
  console.log(responseText);

}

function task_comp(a,b){
  if(parseInt(a.id)>parseInt(b.id)){
    return -1;
  }
  if(parseInt(a.id)<parseInt(b.id)){
    return 1;
  }
  return 0;
}

function getTasksInOrder(task_list,buffer){
  var max = Number.MIN_VALUE;
  var cur_count = 0;
  while(buffer.length<task_list.length){
    for(var i=0;i<task_list.length;i++){
      var task = task_list[i];
      if(parseInt(task.id)>max){
        var count = 0;
        for(var j=0;j<task_list.length;j++){
          var task2 = task_list[j];
          if(parseInt(task.id)>parseInt(task2.id)){
            count++;
          }
        }
        if(count<=cur_count){
          buffer.push(task);
          max = parseInt(task.id);

          cur_count++;
        }
      }
    }
  }

}


function getLowestTask(task_list,buffer,minimum){
  var min;
  if(minimum){
    min = minimum;
  } else {
    var min = Number.MIN_VALUE;
  }
  var item;

  for(var i=0;i<task_list.length;i++){
      if(parseInt(task_list[i].id)>min){
        min = parseInt(task_list[i].id);
        item = task_list[i];

      }
  }
  if(item){
    buffer.push(item);
    getLowestTask(task_list,buffer,min);
  } else {
    return buffer;
  }
}

function create_table(jsonObj){
  var table_data = "<table>";
  var table_header = "<tr><td>Task</td><td>Status</td></tr>";
  //Order tasks
  var tasks = [];
  //getTasksInOrder(jsonObj.tasks,tasks);
  tasks = jsonObj.tasks.sort(task_comp);
  table_data+=table_header;
  for(var i=0;i<tasks.length;i++){
    var task = tasks[i];
    var row = "<tr><td>"+task.id+"</td><td>"+task.status+(task.status=="PENDING"?" <a href=\"#\" onclick=\"w.postMessage(\'cancel_"+task.id+"\');\">Cancel</a>":"")+"</td></tr>";
    table_data+=row;
  }

  table_data+="</table>";

  return table_data;
}


self.addEventListener("message", function(e) {
  var message = e.data;

  if(message=="start"){
    //Process data
    postMessage(get_data());
  } else if(/\w+_[0-9]+/.test(message)){
    var args = message.split('_');
    cancel_task(args[1]);
  }
});
