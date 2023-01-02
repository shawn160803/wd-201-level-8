const app = require("./app");

app.listen(process.env.PORT || 3030, () => {
  console.log("Started express server at port 3000");
});
