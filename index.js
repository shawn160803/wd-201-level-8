const app = require('./app');
app.listen(process.env.PORT || 3003, ()=>{
  console.log('Server has been started');
});
