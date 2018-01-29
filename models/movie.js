var mongoose=require("mongoose");


var movieschema=new mongoose.Schema({
    mid:String,
    review:String,
    data:{},
    author:{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        username:String
    },
    comments:[
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: "comment"
    }
    ]
})

module.exports=mongoose.model("movie",movieschema);