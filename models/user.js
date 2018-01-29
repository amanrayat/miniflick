var mongoose=require("mongoose");
var localpassmongoose=require("passport-local-mongoose")

var userSchema=new mongoose.Schema({
    fname:String,
    lname:String,
    fmovie:String,
    factor:String,
    interest:String,
    username:String,
    password:String,
    watchlist: Array,
    followed:Array,
    Gender: String,
    age: Number,
    country:String,
    followers:Array,
    recommendations:Array
})


userSchema.plugin(localpassmongoose);

module.exports=mongoose.model("user",userSchema);
