entering in try block');
    const todo =await Todo.addTodo({
      title: request.body.title, dueDate: request.body.dueDate,
    });
    return response.redirect('/');
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

// app.post("/todos",(request,response)=>{
//     console.log("Creating a todo", request.body);
// })

// PUT http://localhost/todos/1/markAsCompleted
app.put('/todos/:id/markAsCompleted', async (request, response)=>{
  console.log('We have updated a todo with id:', request.params.id);
  const todo = await Todo.findByPk(request.params.id);
  try {
    const updatedTodo = await todo.markAsCompleted();
    return response.json(updatedTodo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

// app.delete('/todos/:id', (request, response)=>{
//   console.log('Delete a todo by id', request.params.id);
// });

app.delete('/todos/:id', async function(request, response) {
  console.log('We have to delete a Todo with ID: ', request.params.id);
  // FILL IN YOUR CODE HERE

  // First, we have to query our database to delete a Todo by ID.
  // eslint-disable-next-line max-len
  // Then, we have to respond back with true/false based on whether the Todo was deleted or not.
  // response.send(true)
  const deleteFlag = await Todo.destroy({where: {id: request.params.id}});
  response.send(deleteFlag ? true : false);
});

module.exports = app;
