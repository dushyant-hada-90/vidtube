import mongoose, {Schema, Types} from "mongoose"

const likeSchema = new Schema(
    {
        video:{
            type:Schema.Types.ObjectId,
            ref:"Video",
        },
        comment:{
            typr:Schema.Types.ObjectId,
            ref:"Comment"
        },
        tweet:{
            type:Schema.Types.ObjectId,
            ref:"Comment"
        },
        likedBy:{
            type:Schema.Types.ObjectId,
            ref:"User"
        },
    },
    {timestamps:true}
)

export const Like = mongoose.model("Like",likeSchema)