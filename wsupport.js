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
  var tmp_tasks = sessionStorage.getItem('task_list');
  var tasks = tmp_tasks.split(',');
  return tasks;
}
