import { Router } from "express";

import { registerUser ,logoutUser,loginUser} from "../controllers/user.controllers.js";

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
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/login").post(loginUser)
export default router