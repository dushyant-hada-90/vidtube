import dotenv from "dotenv"
import {app} from "./app.js"
import connectDB from "./db/index.js"

dotenv.config({
    path:"./.env"
})


const PORT=process.env.PORT

connectDB()
.then(()=>{
    app.listen(PORT,()=>{
    console.log(`server is running on port ${PORT}`)
    console.log("--------------------------------------------------------------------------------------------");
    ;
})
})

.catch((err)=>{
    console.log("mongodb connection error",err);
    
})