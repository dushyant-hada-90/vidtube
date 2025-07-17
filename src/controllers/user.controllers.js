import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary,deleteFromCloudinary } from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const generateAccessAndRefreshToken = async (userId)=>{
    try {
        const user=await User.findById(userId)
        if(!user){throw new ApiError(500,"user not found");
        }
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"couldn't generate access abd refresh tokens");
        
    }
}

const registerUser = asyncHandler(async(req,res)=>{
    const {fullname,email,username,password}=req.body
    // validation
    if([fullname,email,username,password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400,"all fields are required")
    }


    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or username already exist")
    }


    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverLocalPath = req.files?.coverImage?.[0]?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is missing")
    }



    let avatar
    try {
        avatar = await uploadOnCloudinary(avatarLocalPath)
        console.log("uploaded avatar",avatar);
        
    } catch (error) {
        console.log("error uploading avatar",error)
        throw new ApiError(500,"failed to upload avatar");
    }
    let coverImage
    try {
        coverImage = await uploadOnCloudinary(coverLocalPath)
        console.log("uploaded cover image",avatar);
        
    } catch (error) {
        console.log("error uploading cover image",error)
        throw new ApiError(500,"failed to upload cover");
    }
    try {
        // console.log(fullname,
        //     avatar.url,
        //     coverImage?.url||"",
        //     email,
        //     password,
        //     username);
        
        const user = await User.create({
            fullname,
            avatar:avatar.url,
            coverImage:coverImage?.url||"",
            email,
            password,
            username:username.toLowerCase()
        })
        // console.log("defined user");
        
        const createdUser = await User.findById(user._id).select("-password -refreshToken")
        // console.log("defined created user");
    
        if(!createdUser){
            throw new ApiError(500,"something went wrong while registering the user");
        }
    
        return res
        .status(201)
        .json(new ApiResponse(200,createdUser,"User registered successfully"))
    } catch (error) {
        console.log("user creation failed");
        if(avatar){await deleteFromCloudinary(avatar.public_id)}
        if(coverImage){await deleteFromCloudinary(coverImage.public_id)}
        if(!createdUser){
            throw new ApiError(500,"something went wrong while registering the user and images were deleted from cloudinary");
        
    }
}
})

const loginUser = asyncHandler(async(req,res)=>{
    // get data from body
    const {email,username,password} = req.body
    // validation of required fields
    if(!email){
        throw new ApiError(400,"email is required");        
    }
    if(!username){
        throw new ApiError(400,"username is required");        
    }
    if(!password){
        throw new ApiError(400,"password is required");        
    }
    // look for user in db
    const user = await User.findOne({
        $or: [{username},{email}]
    })
    if(!user){
        throw new ApiError(404,"user not found");
    }
    // validate password
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401,"login credentials are invalid");
    } 
    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    if(!loggedInUser){throw new Error(500,"could not login user");
    }

    const options = {
        httpOnly:true,
        secure:process.env.NODE_ENV==="production"
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(200,{user:loggedInUser,accessToken,refreshToken},"user loggen in successfully"))
})
export{registerUser,loginUser}