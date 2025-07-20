import { Router } from "express";

import {registerUser ,
        logoutUser,
        loginUser,
        updateAccountDetails,
        changeCurrentPassword,
        updateUserAvatar,
        updateUserCoverImage,} from "../controllers/user.controllers.js";

import {upload} from "../middlewares/multer.middlewares.js"

import { verifyJWT } from "../middlewares/auth.middlewares.js";
const router=Router()

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser)

// secure routes
router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT,logoutUser)

// updation routes
router.route("/updateAccountDetails").post(verifyJWT,updateAccountDetails)
router.route("/changeCurrentPassword").post(verifyJWT,changeCurrentPassword)
router.route("/updateUserAvatar").post(verifyJWT,upload.single("avatar"), updateUserAvatar) 
router.route("/updateUserCoverImage").post(verifyJWT,upload.single("coverImage"),updateUserCoverImage)

export default router