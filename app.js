var express          = require("express"),
    app              = express(),
    bodyParser       = require("body-parser"),
    mongoose         = require("mongoose"),
    flash            = require("connect-flash"),
    passport         = require("passport"),
    localpass        = require("passport-local"),
    Movie            = require("./models/movie.js"),
    User             = require("./models/user.js"),
    express_session  = require("express-session"),
    request          = require("request"),
    methodoverride   = require("method-override"),
    Comment          = require("./models/comment.js")

mongoose.Promise = global.Promise;
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
// mongoose.connect("mongodb://localhost/mfinder");
mongoose.connect("mongodb://nitish:nitish@ds149874.mlab.com:49874/heroku_jpqcb6bk");
app.use(express.static("public"));
app.use(methodoverride("_method"));


app.use(express_session({
    secret:"This is mini flick project",
    resave:false,
    saveUninitialized:false
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localpass(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res,next){
    res.locals.currentuser=req.user;
    res.locals.error= req.flash("error");
    res.locals.success= req.flash("success");
    next();
});

app.get("/",function(req,res){
    res.render("landing.ejs");
})

app.get("/search",function(req,res){
    res.render("search.ejs");
})


function movieCall(id){
  console.log(id);
  var url="http://www.omdbapi.com/?i="+id+"&plot=full&apikey=thewdb"
  request(url, function(error, response, body){
    if(!error && response.statusCode==200){
        var movie=JSON.parse(body);
        return "movie";
    }
 });
}

app.get("/results", isLoggedIn, function(req, res){
    var keyword=req.query.search;
    var url="http://www.omdbapi.com/?s="+keyword+"&apikey=thewdb"
    request(url, function(error, response, body){
      if(!error && response.statusCode==200){
          var data=JSON.parse(body)
          res.render('results',{ data:data , keyword:keyword })
      }
   });
});

app.get("/addreview/:id", isLoggedIn, function(req,res){
    var movie_id=req.params.id;
    var url="http://www.omdbapi.com/?i="+movie_id+"&apikey=thewdb"
    request(url, function(error, response, body){
      if(!error && response.statusCode==200){
          var data=JSON.parse(body)
          res.render('addreview.ejs',{ movie:data })
      }
   });
})

app.post("/addreview/:id", isLoggedIn,function(req,res){
    var review=req.body.review;
    var movie_id=req.params.id;
    var author={
        id:req.user._id,
        username:req.user.username
    }
    var url="http://www.omdbapi.com/?i="+movie_id+"&apikey=thewdb"
    request(url, function(error, response, body){
      if(!error && response.statusCode==200){
          var data=JSON.parse(body);
          var imdbID=data.imdbID;
          var Title=data.Title;
          var Poster=data.Poster;
          var data={Title,imdbID, Poster};
          // console.log(data);
          var new_review={ mid:movie_id, review:review, data:data, author:author};
          Movie.create(new_review,function(err,new_movie){
              if(err){
                  // console.log(err);
              }
              else{
                  // console.log(new_movie);
                  req.flash("success","Review added successfully !");
                  res.redirect("/home");
              }
          })
      }
  });
})

app.get("/movie/:id", isLoggedIn, function(req, res){
    var url="http://www.omdbapi.com/?i="+req.params.id+"&plot=full&apikey=thewdb"
    request(url, function(error, response, body){
      if(!error && response.statusCode==200){
          var movie=JSON.parse(body)
          res.render('movie.ejs',{ movie:movie })
          // console.log(movie);
      }
   });
});


//================
// User Search
//================

app.get("/uSearch", isLoggedIn,function(req,res){
    var username=req.query.user_key;
    User.find({username:new RegExp(username)},function(err,users){
        res.render("usearch.ejs",{users:users, key:username})
    })
})
app.get("/reviewSearch", isLoggedIn,function(req,res){
    var reviewname=req.query.review_key.charAt(0).toUpperCase()+req.query.review_key.slice(1);
    Movie.find({'data.Title':new RegExp(reviewname)},function(err,reviews){
        // console.log(reviews);
        res.render("reviews.ejs",{reviews:reviews, reviewname:req.query.review_key})
    })
})


app.get("/user/:id", isLoggedIn,function(req,res){
    User.findById(req.params.id,function(err,user){
        Movie.find({'author.username':user.username},function(err,movies){
            // console.log(user.fname);
            // console.log(user.Gender);
            // console.log(user);
            // console.log(movies);
            res.render("uprofile.ejs",{user:user, movies:movies})
        })
    })
})


app.post("/follow/:follower/:master", isLoggedIn,function(req,res){

    User.findById(req.params.follower,function(err,user){
        user.followed.push(req.params.master);
        user.save();
        req.flash("success","Following this user now !");
        res.redirect("/user/"+req.params.master)
    })
    User.findById(req.params.master,function(err,user){
        user.followers.push(req.params.follower);
        user.save();
    })
})

app.post("/unfollow/:follower/:master",isLoggedIn,function(req,res){

    User.update({ _id: req.params.follower }, { "$pull": { "followed": req.params.master }}, { safe: true, multi:true },function(err, obj){
        req.flash("success","Unfollowed the user successfully !");
        res.redirect("/user/"+req.params.master)
    });
    User.update({ _id: req.params.master }, { "$pull": { "followers": req.params.follower }}, { safe: true, multi:true },function(err, obj){
    });
})



//================
//Profile Routes
//================

//EDIT Profile

app.get("/user/:id/edit",profileOwner,function(req,res){
    User.findById(req.params.id,function(err,user){
        res.render("editprofile.ejs",{ user:user })
    })
});

//UPDATE Profile

app.put("/user/:id/edit",profileOwner,function(req,res){
    User.findByIdAndUpdate(req.params.id, req.body.user,function(err,updatedcomment){
        if(err){
            req.flash("error",err.message)
            res.redirect("/home");
        }
        else{
            req.flash("success","Profile updated successfully !");
            res.redirect("/home");
        }
    })
})



//===================
//Watchlist Routes
//===================

app.post("/addwatchlist/:id/:movie_id/add",isLoggedIn,function(req,res){
    User.findOne({_id:req.params.id},{"watchlist": {"$elemMatch": {"imdb_id":req.body.newmovie.imdb_id}}},function(err,movie){
        if(movie.watchlist.length == 0)
        {
            User.findById(req.params.id,function(err,user){
                user.watchlist.push(req.body.newmovie);
                user.save();
                req.flash("success","Movie added to watchlist successfully !");
                res.redirect("/watchlist/"+req.params.id);
            })
        }
        else
        {
            // console.log("This movie is already in you watchlist");
            req.flash("error","This movie is already in your watchlist !");
            res.redirect("/watchlist/"+req.params.id);
        }
    })
});

app.get("/watchlist/:id",isLoggedIn,function(req,res){
    User.findById(req.params.id,function(err,user){
        res.render("watchlist.ejs",{user:user})
    })
})

app.post("/watchlist/:id/remove",isLoggedIn,function(req,res){
    var delmovie=req.body.newmovie.name;
    User.update({ _id: req.params.id }, { "$pull": { "watchlist": { "name": req.body.newmovie.name } }}, { safe: true, multi:true },function(err, obj){
    req.flash("success","Movie removed from watchlist successfully !");
    res.redirect("/home");
});
});

//===============
//COMMENT ROUTES
//===============


//NEW COMMENT

app.get("/review/:id/comments/new", isLoggedIn  ,function(req,res){
    Movie.findById(req.params.id,function(err,movie){
        if(err){
            req.flash("error",err.message);
        }
        else{
            res.render("newcomment.ejs",{movie:movie});
        }
    })
})

app.post("/review/:id/comments",isLoggedIn,function(req,res){
    Movie.findById(req.params.id,function(err,movie){
        if(err){
            // console.log(err);
            res.redirect("/home");
        }
        else{
          if(req.body.comment.text.length === 0){
            req.flash("error", "Can't post empty comments !");
            res.redirect("/review/"+ movie.id);
          }
          else{
            Comment.create(req.body.comment,function(err,comment){
                comment.date=Date();
                comment.author.id=req.user._id;
                comment.author.username=req.user.username;
                comment.save();
                movie.comments.push(comment);
                movie.save();
                res.redirect("/review/"+ movie.id);
            });
          }
        }
    });
});

//EDIT COMMENT

app.get("/review/:id/comments/:comment_id/edit",isLoggedIn,function(req,res){
    Comment.findById(req.params.comment_id,function(err,comment){
        res.render("editcomment.ejs",{ movie_id:req.params.id, comment:comment})
    })
});

//UPDATE COMMENT

app.put("/review/:id/comments/:comment_id/edit",isLoggedIn,function(req,res){
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment,function(err,updatedcomment){
        if(err){
            res.redirect("/review/"+req.params.id);
        }
        else{
            res.redirect("/review/"+req.params.id);
        }
    })
})

//DELETE COMMENT

app.delete("/review/:id/comments/:comment_id",isLoggedIn,function(req,res){
    Comment.findByIdAndRemove(req.params.comment_id,function(err,commdel){
        if(err){
            res.redirect("/review/"+req.params.id);
        }
        else{

            res.redirect("/review/"+req.params.id);
        }
    })
})


//=============
//REVIEW ROUTES
//=============


//SHOW

app.get("/review/:id",isLoggedIn,function(req,res){

    Movie.findById(req.params.id).populate("comments").exec(function(err,movie){
        if(err){
            // console.log(err);
        }
        else{
          var url="http://www.omdbapi.com/?i="+movie.data.imdbID+"&plot=short&apikey=thewdb"
          request(url, function(error, response, body){
           if(!error && response.statusCode==200){
               var moviedata=JSON.parse(body);
               res.render("review.ejs",{ movie:movie , apidata:moviedata});
           }
          });
        }
    })

})

//EDIT
//review/5a06963578ea743787c44d4f/edit
app.get("/review/:id/edit", reviewOwner,function(req,res){
    Movie.findById(req.params.id,function(err,movie){
          res.render("edit.ejs", {movie: movie});
        });
});

//UPDATE

app.put("/review/:id",reviewOwner,function(req,res){
    Movie.findByIdAndUpdate(req.params.id, req.body.movie,function(err,updatedmovie){
        if(err){
            req.flash("error",err.message);
            res.redirect("/home");
        }
        else{
            req.flash("success","Review updated successfully !")
            res.redirect("/review/"+req.params.id);
        }
    })
})

//DELETE

app.delete("/review/:id",reviewOwner,function(req,res){
    Movie.findByIdAndRemove(req.params.id,function(err,moviedeleted){
        if(err){
            req.flash("error",err.message);
            res.redirect("/home");
        }
        else{
            req.flash("error","Review deleted successfully !")
            res.redirect("/home");
        }
    })
})

//===================
//Register and Save
//===================

app.get("/register",function(req,res){
    res.render("register.ejs");
})


app.post("/register",function(req,res){
    var newuser= new User({username:req.body.username, interest:req.body.interests ,fname:req.body.fname, lname:req.body.lname,factor:req.body.factor,fmovie:req.body.fmovie });
    User.register(newuser,req.body.password,function(err,user){
        if(err){
            req.flash("error", err.messages)
            return res.render("register");
        }
        passport.authenticate("local")(req,res,function(){
            req.flash("success", "Welcome to Mini-Flick !")
            res.redirect("/home");
        });
    });
});

//===========
//Followers and Following
//===========

app.get("/follow/:action/:userid",isLoggedIn,function(req,res){
  if(req.params.action==="1"){
    User.findById(req.params.userid,function(err,user){
      User.find({'_id':{'$in':user.followers}},function(err,userdata){
        res.render("followUsers.ejs",{userdata:userdata, action:req.params.action })
      })
    })
  }
  else if (req.params.action==="2"){
    User.findById(req.params.userid,function(err,user){
      User.find({'_id':{'$in':user.followed}},function(err,userdata){
        res.render("followUsers.ejs",{userdata:userdata, action:req.params.action})
      })
    })
  }
})

//===================
//Movie Recommendation
//====================

app.get("/recommend/:userid/:movieId",isLoggedIn,function(req,res){
  User.findById(req.params.userid,function(err,user){
    User.find({'_id':{'$in':user.followed}},function(err,userdata){
      res.render("followUsers.ejs",{userdata:userdata, action:3, movieId:req.params.movieId})
    })
  })
})

app.get("/recommend/:master/:username/:slave/:movieId", isLoggedIn,function(req,res){
  var movie_id=req.params.movieId;
  console.log(req.params.username);
  var url="http://www.omdbapi.com/?i="+movie_id+"&apikey=thewdb"
  request(url, function(error, response, body){
    if(!error && response.statusCode==200){
        var data=JSON.parse(body)
        var imdb_id=data.imdbID
        var name=data.Title
        var image=data.Poster
        var year=data.Year
        var movieDetails=data
        var recommender={
          id:req.params.master,
          username:req.params.username
        }
        var recommendation={recommender, imdb_id, name, image, year}
        User.findById(req.params.slave, function(err,user){
          user.recommendations.push(recommendation);
          user.save();
          res.redirect('/user/'+req.params.slave);
        })
    }
 });
})

app.get("/recommendations/:userid", isLoggedIn, function(req,res){
    User.findById(req.params.userid,function(err,user){
      res.render("recommendations.ejs",{user:user})
    })
})


app.post("/recommendations/:id/remove",isLoggedIn,function(req,res){
    User.update({ _id: req.params.id }, { "$pull": { "recommendations": { "name": req.body.newmovie.name } }}, { safe: true, multi:true },function(err, obj){
    res.redirect("/recommendations/"+req.params.id);
});
});


//=============
// Login form
//=============

app.get("/login", function(req,res){
    res.render("login.ejs");
})

app.get("/home",isLoggedIn,function(req,res){
    User.findById(req.user._id,function(err,user){
            Movie.find({'author.id':req.user._id},function(err,mymovies){
                Movie.find({'author.id':{'$in':user.followed}},function(err,all_movies){
                res.render("home.ejs", {all_movies:all_movies, my_movies:mymovies, userinfo:user});
                })
            })
    })
})

app.post("/login",passport.authenticate("local",
    {
        successRedirect:"/home",
        failureRedirect:"/login",
        successFlash: "Welcome to Mini-Flick !"
    }), function(req,res){
        req.flash("success","Successfully logged in !")
        res.redirect("/home");
});

app.get("/logout",function(req,res){
    req.logout();
    req.flash("success","Successfully logged you out !")
    res.redirect("/login");
});

//MIDDLEWARE

function isLoggedIn(req,res,next){
  if(req.isAuthenticated()){
    return next();
  }
  req.flash("error","Please login first!");
  res.redirect("/login");
}

function reviewOwner(req,res,next){
  if (req.isAuthenticated()){
    Movie.findById(req.params.id,function(err,movie){
        if(movie.author.id.equals(req.user._id)){
          next();
        } else {
          req.flash("error","You don't have the permission to do that !")
          res.redirect("/home");
        }
    });
  }else {
      req.flash("error","Check your credentials!");
      res.redirect("/login");
    }
}

function profileOwner(req,res,next){
  if (req.isAuthenticated()){
    User.findById(req.params.id,function(err,user){
        if(user._id.equals(req.user._id)){
          next();
        } else {
          req.flash("error","You don't have the permission to do that !")
          res.redirect("/home");
        }
    });
  }else {
      req.flash("error","Check your credentials!");
      res.redirect("/login");
    }
}


app.listen(process.env.PORT, process.env.IP, function(){
    console.log(" The app has started !!")
});
