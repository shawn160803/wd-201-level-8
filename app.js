/* eslint-disable no-unused-vars */
const express = require("express");
var csrf = require("tiny-csrf");
const app = express();
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const path = require("path");
app.set("views", path.join(__dirname, "views"));

const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const flash = require("connect-flash");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
//error 
const saltRounds = 10;
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

app.set("view engine", "ejs");
app.use(flash());

app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "my-super-secret-key-21728173615375893",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Wrong password" });
          }
        })
        .catch(() => {
          return done(null,false,{
            message: "No Account Visible For This Mail",
          })
        });
    }
  )
);

  app.use(function(request, response, next) {
    response.locals.messages = request.flash();
    next();
});


passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});


passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

const { Todo, User } = require("./models");


app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (request, response) {
    console.log(request.user);
    response.redirect("/todos");
  }
);

app.get("/", async (request, response) => {
  
  response.render("index", {
    title: "Todo app",
    csrfToken: request.csrfToken(),
  });
});

app.get(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    console.log(request.user);
    const loggedInUser = request.user.id;
    const allTodos = await Todo.getTodos(loggedInUser);
    const overdue = await Todo.overdue(loggedInUser);
    const dueToday = await Todo.dueToday(loggedInUser);
    const dueLater = await Todo.dueLater(loggedInUser);
    const completedItems = await Todo.completedItems(loggedInUser);
    const user = await User.findByPk(loggedInUser);
    const userName = user.dataValues.firstName;
    if (request.accepts("html")) {
      response.render("todo", {
        title: "Todo app",
        overdue,
        dueToday,
        dueLater,
        completedItems,
        userName,
        csrfToken: request.csrfToken(),
      });
    } else {
      response.json({
        overdue,
        dueToday,
        dueLater,
        completedItems,
        userName
      });
    }
  }
);

app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Signup",
    csrfToken: request.csrfToken(),
  });
});


app.post("/users", async (request, response) => {
  if (request.body.email.length == 0) {
    request.flash("error", "Email couldn't be left empty! Try to enter mail address.");
    return response.redirect("/signup");
  }

  if (request.body.firstName.length == 0) {
    request.flash("error", "First name couldn't be left empty! Try to enter your name");
    return response.redirect("/signup");
  }
  if (request.body.password.length < 8) {
    request.flash("error", " Your Password length should be Minimum of 8 characters not less than that");
    return response.redirect("/signup");
  }
  console.log("Firstname", request.body.firstName);
  const hashedPad = await bcrypt.hash(request.body.password, saltRounds);
  console.log(hashedPad);
  //creating user
  try {
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPad,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
      }
      response.redirect("/todos");
    });
  } catch (error) {
    request.flash(
      "error","The mail you write already exists, try to use another mail"
    )
    return response.redirect("/signup")
  }
});

app.get("/login", (request, response) => {
  response.render("login", { title: "Login", csrfToken: request.csrfToken() });
});

app.post(
  "/session",
  passport.authenticate("local", { failureRedirect: "/login" }),
  (request, response) => {
    console.log(request.user);
    response.redirect("/todos");
  }
);


app.get("/signout", (request, response) => {
  request.logout((err) => {
    // eslint-disable-next-line no-undef
    if (err) {
      // eslint-disable-next-line no-undef
      return next(err);
    }
    response.redirect("/");
  });
});



app.get("/todos/:id",async function (request, response) {
  try {
    const todo = await Todo.findByPk(request.params.id);
    return response.json(todo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});


app.post(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.body.title.length == 0) {
      request.flash("error", "Title won't be left empty!");
      return response.redirect("/todos");
    }
    if (request.body.dueDate.length == 0) {
      request.flash("error", "Due date won't be left empty!");
      return response.redirect("/todos");
    }
    
    
    console.log("creating a todo", request.body);
    console.log(request.user);
    try {
      const todo = await Todo.addTodo({
        title: request.body.title,
        dueDate: request.body.dueDate,
        completed: false,
        userId: request.user.id,
      });
      return response.redirect("/todos");
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);



app.put(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    console.log("need to update todo with ID:", request.params.id);
    const todo = await Todo.findByPk(request.params.id);
    try {
      const updatedTodo = await todo.setCompletionStatus(
        request.body.completed
      );
      return response.json(updatedTodo);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);


app.delete(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    console.log("delete todo by id:", request.params.id);
    try {
      await Todo.remove(request.params.id, request.user.id);
      return response.json({ success: true });
    } catch (error) {
      return response.status(422).json(error);
    }
  }
);
module.exports = app;
