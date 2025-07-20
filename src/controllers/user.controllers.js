import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary,deleteFromCloudinary,extractPublicIdFromUrl } from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import  jwt  from "jsonwebtoken";

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

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"refresh token is required");
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)
        if(!user){throw new ApiError(401,"invalid refresh token");
        }
        if(incomingRefreshToken!==user?.refreshToken){throw new ApiError(401,"invalid refresh token");
        }

        const options = {
        httpOnly:true,
        secure:process.env.NODE_ENV==="production"
        }

        const {accessToken,refreshToken:newRefreshToken} = await generateAccessAndRefreshToken(user._id)
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("newRefreshToken",newRefreshToken,options)
        .json(new ApiResponse(200,{accessToken,newRefreshToken},"access token refreshed successfully"))
    } catch (error) {
         throw new ApiError("something went wrog while refreshing token");
         
    }
})

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
    .json(new ApiResponse(200,{user:loggedInUser,accessToken,refreshToken},"user logged in successfully"))
})

const logoutUser = asyncHandler(async(req,res)=>{
    // console.log("User ID:", req.user?._id);

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{refreshToken:null}
        },
        {new:true}
    )

    const options = {
        httpOnly:true,
        secure:process.env.NODE_ENV==="production"
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,"User logged out successfully"))
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordValid){
        throw new ApiError("old password is incorrect");
    }
    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200).json(new ApiResponse(200,"password changed successfully"))
})


const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200,json(new ApiResponse(200,req.user,"current user details")))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullname,email} = req.body

    if(!fullname && !email){
        throw new ApiError("at least provide one of email,fullname that you wish to update");
    }
    const updateData = {}
    if(fullname) updateData.fullname=fullname
    if(email) updateData.email=email
    
    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,{$set:updateData},{new:true}).select("-password -refreshToken")
    
    return res.status(200).json(new ApiResponse(200,updatedUser,"updated user account details"))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    let user
    let avatar
     
    const oldUser = await User.findById(req.user?._id).select("avatar")
    // console.log(oldUser);
    
    const oldPublicId = await extractPublicIdFromUrl(oldUser?.avatar)
    
    // upload new avatar on cloudinary
    const avatarLocalPath = req.file?.path 
    avatar = await uploadOnCloudinary(avatarLocalPath)
    if(avatar===null){throw new ApiError(400,"file is required");
    }
    if(!avatar.url){throw new ApiError(500,"something went wrong while uploading avatar");
    }
    //update new cloudinary url in mongo db
    try {
        user = await User.findByIdAndUpdate(req.user?._id,{$set:{avatar:avatar.url}},{new:true}).select("-password -refreshToken")
    } catch (error) {
        if(avatar?.public_id){await deleteFromCloudinary(avatar.public_id)}
        throw new ApiError(500,"could not update avatar");
    }

    let oldAvatarDeletion = await deleteFromCloudinary(oldPublicId)  //do at the end  only if new avatar is uploaded successfully
    console.log(oldAvatarDeletion.result);

    res.status(200).json(new ApiResponse(200,user,oldAvatarDeletion.result!=="ok"
      ? "Avatar updated, but failed to delete old avatar"
      : "Avatar updated successfully"))

})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    let user
    let coverImage
     
    const oldUser = await User.findById(req.user?._id).select("coverImage")
    // console.log(oldUser);
    
    const oldPublicId = await extractPublicIdFromUrl(oldUser?.coverImage)
    
    // upload new coverImage on cloudinary
    const coverLocalPath = req.file?.path 
    coverImage = await uploadOnCloudinary(coverLocalPath)
    if(coverImage===null){throw new ApiError(400,"file is required");
    }
    if(!coverImage.url){throw new ApiError(500,"something went wrong while uploading coverImage");
    }
    //update new cloudinary url in mongo db
    try {
        user = await User.findByIdAndUpdate(req.user?._id,{$set:{coverImage:coverImage.url}},{new:true}).select("-password -refreshToken")
    } catch (error) {
        if(coverImage?.public_id){await deleteFromCloudinary(coverImage.public_id)}
        throw new ApiError(500,"could not update .coverImage.r");
    }
2
    let oldCoverImageDeletion = await deleteFromCloudinary(oldPublicId)  //do at the end  only if new avatar is uploaded successfully
    // console.log(oldCoverImageDeletion.result);

    res.status(200).json(new ApiResponse(200,user,oldCoverImageDeletion.result!=="ok"
      ? "coverImage updated, but failed to delete old coverImage"
      : "coverImage updated successfully"))
})




export{registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    updateAccountDetails,
    changeCurrentPassword,
    getCurrentUser,
    updateUserAvatar,
    updateUserCoverImage,
}