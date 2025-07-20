import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"
import dotenv from "dotenv"
import { ApiError } from './ApiError.js';

dotenv.config()
// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:  process.env.CLOUDINARY_API_KEY,
    api_secret:  process.env.CLOUDINARY_API_SECRET
});



const uploadOnCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath,{resource_type:"auto"})
        console.log("file uploaded on cloudinary. file src: "+response.url);
        //after uploading file to cloudinary we will delete from our server
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        console.log(error);
        
        fs.unlinkSync(localFilePath)
        
    }
}

const deleteFromCloudinary = async(publicId)=>{
    try {
        const result = await cloudinary.uploader.destroy(publicId)
        console.log("deleted from cloudinary. publicId: ",publicId);
        return result  // will return {result:"ok"} or { result: 'not found' }
    } catch (error) {
        console.log("error deleting from cloudinary",error);
        
    }
}


const extractPublicIdFromUrl = async(url)=>{
    try {
        const parts = url.split("/upload/")[1]
        const pathWothoutVersion = parts.split("/").slice(1).join("/")
        const publicId = pathWothoutVersion.replace(/\.[^/.]+$/,"")
        return publicId

    } catch (error) {
        console.warn("could not extract public id from old cloudinary url",error)
    }
}
export {uploadOnCloudinary,          
        deleteFromCloudinary,
        extractPublicIdFromUrl
}