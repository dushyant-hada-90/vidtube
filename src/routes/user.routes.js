import { Router } from "express";

import {registerUser ,
        logoutUser,
        loginUser,
        updateAccountDetails,
        changeCurrentPassword,
        updateUserAvatar,
        updateUserCoverImage,
        refreshAccessToken,
        getUserChannelProfile,
        getwatchHistory} from "../controllers/user.controllers.js";

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

// unsecure routes
router.route("/login").post(loginUser)
router.route("/refreshAccessToken").post(refreshAccessToken)

// secure routes
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/updateAccountDetails").patch(verifyJWT,updateAccountDetails)
router.route("/changeCurrentPassword").post(verifyJWT,changeCurrentPassword)
router.route("/updateUserAvatar").post(verifyJWT,upload.single("avatar"), updateUserAvatar) 
router.route("/updateUserCoverImage").post(verifyJWT,upload.single("coverImage"),updateUserCoverImage)

//tokens


//query routes
router.route("/getUserChannelProfile/:username").post(verifyJWT,getUserChannelProfile)

router.route("/getwatchHistory").get(verifyJWT,getwatchHistory)
export default router